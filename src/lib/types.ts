export interface UserInfo {
  id: string
  name: string
  email: string
}

export interface OptionItem {
  text: string
  image: string | null
}

export interface PublicQuestion {
  id: string
  subject: string
  school: string
  topic: string
  level: string
  text: string
  passage: string | null
  image: string | null
  options: OptionItem[]
}

export interface Progress {
  index: number
  total: number
  answered: number
  correctCount: number
  finished: boolean
}

export interface AnswerFeedback extends Progress {
  isCorrect: boolean
  correctIndex: number
  options: OptionItem[]
  solution: string[]
  solutionImages: string[]
}

export interface ReviewItem {
  orderIndex: number
  text: string
  passage: string | null
  image: string | null
  topic: string
  options: OptionItem[]
  selectedIndex: number
  correctIndex: number
  isCorrect: boolean
  solution: string[]
  solutionImages: string[]
}

export interface FinishResult {
  subject: string
  school: string
  mode: string
  status: string
  total: number
  answered: number
  correct: number
  percent: number
  review: ReviewItem[]
}

export interface HistoryItem {
  id: string
  subject: string
  school: string
  mode: string
  total: number
  correct: number
  answeredCount: number
  percent: number
  createdAt: string
  completedAt: string | null
}

export interface QuizMeta {
  schools: Record<
    string,
    Record<string, { total: number; topics: Record<string, number> }>
  >
}

export type QuizMode = 'UCENJE' | 'TEST'

export interface StartResponse {
  sessionId: string
  mode: QuizMode
  subject: string
  school: string
  total: number
  question: PublicQuestion
}

export type SchoolLevel = 'OSNOVNA' | 'SREDNJA'
