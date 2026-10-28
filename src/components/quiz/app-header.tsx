'use client'

import { GraduationCap, Moon, Sun, LogOut, Home, BarChart3 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import type { UserInfo } from '@/lib/types'

export function AppHeader({
  user,
  onHome,
  onLogout,
  onStats,
}: {
  user: UserInfo | null
  onHome: () => void
  onLogout: () => void
  onStats: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary"
          aria-label="Početna"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight font-heading">
            Kviz<span className="text-primary">Matura</span>
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <>
              <Button variant="ghost" size="sm" onClick={onHome} className="hidden sm:inline-flex">
                <Home className="h-4 w-4" />
                Početna
              </Button>
              <Button variant="ghost" size="sm" onClick={onStats} className="hidden sm:inline-flex">
                <BarChart3 className="h-4 w-4" />
                Statistika
              </Button>
              <span className="hidden max-w-[140px] truncate rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground md:inline-block">
                {user.name}
              </span>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Promijeni temu"
            suppressHydrationWarning
          >
            <Sun className="hidden h-4.5 w-4.5 dark:block" />
            <Moon className="h-4.5 w-4.5 dark:hidden" />
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              aria-label="Odjava"
              title="Odjava"
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
