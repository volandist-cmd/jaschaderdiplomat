// Domain Models and Types
// Extracted from the monolithic application

export interface AppState {
  view: string
  params: Record<string, any>
  attempts: Attempt[]
  errorLog: ErrorEntry[]
  subtypeStats: Record<string, SubtypeStat>
  guruAnalysis: string | null
  guruMeta: { ts: number; errorCount: number } | null
  subtypeGuru: Record<string, { text: string; ts: number }>
  guruChat: ChatMessage[]
  readinessCheck: string | null
  readinessMeta: { ts: number; errorCount: number } | null
  essays: Essay[]
  notes: string
  apiKey: string | null
  _apiKeyEditing: boolean
  _lastBackupAt: number | null
  examDate: string
  [key: string]: any // For dynamic per-module run queues (_runQueue_<id>)
}

export interface Attempt {
  module: string
  setId: string
  mode: string
  earned: number
  total: number
  pct: number
  correct: number
  count: number
  secAvg: number
  ts: number
}

export interface ErrorEntry {
  ts: number
  module: string
  setId: string
  mode: string
  cat: string | null
  q: string
  correct: string
  chosen: string | null
  unanswered: boolean
}

export interface SubtypeStat {
  seen: number
  wrong: number
}

export interface ChatMessage {
  role: string
  text: string
}

export interface Essay {
  topic: string
  text: string
  feedback?: string
  ts: number
}

export interface QuizResult {
  earned: number
  total: number
  correct: number
  count: number
  pct: number
  timeUp: boolean
  timeUsed: number
  secAvg: number
  totalSec: number
}

export interface QuizState {
  kind: string
  id: string
  setId: string
  mode: string
  items: QuizItem[]
  answers: Record<number, number | number[] | string>
  marked: Record<number, boolean>
  checked: Record<number, boolean>
  idx: number
  statement: boolean
  totalPts: number
  qTime: Record<number, number>
  _tStart: number
  durationSec: number
  timeLeft: number
  finished: boolean
  fullrun: boolean
  result?: QuizResult
}

export interface QuizItem {
  q: string
  o?: string[]
  a: number
  answer?: string // free-text expected answer (no multiple choice options)
  e: string
  cat?: string
  passage?: string
  src?: string
  chartHTML?: string
  chartKey?: string
  multi?: boolean
  aset?: number[]
  pts?: number
  official?: boolean
  lvl?: string
  statement?: boolean
  flag?: boolean
  _tier?: number
}

export interface FullRunState {
  // Full run state structure
  [key: string]: any
}

export interface ModuleData {
  short: string
  title: string
  desc: string
  durationMin?: number
  icon: string
  sets?: Record<string, QuizSet>
  intro?: string
  count?: number
  secPerItem?: number
  totalSec?: number
  schwellePct?: number
  attemptN?: number
  fullrunN?: number
  fullrunMin?: number
  scale?: string[]
  scenarios?: TsuScenario[]
  topics?: AnalysisTopic[]
  sections?: LerntippSection[]
  example?: { q: string; e: string }
}

export interface QuizSet {
  label: string
  note?: string
  items: QuizItem[]
  statement?: boolean
}

export interface TsuScenario {
  title: string
  context: string
  statements: TsuStatement[]
  official?: boolean
}

export interface TsuStatement {
  t: string
  a: number // 0=sehr ineffektiv, 1=ineffektiv, 2=effektiv, 3=sehr effektiv
  e: string
}

export interface AnalysisTopic {
  cat: string
  t: string
  prompt: string
}

export interface LerntippSection {
  title: string
  icon: string
  body: string[]
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export interface NavigationItem {
  v: string
  id?: string
  t: string
  ic: string
}

export interface CategoryStat {
  id: string
  name: string
  n: number
  avg: number | null
  best: number | null
  ueN: number
  ueAvg: number | null
  prN: number
  prAvg: number | null
  lastTs: number | null
  daysSince: number | null
}

export interface SubtypeWeakness {
  module: string
  moduleName: string
  cat: string
  seen: number
  wrong: number
  rate: number
  topChoice: string | null
  topCount: number
}

export interface RepeatedMistake {
  module: string
  moduleName: string
  cat: string
  q: string
  correct: string
  n: number
  lastTs: number
  lastChosen: string | null
}

export interface BandResult {
  t: string
  c: string
}
