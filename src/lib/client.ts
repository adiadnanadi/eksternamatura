import { identifyVisit } from '@/lib/visit-client'

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Greška ${res.status}`)
  }
  return data as T
}

export const api = {
  me: () => fetch('/api/auth/me').then(r => handle<{ user: null | import('./types').UserInfo }>(r)),

  register: async (body: { name: string; email: string; password: string }) => {
    const data = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<{ user: import('./types').UserInfo }>(r))
    identifyVisit() // posjeta iz ovog sessiona → email u admin panelu
    return data
  },

  login: async (body: { email: string; password: string }) => {
    const data = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<{ user: import('./types').UserInfo }>(r))
    identifyVisit() // posjeta iz ovog sessiona → email u admin panelu
    return data
  },

  logout: () => fetch('/api/auth/logout', { method: 'POST' }).then(() => undefined),

  meta: () => fetch('/api/quiz/meta').then(r => handle<import('./types').QuizMeta>(r)),

  start: (body: { subject: string; school: string; mode: string; count?: number; topic?: string | null }) =>
    fetch('/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<import('./types').StartResponse>(r)),

  current: (sessionId: string) =>
    fetch('/api/quiz/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(r => handle<{ question?: import('./types').PublicQuestion; index?: number; total?: number; finished?: boolean; status?: string }>(r)),

  answer: (sessionId: string, selectedIndex: number) =>
    fetch('/api/quiz/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, selectedIndex }),
    }).then(r =>
      handle<{ received?: boolean; progress?: import('./types').Progress } & Partial<import('./types').AnswerFeedback>>(r)
    ),

  finish: (sessionId: string) =>
    fetch('/api/quiz/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(r => handle<import('./types').FinishResult>(r)),

  history: () =>
    fetch('/api/quiz/history').then(r =>
      handle<{ history: import('./types').HistoryItem[]; bySubject: Record<string, { correct: number; total: number }> }>(r)
    ),
}

export const SUBJECT_THEME: Record<
  string,
  { label: string; icon: 'Sigma' | 'BookOpen' | 'Globe'; gradient: string; chip: string; text: string; softBg: string }
> = {
  MATEMATIKA: {
    label: 'Matematika',
    icon: 'Sigma',
    gradient: 'from-violet-500 to-fuchsia-500',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    text: 'text-violet-600 dark:text-violet-400',
    softBg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  BOSANSKI: {
    label: 'Bosanski jezik',
    icon: 'BookOpen',
    gradient: 'from-emerald-500 to-teal-500',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    text: 'text-emerald-600 dark:text-emerald-400',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  ENGLESKI: {
    label: 'Engleski jezik',
    icon: 'Globe',
    gradient: 'from-amber-500 to-orange-500',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-400',
    softBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
}

export const LEVEL_LABEL: Record<string, string> = {
  OSNOVNI: 'Osnovni nivo',
  SREDNJI: 'Srednji nivo',
  VISI: 'Viši nivo',
}

export const SCHOOL_LABEL: Record<string, string> = {
  OSNOVNA: 'Osnovna škola',
  SREDNJA: 'Srednja škola',
}

/** Slova opcija A-E (dinamički po broju opcija pitanja) */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const
