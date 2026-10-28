'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, User as UserIcon, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client'
import type { UserInfo } from '@/lib/types'

export function AuthView({
  initialMode,
  onSuccess,
  onBack,
}: {
  initialMode: 'login' | 'register'
  onSuccess: (user: UserInfo) => void
  onBack: () => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ name, email, password })
      onSuccess(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo je do greške.')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

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
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazad
        </button>

        <div className="rounded-3xl border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <GraduationCap className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {isLogin ? 'Dobrodošli nazad!' : 'Kreiraj račun'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLogin
                ? 'Prijavi se i nastavi gdje si stao.'
                : 'Registracija je besplatna — potrebni su samo ime i email.'}
            </p>
          </div>

          {/* toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1" role="tablist">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Prijava' : 'Registracija'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Ime i prezime</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Amina Hodić"
                    className="h-11 rounded-xl pl-9"
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tebe@example.com"
                  className="h-11 rounded-xl pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Lozinka</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isLogin ? 'Tvoja lozinka' : 'Najmanje 6 znakova'}
                  className="h-11 rounded-xl pl-9"
                  required
                  minLength={isLogin ? 1 : 6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
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
              ) : isLogin ? (
                'Prijavi se'
              ) : (
                'Kreiraj račun'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  )
}
