'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  Lightbulb,
  ChevronDown,
  Home,
  RotateCcw,
  Brain,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { MathText } from '@/components/quiz/math-text'
import { api, SUBJECT_THEME, LEVEL_LABEL, OPTION_LETTERS, SCHOOL_LABEL } from '@/lib/client'
import type { FinishResult } from '@/lib/types'

function messageFor(percent: number): { title: string; sub: string; emoji: string } {
  if (percent >= 90)
    return { title: 'Izvanredno!', sub: 'Znanje je na najvišem nivou — ovako se položi matura.', emoji: '🏆' }
  if (percent >= 70)
    return { title: 'Odličan rezultat!', sub: 'Još malo vježbe i savladano je sve.', emoji: '🎉' }
  if (percent >= 50)
    return { title: 'Dobro!', sub: 'Solidna osnova — fokusiraj se na pitanja koja su promašena.', emoji: '💪' }
  if (percent >= 30)
    return { title: 'Nastavi vježbati', sub: 'Iskoristi mod učenja — pokazuje rješenje svakog zadatka.', emoji: '📚' }
  return { title: 'Nemoj odustajati', sub: 'Mod učenja je najbolji prijatelj — vježbaj teme redom.', emoji: '🌱' }
}

function ScoreRing({ percent }: { percent: number }) {
  const R = 54
  const C = 2 * Math.PI * R
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="12" className="stroke-secondary" />
        <motion.circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className={percent >= 60 ? 'stroke-emerald-500' : percent >= 30 ? 'stroke-amber-500' : 'stroke-red-500'}
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * percent) / 100 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
          className="text-4xl font-extrabold tabular-nums"
        >
          {percent}%
        </motion.span>
      </div>
    </div>
  )
}

export function Results({
  sessionId,
  onDashboard,
  onHome,
}: {
  sessionId: string
  onDashboard: () => void
  onHome: () => void
}) {
  const [result, setResult] = useState<FinishResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .finish(sessionId)
      .then(setResult)
      .catch(e => setError(e instanceof Error ? e.message : 'Greška pri učitavanju rezultata.'))
  }, [sessionId])

  if (error) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={onDashboard} className="mt-4 rounded-xl">
          Nazad na početnu
        </Button>
      </main>
    )
  }

  if (!result) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  const theme = SUBJECT_THEME[result.subject]
  const msg = messageFor(result.percent)
  const wrongIdx = result.review.filter(r => !r.isCorrect).map(r => r.orderIndex)

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      {/* rezultat */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border bg-card p-6 text-center shadow-lg sm:p-8"
      >
        <p className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${theme.chip}`}>
          {result.mode === 'TEST' ? <Timer className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
          {theme.label} · {SCHOOL_LABEL[result.school] ?? ''} · {result.mode === 'TEST' ? 'Mod testiranja' : 'Mod učenja'}
        </p>
        <div className="mt-5 flex justify-center">
          <ScoreRing percent={result.percent} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {msg.emoji} {msg.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{msg.sub}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> {result.correct} tačno
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3.5 py-1.5 text-sm font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
            <XCircle className="h-4 w-4" /> {result.answered - result.correct} netačno
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-bold text-secondary-foreground">
            <Target className="h-4 w-4" /> {result.answered}/{result.total} riješeno
          </span>
        </div>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            onClick={onDashboard}
            size="lg"
            className="h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 font-semibold shadow-lg shadow-emerald-600/20"
          >
            <RotateCcw className="mr-1.5 h-5 w-5" /> Novi kviz
          </Button>
          <Button onClick={onHome} size="lg" variant="outline" className="h-12 rounded-2xl px-7 font-semibold">
            <Home className="mr-1.5 h-5 w-5" /> Početna
          </Button>
        </div>
      </motion.section>

      {/* pregled */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="mt-8"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Trophy className="h-5 w-5 text-amber-500" />
          Pregled svih pitanja
        </h2>
        {wrongIdx.length > 0 && (
          <p className="mb-3 text-sm text-muted-foreground">
            Promašena pitanja (označena crveno) su automatski otvorena sa rješenjem.
          </p>
        )}
        <Accordion
          type="multiple"
          defaultValue={wrongIdx}
          className="nice-scroll space-y-3 [&>div]:border-none"
        >
          {result.review.map((r, i) => (
            <AccordionItem
              key={i}
              value={String(r.orderIndex)}
              className={`overflow-hidden rounded-2xl border-2 ${
                r.isCorrect
                  ? 'border-emerald-200/70 dark:border-emerald-800/50'
                  : 'border-red-200/80 dark:border-red-800/60'
              }`}
            >
              <AccordionTrigger className="gap-3 px-4 py-3.5 hover:no-underline sm:px-5">
                <span className="flex min-w-0 items-start gap-3 text-left">
                  <span
                    className={`mt-0.5 shrink-0 ${r.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {r.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-muted-foreground">
                      Pitanje {r.orderIndex + 1} · {r.topic} · {LEVEL_LABEL[r.level] ?? ''}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold leading-snug">
                      <MathText text={r.text} />
                    </span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </AccordionTrigger>
              <AccordionContent className="border-t bg-background/60 px-4 pb-5 pt-4 sm:px-5">
                {r.passage && (
                  <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-foreground/80 dark:bg-amber-950/20">
                    {r.passage}
                  </p>
                )}
                {r.image && (
                  <div className="mb-3 flex justify-center">
                    { }
                    <img
                      src={r.image}
                      alt="Slika uz pitanje"
                      className="max-h-52 rounded-lg border bg-white object-contain dark:bg-white/95"
                    />
                  </div>
                )}
                <ul className="grid gap-1.5">
                  {r.options.map((opt, oi) => {
                    const isCorrect = oi === r.correctIndex
                    const isPicked = oi === r.selectedIndex
                    return (
                      <li
                        key={oi}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                          isCorrect
                            ? 'border-emerald-400 bg-emerald-50 font-semibold dark:border-emerald-600 dark:bg-emerald-950/30'
                            : isPicked
                              ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/25'
                              : 'border-border/60 text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : isPicked
                                ? 'bg-red-500 text-white'
                                : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {OPTION_LETTERS[oi]}
                        </span>
                        <span className="flex-1">
                          <MathText text={typeof opt === 'string' ? opt : opt.text} />
                          {typeof opt !== 'string' && opt.image && (
                            <img
                              src={opt.image}
                              alt={`Opcija ${OPTION_LETTERS[oi]}`}
                              className="mt-2 max-h-32 rounded-lg border bg-white object-contain dark:bg-white/95"
                            />
                          )}
                        </span>
                        {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                        {isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      </li>
                    )
                  })}
                </ul>
                {(r.solution.length > 0 || r.solutionImages.length > 0) && (
                  <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      <Lightbulb className="h-3.5 w-3.5" /> Rješenje
                    </p>
                    {r.solution.map((s, si) => (
                      <p key={si} className="mb-1.5 text-sm leading-relaxed last:mb-0">
                        <MathText text={s} />
                      </p>
                    ))}
                    {r.solutionImages.map(img => (
                       
                      <img
                        key={img}
                        src={img}
                        alt="Slika uz rješenje"
                        className="mt-2 max-h-56 rounded-lg border bg-white object-contain dark:bg-white/95"
                      />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>
    </main>
  )
}
