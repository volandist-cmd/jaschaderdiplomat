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
  studyPlan: string | null
  studyPlanMeta: { ts: number; errorCount: number } | null
  essays: Essay[]
  notes: string
  apiKey: string | null
  _apiKeyEditing: boolean
  _lastBackupAt: number | null
  examDate: string
  fullrun: FullrunQueueState | null
  sims: SimAttempt[]
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
  /** Wall-clock deadline (Date.now() + durationSec*1000) for Prüfungsmodus. Used to compute
   *  timeLeft from actual elapsed time instead of counting ticks, so the countdown stays
   *  accurate even when the tab is backgrounded and setInterval gets throttled. */
  deadlineTs?: number
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
  /** Two-blank "Wortgleichung" format (DGP-Verbale Analogien): "? verhält sich zu B wie C zu
   *  ?" with two independent option lists instead of a single A-D list. `a` is unused for
   *  these items; the answer is stored as [oLeftIdx, oRightIdx]. */
  dual?: boolean
  oLeft?: string[]
  oRight?: string[]
  aLeft?: number
  aRight?: number
}

/**
 * One step in a DGP-Testabschnitt / Voller Durchlauf / Prüfungssimulation queue.
 * Ported from the original's startFullrun()/startSimulation() step arrays — collapsed to a
 * single generic shape since this app's startQuiz()/pickRunSetId() are already generic across
 * modules (the original needed one step "type" per hardcoded start<Name>() function instead).
 */
export interface FullrunStep {
  moduleId: string
  kind: 'quiz' | 'tsu' | 'analyse'
  /** Fixed set id for named-set modules (Fachtests: "2019"; Englisch v1/Russisch: "muster"). Omitted for run-pool modules — resolved via pickRunSetId() at launch time. */
  fixedSet?: string
  shuffle?: boolean
}

export interface FullrunStepResult {
  kind: 'quiz' | 'tsu' | 'analyse'
  pct: number | null
  earned?: number
  total?: number
}

export interface FullrunQueueState {
  steps: FullrunStep[]
  idx: number
  results: Record<string, FullrunStepResult>
  done: boolean
  kind: 'dgpOnly' | 'fullrun' | 'simulation'
  withAnalyse: boolean
  simN?: number
  startedTs: number
  /** Module ids skipped because they currently have zero ported content (see Docs/PORT_STATUS.md gap #2). */
  skipped: string[]
}

export interface ScoresheetRow {
  key: string
  name: string
  earned?: number | null
  total?: number | null
  pct: number | null
  /** Percentage threshold, e.g. DGP subcategories, Englisch, Russisch, TSU. */
  schwellePct?: number | null
  /** Point threshold, e.g. combined Fachtests (≥25 of 75). */
  schwelle?: number | null
  max?: number | null
  /** Composite/sub-row (e.g. individual DGP subcategories) — informational, not counted toward `bestanden`. */
  comp?: boolean
  pass: boolean | null
}

export interface Scoresheet {
  rows: ScoresheetRow[]
  fachE: number
  fachT: number
  fachPct: number
  cogPct: number | null
  gesamt: number
  paPct: number | null
  paNote: number | null
  gesamtNachPA: number | null
  bestanden: boolean
}

export interface SimAttempt {
  n: number
  ts: number
  sheet: Scoresheet
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
  /**
   * Blendet die Unterkategorie-Bezeichnung WÄHREND der Frage aus (Auswertung und Fehleranalyse
   * behalten sie). Nötig, wo die Bezeichnung nicht das Thema, sondern das URTEIL benennt —
   * z. B. „Fehlschluss der Umkehrung" ist stets „Stimmt nicht". Ohne diesen Schalter waren bei
   * dgpschlussmulti 276 von 480 binären Aufgaben allein über den Kategorienamen lösbar.
   */
  hideCatDuringQuestion?: boolean
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

export interface CategoryTrend {
  n: number
  firstAvg: number | null
  secondAvg: number | null
  delta: number | null
  dir: 'up' | 'down' | 'flat' | null
}

/** One day's aggregate accuracy for a trend line/heatmap cell. `avg` is null if nothing was practiced that day. */
export interface DailyPoint {
  day: string // YYYY-MM-DD
  avg: number | null
  n: number
}

export interface CategoryHeatmapRow {
  id: string
  name: string
  cells: DailyPoint[]
}

/** Pace vs. accuracy read for one category: flags whether time pressure or actual knowledge looks like the bigger blocker. */
export interface PaceInsight {
  id: string
  name: string
  avgPct: number
  secAvg: number
  secBudget: number
  /** secAvg / secBudget, i.e. how much of the allotted time per item is actually used on average. */
  paceRatio: number
  kind: 'tempo' | 'wissen'
}

export interface WeeklyDigest {
  attemptsThisWeek: number
  attemptsLastWeek: number
  avgThisWeek: number | null
  avgLastWeek: number | null
  newlyPracticed: string[]
  mostImproved: { name: string; delta: number } | null
  mostDeclined: { name: string; delta: number } | null
}
