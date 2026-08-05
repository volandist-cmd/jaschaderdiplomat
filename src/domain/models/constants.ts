// Configuration constants
// Extracted from the monolithic application

export const CONFIG = {
  examDateDefault: '2025-09-10',
  appVersion: '1.0.0',
  storageKey: 'prufungstrainer-state',
  autoSaveInterval: 30000, // 30 seconds
  
  // Timer constants
  defaultQuizMinutes: 10,
  warningThresholdSeconds: 60,
  analyseWarningThresholdSeconds: 300,
  
  // Scoring thresholds
  passingPercentage: 50,
  excellentPercentage: 80,
  
  // Data backup reminder
  backupReminderDays: 7,
  
  // Module IDs
  MODULES: [
    'dgp',
    'dgpserie',
    'dgprech',
    'dgpwort',
    'dgpzahl',
    'dgpmatrix',
    'allgemeinwissen',
    'dgptab',
    'dgptx',
    'dgpschaetz',
    'dgpschlussmulti',
    'dgptextsinn',
    'dgpaew',
    'dgportho',
    'dgprecht2',
    'dgpsprich',
    'dgpmath',
    'dgpnorm',
    'dgpsatz',
    'dgpwsch',
    'recht',
    'wirtschaft',
    'geschichte',
    'englisch',
    'englischv2',
    'englischv3',
    'russisch',
    'analyse',
    'tsu'
  ] as const,
  
  // Statistical modules for scoring
  STAT_MODS: [
    'dgp',
    'dgpserie',
    'dgprech',
    'dgpwort',
    'dgpzahl',
    'dgpmatrix',
    'allgemeinwissen',
    'dgptab',
    'dgptx',
    'dgpschaetz',
    'dgpschlussmulti',
    'dgptextsinn',
    'dgpaew',
    'dgportho',
    'dgprecht2',
    'dgpsprich',
    'dgpmath',
    'dgpnorm',
    'dgpsatz',
    'dgpwsch',
    'recht',
    'wirtschaft',
    'geschichte',
    'englisch',
    'englischv2',
    'englischv3',
    'russisch',
    'tsu'
  ] as const
}

export type ModuleId = (typeof CONFIG.MODULES)[number]
export type StatModuleId = (typeof CONFIG.STAT_MODS)[number]

// Lightweight nav/dashboard metadata for every module — mirrors MODULES + NAV
// from the original app. Kept static (no data loading) so the sidebar renders
// instantly; full module content (desc, sets, scenarios…) is lazy-loaded per id.
export interface ModuleMeta {
  id: ModuleId
  title: string
  ic: string
}

// Single flat list, in the exact order of the original's "Prüfungsteile" nav
// group (DGP suite, then Fachprüfungen, then language tests, Analyse, TsU).
export const MODULE_META: ModuleMeta[] = [
  { id: 'dgp', title: 'DGP – Verbale Analogien', ic: 'puzzle' },
  { id: 'dgpserie', title: 'DGP – Buchstabenreihen', ic: 'hash' },
  { id: 'dgprech', title: 'DGP – Grundrechnen', ic: 'calc' },
  { id: 'dgpwort', title: 'DGP – Wortklassifikationen', ic: 'wordclass' },
  { id: 'dgpzahl', title: 'DGP – Zahlenreihen', ic: 'numseries' },
  { id: 'dgpmatrix', title: 'DGP – Zahlenmatrizen', ic: 'matrix' },
  { id: 'allgemeinwissen', title: 'DGP – Allgemeinwissen', ic: 'bulb' },
  { id: 'dgptab', title: 'DGP – Tabellen & Diagramme', ic: 'table' },
  { id: 'dgptx', title: 'DGP – Text-Rechenaufgaben', ic: 'note' },
  { id: 'dgpschaetz', title: 'DGP – Ergebnisse schätzen', ic: 'estimate' },
  { id: 'dgpschlussmulti', title: 'DGP – Logische Schlüsse', ic: 'multiselect' },
  { id: 'dgptextsinn', title: 'DGP – Textanalyse', ic: 'textsense' },
  { id: 'dgpaew', title: 'DGP – Wortbedeutungen', ic: 'synonym' },
  { id: 'dgportho', title: 'DGP – Grammatik', ic: 'rf' },
  { id: 'dgprecht2', title: 'DGP – Rechtschreibung', ic: 'abc' },
  { id: 'dgpsprich', title: 'DGP – Sprichwörter', ic: 'quote' },
  { id: 'dgpmath', title: 'DGP – Mathematik', ic: 'mathword' },
  { id: 'dgpnorm', title: 'DGP – Normen-Diktum', ic: 'norm' },
  { id: 'dgpsatz', title: 'DGP – Korrekte Sätze', ic: 'spellcheck' },
  { id: 'dgpwsch', title: 'DGP – Wortschatz', ic: 'dictionary' },
  { id: 'recht', title: 'Recht', ic: 'scale' },
  { id: 'wirtschaft', title: 'Wirtschaft & VWL', ic: 'chart' },
  { id: 'geschichte', title: 'Geschichte & Politik', ic: 'book' },
  { id: 'englisch', title: 'Englisch v1', ic: 'globe' },
  { id: 'englischv2', title: 'Englisch v2', ic: 'globe' },
  { id: 'englischv3', title: 'Englisch v3', ic: 'globe' },
  { id: 'russisch', title: 'Russisch', ic: 'globe' },
  { id: 'analyse', title: 'Politische Analyse', ic: 'pen' },
  { id: 'tsu', title: 'Situatives Urteilen', ic: 'users' }
]

// Modules using the original's renderQuizHome() landing style — every set
// listed as its own pickable card (year, official sample, or a training run).
// Everything else with a `sets` map is a large non-repeating run pool with no
// set picker (random draw per start), like the original's per-module Home
// renderers (renderDGPHome, renderAWHome, …).
export const NAMED_SET_MODULES = ['recht', 'geschichte', 'wirtschaft', 'englisch', 'russisch'] as const

// Cognitive-style modules (DGP + Allgemeinwissen): in Prüfungsmodus the timer
// runs invisibly in the background instead of a visible countdown.
export const COGNITIVE_MODULES = [
  'dgp', 'dgpserie', 'dgprech', 'dgpwort', 'dgpzahl', 'dgpmatrix', 'allgemeinwissen',
  'dgptx', 'dgpschlussmulti', 'dgptextsinn', 'dgpaew', 'dgportho', 'dgprecht2',
  'dgpsprich', 'dgpmath', 'dgpnorm', 'dgpsatz', 'dgpwsch', 'dgpschaetz', 'dgptab'
] as const

// Modules with no static item pool at all in the original — they were rendered
// by runtime chart/number generators that have not been ported yet.
export const GENERATOR_ONLY_MODULES = ['dgpschaetz', 'dgptab', 'dgpnorm'] as const

// Letter labels for multiple choice
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

// Chart colors for visualizations
export const CHART_COLORS = [
  'var(--navy)',
  'var(--gold)',
  'var(--muted)',
  'var(--green)',
  'var(--red)'
] as const

// Chart dash patterns for line charts
export const CHART_DASH = ['0', '6,4', '2,3', '10,3,2,3'] as const

// ---------------------------------------------------------------------------
// Prüfungssimulation: DGP-Testabschnitt / Voller Durchlauf / Prüfungssimulation
// Ported from the original's DGP_ONLY_QUEUE / startFullrun() / startSimulation().
// ---------------------------------------------------------------------------

/** The 20 DGP subcategories, in the original's fixed queue order (schwellePct comes from each module's own JSON at runtime, not duplicated here). */
export const DGP_ONLY_MODULE_IDS = [
  'dgp', 'dgpserie', 'dgprech', 'dgpwort', 'dgpzahl', 'dgpmatrix',
  'allgemeinwissen', 'dgptab', 'dgptx', 'dgpschaetz',
  'dgpschlussmulti', 'dgptextsinn', 'dgpaew', 'dgportho',
  'dgprecht2', 'dgpsprich', 'dgpmath', 'dgpnorm', 'dgpsatz', 'dgpwsch'
] as const

/** Threshold to mark the aggregate DGP-Testabschnitt "bestanden" (CLAUDE.md: 80%, over total correct, not the mean of per-category percentages). */
export const DGP_TEST_THRESHOLD_PCT = 80

/**
 * Fachtest/Sprachtest tail appended after the 20 DGP steps for both "Voller Durchlauf" and
 * "Prüfungssimulation" (identical order; only `shuffle` differs — set by the caller).
 * Politische Analyse (optional) and TsU are appended separately by the engine.
 */
export const FULLRUN_TAIL_STEPS: { id: string; fixedSet?: string }[] = [
  { id: 'recht', fixedSet: '2019' },
  { id: 'wirtschaft', fixedSet: '2019' },
  { id: 'geschichte', fixedSet: '2019' },
  { id: 'englisch', fixedSet: 'muster' },
  { id: 'englischv2' },
  { id: 'englischv3' },
  { id: 'russisch', fixedSet: 'muster' }
]

/** Official-format Bewertungsblatt thresholds used by computeScoresheet() — hardcoded in the original, not derived from module JSON. */
export const SCORESHEET_THRESHOLDS = {
  fachSchwellePunkte: 25,
  fachMaxPunkte: 75,
  dgpCognitiveSchwellePct: 60,
  sprachSchwellePct: 50,
  tsuSchwellePct: 80
}

/** Goal shown on the Prüfungssimulation progress bar ("N / 100 Versuchen absolviert"). */
export const SIMULATION_GOAL_ATTEMPTS = 100
