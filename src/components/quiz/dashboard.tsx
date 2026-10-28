'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sigma,
  BookOpen,
  Globe,
  Brain,
  Timer,
  ChevronRight,
  History,
  Loader2,
  Target,
  Trophy,
  BookMarked,
  GraduationCap,
  School,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { api, SUBJECT_THEME, LEVEL_LABEL, SCHOOL_LABEL } from '@/lib/client'
import type { QuizMeta, HistoryItem, UserInfo, SchoolLevel } from '@/lib/types'
import { toast } from 'sonner'

const ICONS = { Sigma, BookOpen, Globe } as const

export function Dashboard({
  user,
  onStart,
}: {
  user: UserInfo
  onStart: (params: { subject: string; school: string; mode: 'UCENJE' | 'TEST'; count?: number; topic?: string | null }) => void
}) {
  const [meta, setMeta] = useState<QuizMeta | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [bySubject, setBySubject] = useState<Record<string, { correct: number; total: number }>>({})

  const [school, setSchool] = useState<SchoolLevel>('SREDNJA')
  const [open, setOpen] = useState(false)
  const [selSubject, setSelSubject] = useState<string | null>(null)
  const [mode, setMode] = useState<'UCENJE' | 'TEST'>('UCENJE')
  const [topic, setTopic] = useState<string>('all')
  const [count, setCount] = useState<string>('10')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api.meta().then(setMeta).catch(() => toast.error('Greška pri učitavanju podataka.'))
    api
      .history()
      .then(h => {
        setHistory(h.history)
        setBySubject(h.bySubject)
      })
      .catch(() => {
        /* ignorisi */
      })
  }, [])

  const subjects = Object.keys(SUBJECT_THEME).filter(s => meta?.schools?.[school]?.[s])
  const schoolMeta = meta?.schools?.[school] ?? {}

  function openSetup(subject: string) {
    setSelSubject(subject)
    setMode('UCENJE')
    setTopic('all')
    setCount('10')
    setOpen(true)
  }

  async function start() {
    if (!selSubject) return
    setStarting(true)
    try {
      onStart({
        subject: selSubject,
        school,
        mode,
        count: mode === 'UCENJE' ? parseInt(count) : undefined,
        topic: mode === 'UCENJE' && topic !== 'all' ? topic : null,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri pokretanju kviza.')
      setStarting(false)
    }
  }

  const testTotal = selSubject ? schoolMeta[selSubject]?.testTotal ?? 10 : 10

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      {/* pozdrav */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Zdravo, {user.name.split(' ')[0]}! <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Odaberi školski nivo, predmet i mod rada.
        </p>
      </motion.div>

      {/* izbor školskog nivoa */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1.5 shadow-sm sm:mx-auto sm:max-w-md"
        role="tablist"
        aria-label="Školski nivo"
      >
        {(
          [
            { id: 'SREDNJA', icon: GraduationCap, title: 'Srednja škola', desc: 'matura' },
            { id: 'OSNOVNA', icon: School, title: 'Osnovna škola', desc: 'završni rad' },
          ] as const
        ).map(s => (
          <button
            key={s.id}
            role="tab"
            aria-selected={school === s.id}
            onClick={() => setSchool(s.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              school === s.id
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <s.icon className="h-4.5 w-4.5" />
            <span className="leading-tight">
              {s.title}
              <span className={`ml-1.5 text-[10px] font-semibold uppercase ${school === s.id ? 'text-white/75' : 'text-muted-foreground/60'}`}>
                {s.desc}
              </span>
            </span>
          </button>
        ))}
      </motion.div>

      {/* predmeti */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {subjects.map((s, i) => {
          const t = SUBJECT_THEME[s]
          const Icon = ICONS[t.icon]
          const m = schoolMeta[s]
          const stats = bySubject[`${school}:${s}`]
          return (
            <motion.button
              key={`${school}-${s}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => openSetup(s)}
              className="group relative overflow-hidden rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:p-6"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${t.gradient}`} />
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${t.gradient} text-white shadow-lg`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{t.label}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {m ? `${m.total} pitanja` : '…'} · {m ? Object.keys(m.topics).length : '—'} tema
              </p>
              {stats && stats.total > 0 && (
                <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${t.text}`}>
                  <Target className="h-3.5 w-3.5" />
                  test prosjek: {Math.round((stats.correct / stats.total) * 100)}%
                </p>
              )}
            </motion.button>
          )
        })}
        {subjects.length === 0 && (
          <p className="col-span-full rounded-3xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Učitavam predmete…
          </p>
        )}
      </div>

      {/* istorija */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-10"
        aria-label="Istorija"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-primary" />
          Nedavna aktivnost
        </h2>
        {history.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
            <BookMarked className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Još nema riješenih kvizova. Riješi prvi i rezultati će se pojaviti ovdje.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {history.slice(0, 8).map(h => {
              const t = SUBJECT_THEME[h.subject]
              const Icon = ICONS[t.icon]
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3.5 rounded-2xl border bg-card px-4 py-3 shadow-sm"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.softBg} ${t.text}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {t.label} · {SCHOOL_LABEL[h.school] ?? ''} · {h.mode === 'TEST' ? 'Testiranje' : 'Učenje'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.correct}/{h.answeredCount} tačno ·{' '}
                      {new Date(h.createdAt).toLocaleDateString('bs-BA', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      h.percent >= 60
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    }`}
                  >
                    {h.percent}%
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>

      {/* setup dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          {selSubject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-xl">
                  {(() => {
                    const t = SUBJECT_THEME[selSubject]
                    const Icon = ICONS[t.icon]
                    return (
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white`}>
                        <Icon className="h-5 w-5" />
                      </span>
                    )
                  })()}
                  {SUBJECT_THEME[selSubject].label}
                </DialogTitle>
                <DialogDescription>
                  {SCHOOL_LABEL[school]} · odaberi mod rada i konfiguriši kviz.
                </DialogDescription>
              </DialogHeader>

              {/* mod */}
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(
                  [
                    { id: 'UCENJE', icon: Brain, title: 'Učenje', desc: 'Feedback + rješenja' },
                    { id: 'TEST', icon: Timer, title: 'Testiranje', desc: 'Rezultat na kraju' },
                  ] as const
                ).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      mode === m.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    }`}
                    aria-pressed={mode === m.id}
                  >
                    <m.icon className={`h-5 w-5 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="mt-2 font-bold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>

              {mode === 'UCENJE' ? (
                <div className="space-y-4 rounded-2xl bg-secondary/60 p-4">
                  <div className="space-y-1.5">
                    <Label>Tema</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="Sve teme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Sve teme (mješovito)</SelectItem>
                        {schoolMeta[selSubject] &&
                          Object.entries(schoolMeta[selSubject].topics).map(([tp, n]) => (
                            <SelectItem key={tp} value={tp}>
                              {tp} ({n})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Broj pitanja</Label>
                    <Select value={count} onValueChange={setCount}>
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} pitanja
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Nakon svakog pitanja vidjećeš da li je odgovor tačan — a za matematiku i
                    kompletno rješenje.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-secondary/60 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground">{testTotal} pitanja — kao pravi ispit</p>
                  <p className="mt-1.5">
                    Pitanja su raspoređena po nivoima (osnovni / srednji / viši) prema strukturi
                    ispita. Tačni odgovori se otkrivaju tek na kraju.
                  </p>
                </div>
              )}

              <Button
                onClick={start}
                disabled={starting}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold shadow-lg shadow-emerald-600/20"
              >
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Priprema...
                  </>
                ) : (
                  <>
                    {mode === 'UCENJE' ? 'Počni učenje' : 'Počni test'}
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}

export { LEVEL_LABEL }
