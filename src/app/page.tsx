'use client'

import { useCallback, useEffect, useState } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { AppHeader } from '@/components/quiz/app-header'
import { Landing } from '@/components/quiz/landing'
import { AuthView } from '@/components/quiz/auth-view'
import { Dashboard } from '@/components/quiz/dashboard'
import { QuizPlayer } from '@/components/quiz/quiz-player'
import { Results } from '@/components/quiz/results'
import { StatsView } from '@/components/quiz/stats-view'
import { api } from '@/lib/client'
import type { UserInfo, QuizMode } from '@/lib/types'
import { toast } from 'sonner'

type View = 'landing' | 'auth' | 'dashboard' | 'quiz' | 'results' | 'stats'

interface ActiveQuiz {
  sessionId: string
  mode: QuizMode
  subject: string
  school: string
}

function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [view, setView] = useState<View>('landing')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null)

  useEffect(() => {
    api
      .me()
      .then(res => {
        if (res.user) {
          setUser(res.user)
          setView('dashboard')
        }
      })
      .finally(() => setBooting(false))
  }, [])

  const handleStart = useCallback(
    async (params: { subject: string; school: string; mode: 'UCENJE' | 'TEST'; count?: number; topic?: string | null }) => {
      try {
        const res = await api.start(params)
        setActiveQuiz({ sessionId: res.sessionId, mode: res.mode as QuizMode, subject: res.subject, school: res.school })
        setView('quiz')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Greška pri pokretanju kviza.')
      }
    },
    []
  )

  const handleLogout = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setUser(null)
    setActiveQuiz(null)
    setView('landing')
    toast.success('Uspješno ste se odjavili.')
  }, [])

  const handleHome = useCallback(() => {
    if (user) setView('dashboard')
    else setView('landing')
  }, [user])

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </span>
          <p className="text-sm font-medium text-muted-foreground">Kviz Matura se učitava...</p>
        </div>
      </div>
    )
  }

  const requiresAuth = view === 'dashboard' || view === 'quiz' || view === 'results' || view === 'stats'
  const effectiveView: View = requiresAuth && !user ? 'auth' : view

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader
        user={effectiveView === 'landing' ? user : user}
        onHome={handleHome}
        onLogout={handleLogout}
        onStats={() => setView('stats')}
      />

      <div className="flex flex-1 flex-col">
        {effectiveView === 'landing' && (
          <Landing
            user={user}
            onStart={() => {
              setAuthMode('register')
              setView(user ? 'dashboard' : 'auth')
            }}
          />
        )}

        {effectiveView === 'auth' && (
          <AuthView
            initialMode={authMode}
            onSuccess={u => {
              setUser(u)
              setView('dashboard')
              toast.success(`Dobrodošao/la, ${u.name.split(' ')[0]}!`)
            }}
            onBack={handleHome}
          />
        )}

        {effectiveView === 'dashboard' && user && <Dashboard user={user} onStart={handleStart} />}

        {effectiveView === 'quiz' && activeQuiz && (
          <QuizPlayer
            key={activeQuiz.sessionId}
            sessionId={activeQuiz.sessionId}
            mode={activeQuiz.mode}
            subject={activeQuiz.subject}
            school={activeQuiz.school}
            onExit={() => {
              setActiveQuiz(null)
              setView('dashboard')
            }}
            onFinished={() => setView('results')}
          />
        )}

        {effectiveView === 'results' && activeQuiz && (
          <Results
            sessionId={activeQuiz.sessionId}
            onDashboard={() => {
              setActiveQuiz(null)
              setView('dashboard')
            }}
            onHome={() => {
              setActiveQuiz(null)
              setView('dashboard')
            }}
          />
        )}

        {effectiveView === 'stats' && <StatsView onBack={handleHome} />}
      </div>

      <footer className="mt-auto border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>Kviz Matura — banka pitanja za matematiku, bosanski i engleski jezik.</p>
          <p>1581 pitanja · osnovna i srednja škola · mod učenja i mod testiranja · zaštićeno od kopiranja</p>
        </div>
      </footer>
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}
