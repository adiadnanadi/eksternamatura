'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Target, Brain, Timer, ArrowLeft, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, SUBJECT_THEME } from '@/lib/client'
import type { HistoryItem } from '@/lib/types'

const ICONS = { Sigma, BookOpen, Globe } as const
import { Sigma, BookOpen, Globe } from 'lucide-react'

export function StatsView({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState<HistoryItem[] | null>(null)
  const [bySubject, setBySubject] = useState<Record<string, { correct: number; total: number }>>({})

  useEffect(() => {
    api
      .history()
      .then(h => {
        setHistory(h.history)
        setBySubject(h.bySubject)
      })
      .catch(() => setHistory([]))
  }, [])

  if (history === null) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  const tests = history.filter(h => h.mode === 'TEST')

  // kartice: kombinacije škola+predmet koji korisnik stvarno radi (ili svi postojeći)
  const cardKeys: string[] = []
  for (const s of Object.keys(SUBJECT_THEME)) {
    for (const school of ['OSNOVNA', 'SREDNJA']) {
      if (bySubject[`${school}:${s}`]) cardKeys.push(`${school}:${s}`)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 rounded-xl">
        <ArrowLeft className="h-4 w-4" />
        Nazad
      </Button>

      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
        <BarChart3 className="h-7 w-7 text-primary" />
        Statistika
      </h1>

      {/* prosjeci po predmetu */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cardKeys.map((key, i) => {
          const [school, s] = key.split(':')
          const t = SUBJECT_THEME[s]
          const Icon = ICONS[t.icon]
          const st = bySubject[key]
          const pct = st && st.total ? Math.round((st.correct / st.total) * 100) : null
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-3xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold">{t.label}</h3>
                  <p className="text-xs text-muted-foreground">{school === 'SREDNJA' ? 'Srednja' : 'Osnovna'} škola</p>
                </div>
              </div>
              {pct === null ? (
                <p className="mt-3 text-sm text-muted-foreground">Još nema testova iz ovog predmeta.</p>
              ) : (
                <>
                  <p className={`mt-3 text-3xl font-extrabold ${t.text}`}>{pct}%</p>
                  <p className="text-xs text-muted-foreground">
                    ukupno tačnih odgovora u modu testiranja ({st.correct}/{st.total})
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${t.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* svi testovi */}
      <h2 className="mt-10 flex items-center gap-2 text-lg font-bold">
        <Timer className="h-5 w-5 text-primary" />
        Završeni testovi ({tests.length})
      </h2>
      {tests.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Još nema završenih testova. Riješi prvi test da vidiš napredak.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Predmet</th>
                <th className="px-4 py-2.5 font-semibold">Rezultat</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Datum</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(h => (
                <tr key={h.id} className="border-t bg-card">
                  <td className="px-4 py-3 font-medium">
                    {SUBJECT_THEME[h.subject]?.label ?? h.subject}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({h.school === 'SREDNJA' ? 'srednja' : 'osnovna'})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        h.percent >= 60
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {h.percent}% ({h.correct}/{h.answeredCount})
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {new Date(h.createdAt).toLocaleDateString('bs-BA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 flex items-center gap-2 text-lg font-bold">
        <Brain className="h-5 w-5 text-primary" />
        Učeničke sesije
      </h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {history.slice(0, 12).map(h => (
          <li key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {SUBJECT_THEME[h.subject]?.label ?? h.subject} · {h.school === 'SREDNJA' ? 'srednja' : 'osnovna'} ·{' '}
                {h.mode === 'TEST' ? 'Testiranje' : 'Učenje'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(h.createdAt).toLocaleDateString('bs-BA', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">{h.percent}%</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
