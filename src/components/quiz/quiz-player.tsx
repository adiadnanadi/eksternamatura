'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Timer,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flag,
  Loader2,
  Image as ImageIcon,
  BookOpenText,
  Lightbulb,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MathText } from '@/components/quiz/math-text'
import { api, SUBJECT_THEME, LEVEL_LABEL, OPTION_LETTERS } from '@/lib/client'
import type { PublicQuestion, AnswerFeedback, QuizMode } from '@/lib/types'
import { toast } from 'sonner'

const LETTERS = OPTION_LETTERS

export function QuizPlayer({
  sessionId,
  mode,
  subject,
  school,
  onExit,
  onFinished,
}: {
  sessionId: string
  mode: QuizMode
  subject: string
  school: string
  onExit: () => void
  onFinished: () => void
}) {
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null)
  const [checking, setChecking] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [imageOk, setImageOk] = useState(true)

  const theme = SUBJECT_THEME[subject]

  const loadCurrent = useCallback(async () => {
    try {
      const res = await api.current(sessionId)
      if (res.finished || !res.question) {
        onFinished()
        return
      }
      setQuestion(res.question)
      setIndex(res.index ?? 0)
      setTotal(res.total ?? 10)
      setCorrectCount(res.correctCount ?? 0)
      setSelected(null)
      setFeedback(null)
      setImageOk(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri učitavanju pitanja.')
    }
  }, [sessionId, onFinished])

  useEffect(() => {
    loadCurrent()
  }, [loadCurrent])

  const canConfirm = selected !== null && !feedback && !checking && !transitioning
  const isLast = index === total - 1

  async function confirmAnswer() {
    if (selected === null || !question) return
    setChecking(true)
    try {
      const res = await api.answer(sessionId, selected)
      if (mode === 'UCENJE' && res.isCorrect !== undefined) {
        setFeedback({
          isCorrect: res.isCorrect,
          correctIndex: res.correctIndex!,
          options: res.options ?? question.options,
          solution: res.solution ?? [],
          solutionImages: res.solutionImages ?? [],
          index: res.progress?.index ?? index,
          total: res.progress?.total ?? total,
          answered: res.progress?.answered ?? index + 1,
          correctCount: res.progress?.correctCount ?? correctCount,
          finished: res.progress?.finished ?? false,
        })
        setCorrectCount(res.progress?.correctCount ?? correctCount)
      } else {
        // TEST: bez feedbacka — kratka animacija pa sljedeće
        setTransitioning(true)
        setTimeout(() => {
          if ((res.progress?.index ?? index + 1) >= total) {
            onFinished()
          } else {
            loadCurrent().finally(() => setTransitioning(false))
          }
        }, 420)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri slanju odgovora.')
      setSelected(null)
    } finally {
      setChecking(false)
    }
  }

  function nextQuestion() {
    if (feedback?.finished) {
      onFinished()
      return
    }
    loadCurrent()
  }

  // tastatura: A-E / 1-5 za odabir, Enter za potvrdu
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (confirmExit) return
      const k = e.key.toUpperCase()
      let idx = -1
      if ((OPTION_LETTERS as readonly string[]).includes(k)) idx = (OPTION_LETTERS as readonly string[]).indexOf(k)
      if (['1', '2', '3', '4', '5'].includes(k)) idx = parseInt(k) - 1
      if (idx >= 0 && idx < (question?.options.length ?? 0) && !feedback && !transitioning) {
        setSelected(idx)
      }
      if (e.key === 'Enter') {
        if (feedback) nextQuestion()
        else if (canConfirm) confirmAnswer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
     
  }, [question, feedback, transitioning, selected, canConfirm, confirmExit])

  const progressPct = total ? ((index + (feedback ? 1 : 0)) / total) * 100 : 0

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 pb-10 pt-6 sm:px-6">
      {/* gornja traka */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${theme.chip}`}>
              {mode === 'UCENJE' ? <Brain className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
              {mode === 'UCENJE' ? 'Mod učenja' : 'Mod testiranja'}
            </span>
            <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground sm:inline-block">
              {theme.label} · {school === 'SREDNJA' ? 'Srednja' : 'Osnovna'} škola
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'UCENJE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Award className="h-3.5 w-3.5" />
                {correctCount} tačno
              </span>
            )}
            <button
              onClick={() => setConfirmExit(true)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Flag className="h-3.5 w-3.5" />
              Prekini
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">
            {index + 1}/{total}
          </span>
        </div>
      </div>

      {/* pitanje */}
      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={`${question.id}-${index}`}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {/* meta */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">
                {question.topic}
              </span>
              <span className="rounded-full border px-2.5 py-1 font-medium text-muted-foreground">
                {LEVEL_LABEL[question.level] ?? question.level}
              </span>
            </div>

            {/* passage */}
            {question.passage && (
              <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  <BookOpenText className="h-3.5 w-3.5" /> Tekst za čitanje
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">{question.passage}</p>
              </div>
            )}

            {/* tekst pitanja */}
            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold leading-relaxed sm:text-lg">
                <MathText text={question.text} />
              </h2>
              {question.image && imageOk && (
                <div className="mt-4 flex justify-center">
                  { }
                  <img
                    src={question.image}
                    alt={`Grafik uz pitanje ${index + 1}`}
                    className="max-h-72 rounded-xl border bg-white object-contain shadow-sm dark:bg-white/95"
                    onError={() => setImageOk(false)}
                  />
                </div>
              )}
            </div>

            {/* opcije */}
            <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Odgovori">
              {question.options.map((opt, i) => {
                const isSelected = selected === i
                const isCorrectOpt = feedback && feedback.correctIndex === i
                const isWrongPicked = feedback && isSelected && !feedback.isCorrect
                return (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!!feedback || checking || transitioning}
                    onClick={() => setSelected(i)}
                    className={`group flex min-h-14 w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left transition-all sm:px-5 ${
                      isCorrectOpt
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'
                        : isWrongPicked
                          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/30 shake'
                          : isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] active:scale-[0.995]'
                    } ${feedback ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                        isCorrectOpt
                          ? 'bg-emerald-500 text-white'
                          : isWrongPicked
                            ? 'bg-red-500 text-white'
                            : isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground group-hover:bg-primary/10'
                      }`}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed sm:text-[15px]">
                      <MathText text={typeof opt === 'string' ? opt : opt.text} />
                      {typeof opt !== 'string' && opt.image && (
                        <img
                          src={opt.image}
                          alt={`Opcija ${LETTERS[i]}`}
                          className="mt-2 max-h-40 rounded-lg border bg-white object-contain dark:bg-white/95"
                        />
                      )}
                    </span>
                    {isCorrectOpt && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                    {isWrongPicked && <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
                  </button>
                )
              })}
            </div>

            {/* feedback (mod učenja) */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <div
                    className={`pop-in rounded-2xl border-2 p-4 ${
                      feedback.isCorrect
                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                        : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/25'
                    }`}
                  >
                    <p className={`flex items-center gap-2 font-bold ${feedback.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                      {feedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" /> Tačno! Odličan odgovor.
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5" /> Netačno — tačan odgovor je{' '}
                          {LETTERS[feedback.correctIndex]}.
                        </>
                      )}
                    </p>

                    {(feedback.solution.length > 0 || feedback.solutionImages.length > 0) && (
                      <div className="mt-3 rounded-xl bg-white/80 p-4 dark:bg-black/20">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          <Lightbulb className="h-4 w-4" /> Rješenje
                        </p>
                        {feedback.solution.map((s, i) => (
                          <p key={i} className="mb-2 text-sm leading-relaxed last:mb-0">
                            <MathText text={s} />
                          </p>
                        ))}
                        {feedback.solutionImages.map(img => (
                           
                          <img
                            key={img}
                            src={img}
                            alt="Slika uz rješenje"
                            className="mt-2 max-h-60 rounded-lg border bg-white object-contain dark:bg-white/95"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* akcije */}
            <div className="sticky bottom-4 mt-5">
              {mode === 'UCENJE' && !feedback ? (
                <Button
                  onClick={confirmAnswer}
                  disabled={!canConfirm}
                  size="lg"
                  className="h-13 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold shadow-xl shadow-emerald-600/20 transition-transform hover:scale-[1.005]"
                >
                  {checking ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Provjera...
                    </>
                  ) : (
                    <>
                      Provjeri odgovor
                      <ArrowRight className="ml-1 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : mode === 'UCENJE' && feedback ? (
                <Button
                  onClick={nextQuestion}
                  size="lg"
                  className="h-13 w-full rounded-2xl bg-foreground text-base font-semibold text-background shadow-xl transition-transform hover:scale-[1.005]"
                >
                  {feedback.finished ? 'Vidi rezultate' : 'Sljedeće pitanje'}
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              ) : (
                !transitioning && (
                  <Button
                    onClick={confirmAnswer}
                    disabled={!canConfirm}
                    size="lg"
                    className="h-13 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-base font-semibold text-white shadow-xl shadow-amber-600/20 transition-transform hover:scale-[1.005]"
                  >
                    {checking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sljedeće...
                      </>
                    ) : isLast ? (
                      <>
                        Završi test
                        <Flag className="ml-1 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Sljedeće pitanje
                        <ArrowRight className="ml-1 h-5 w-5" />
                      </>
                    )}
                  </Button>
                )
              )}
            </div>

            {/* hint za tastaturu */}
            <p className="mt-3 hidden text-center text-xs text-muted-foreground/70 sm:block">
              Tipke 1–5 ili A–E za odabir odgovora · Enter za potvrdu
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* dijalog za prekid */}
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Prekini kviz?</DialogTitle>
            <DialogDescription>
              Trenutni progres neće biti sačuvan i rezultat neće biti evidentiran.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmExit(false)} className="flex-1 rounded-xl">
              Nastavi kviz
            </Button>
            <Button variant="destructive" onClick={onExit} className="flex-1 rounded-xl">
              Prekini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {transitioning && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-sm font-medium text-background shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" /> Učitavam sljedeće pitanje...
          </span>
        </div>
      )}
    </main>
  )
}
