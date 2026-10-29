'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { KeyRound, Lock, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Lozinke se ne podudaraju.')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword({ token, password })
      setDone(true)
      setTimeout(() => router.push('/'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo je do greške.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      <div className="hero-blob left-[-12%] top-[5%] h-[360px] w-[360px] bg-emerald-300/50 dark:bg-emerald-700/25" />
      <div className="hero-blob bottom-[-5%] right-[-10%] h-[360px] w-[360px] bg-amber-200/60 dark:bg-amber-700/20" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <button
          onClick={() => router.push('/')}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazad
        </button>

        <div className="rounded-3xl border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              {done ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {done ? 'Lozinka promijenjena!' : 'Postavi novu lozinku'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {done
                ? 'Prijavljujemo te... ako ne, idi na početnu stranicu.'
                : 'Unesi novu lozinku za svoj nalog.'}
            </p>
          </div>

          {!done && !token && (
            <p className="pop-in rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
              Link je neispravan — otvori ga ponovo iz emaila.
            </p>
          )}

          {!done && token && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova lozinka</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Najmanje 6 znakova"
                    className="h-11 rounded-xl pl-9"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Ponovi novu lozinku</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Ista lozinka ponovo"
                    className="h-11 rounded-xl pl-9"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <p className="pop-in rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold shadow-lg shadow-emerald-600/20 transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sačekaj...
                  </>
                ) : (
                  'Postavi novu lozinku'
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
