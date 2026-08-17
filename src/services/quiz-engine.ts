import { useQuizStore } from '@/domain/stores/quiz-store'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule, loadQuizSet } from '@/data/loader'
import type { QuizItem, QuizState, Attempt, ErrorEntry } from '@/domain/models/types'
import { shuffleArray } from '@/infrastructure/utils/random'
import { LETTERS, NAMED_SET_MODULES } from '@/domain/models/constants'

/**
 * Quiz Engine - Core quiz logic
 * Ported from the original app's startQuiz()/finishQuiz()/isItemCorrect().
 */

export interface StartQuizOptions {
  moduleId: string
  setId: string
  mode: 'uebung' | 'pruefung'
  /** Marks this quiz as one step of a DGP-Testabschnitt/Fullrun/Simulation queue — finishQuiz() reports back to the queue instead of navigating to the standalone results view. */
  fullrun?: boolean
  /** Ported from the original's maybeShuffle(): randomizes item order and each item's answer-option order. Used for Fachtest/Sprachtest/TSU legs of a Prüfungssimulation run — never for DGP legs. */
  shuffle?: boolean
}

/**
 * Ported from the original's shuffleArr()+maybeShuffle(). Multi-select items are left
 * untouched: the original only remaps the single-answer index `a`, not the `aset` array,
 * so shuffling a multi-select item's options would silently desync its correct-answer set.
 * (Never actually reachable in the original either — shuffle is only ever requested for
 * Fachtest/Sprachtest/TSU legs, which have no multi-select items — but guarded here anyway.)
 */
function maybeShuffle(items: QuizItem[]): QuizItem[] {
  const hasPassage = items.some((it) => it.passage)
  const mapped = items.map((it) => {
    if (!it.o || it.multi) return it
    const idxs = shuffleArray(it.o.map((_, i) => i))
    return { ...it, o: idxs.map((i) => it.o![i]), a: idxs.indexOf(it.a) }
  })
  return hasPassage ? mapped : shuffleArray(mapped)
}

/** Ein Testlauf-Satz des Rotationspools ("run1".."run35"). Benannte Sätze (Jahrgänge wie "2019", "muster") gehören nie dazu. */
const RUN_SET_ID = /^run\d+$/

export function isRunSetId(setId: string | undefined | null): boolean {
  return !!setId && RUN_SET_ID.test(setId)
}

/**
 * Die Sätze, die in der Rotation „nächster Testlauf" stehen — Testlauf-Sätze aufsteigend nach
 * Nummer (run2 vor run10, nicht lexikografisch), danach sonstige Trainingssätze in Dateireihenfolge
 * (z. B. dgpmath `ref1`..`ref6`, die schon vor dieser Änderung mitrotiert haben).
 *
 * Nie Teil der Rotation: `muster` (offizieller Musteraufgaben-Satz) und bei Modulen mit benannten
 * Sätzen (Fachtests `2019`/`2023`) deren Jahrgangssätze — beide bleiben nur über ihre eigene
 * Startaktion erreichbar, damit ein Prüfungsjahrgang nicht unangekündigt als Training erscheint.
 */
export function rotationSetKeys(moduleId: string, setKeys: string[]): string[] {
  const hasNamedSets = (NAMED_SET_MODULES as readonly string[]).includes(moduleId)
  const pool = setKeys.filter((k) => k !== 'muster' && !(hasNamedSets && !isRunSetId(k)))
  const runs = pool.filter(isRunSetId).sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10))
  return [...runs, ...pool.filter((k) => !isRunSetId(k))]
}

/**
 * Zählt je Testlauf-Satz die abgeschlossenen Versuche. Ein Satz gilt als „absolviert",
 * sobald finishQuiz() dafür einen Versuch protokolliert hat — nicht schon beim Starten.
 * Damit ist ein abgebrochener Lauf nicht verbraucht, und die Fortschrittsanzeige
 * ("N von 35 absolviert") und die Auswahl des nächsten Laufs stützen sich auf dieselbe,
 * ohnehin persistierte Quelle (`state.attempts`) statt auf einen zweiten Zähler, der
 * mit ihr auseinanderlaufen könnte. Übungs- und Prüfungsmodus teilen sich einen Pool
 * (CLAUDE.md „General Rules" Nr. 8: bereits beantwortete Fragen dürfen im nächsten
 * Test ODER Training nicht wieder erscheinen).
 */
export function runSetAttemptCounts(moduleId: string, setKeys: string[]): Record<string, number> {
  const appStore = useAppStore()
  const counts: Record<string, number> = {}
  for (const key of rotationSetKeys(moduleId, setKeys)) counts[key] = 0
  for (const a of appStore.state.attempts) {
    if (a.module === moduleId && counts[a.setId] != null) counts[a.setId]++
  }
  return counts
}

export interface RunProgress {
  total: number
  done: number
  /** Der Satz, der beim nächsten Start gezogen wird — `null`, wenn das Modul keinen Testlauf-Pool hat. */
  next: string | null
  /** Alle gleichrangigen Kandidaten (die am seltensten abgeschlossenen Läufe); `next` ist der erste davon. */
  candidates: string[]
  /** Vollständige Runde absolviert: jeder Testlauf wurde mindestens einmal abgeschlossen, die Rotation beginnt erneut. */
  cycleComplete: boolean
}

/**
 * Fortschritt im Testlauf-Pool eines Moduls: wie viele Läufe abgeschlossen sind und welcher als
 * nächster ansteht. Bewusst deterministisch und nebenwirkungsfrei — die Funktion läuft im
 * Landing-View innerhalb eines `computed`, das bei jeder Zustandsänderung neu ausgewertet wird;
 * ein Zufallszug an dieser Stelle würde bei jedem Rendern eine andere Nummer anzeigen als die,
 * die der Klick dann startet.
 */
export function runProgress(moduleId: string, setKeys: string[]): RunProgress {
  const keys = rotationSetKeys(moduleId, setKeys)
  if (!keys.length) return { total: 0, done: 0, next: null, candidates: [], cycleComplete: false }
  const counts = runSetAttemptCounts(moduleId, setKeys)
  const done = keys.filter((k) => counts[k] > 0).length
  const min = Math.min(...keys.map((k) => counts[k]))
  const candidates = keys.filter((k) => counts[k] === min)
  return { total: keys.length, done, next: candidates[0], candidates, cycleComplete: min > 0 }
}

/**
 * Zieht den nächsten Testlauf eines Moduls: den am seltensten abgeschlossenen, also
 * zuerst jeden noch nie beendeten. Ist eine Runde vollständig, beginnt die Rotation
 * von vorn (statt das Modul zu sperren) — dann wieder beim am seltensten geübten Lauf.
 *
 * `sequential` (aus `ModuleData.runOrder`) bestimmt, wie unter gleichrangigen Kandidaten gewählt
 * wird: aufsteigend nach Nummer (Fachtest Recht — 35 kuratierte Läufe, Abfolge nachvollziehbar und
 * vorab anzeigbar) oder zufällig (DGP-/Sprachtest-Pools mit 50 gleichartigen Läufen).
 *
 * Ersetzt die frühere, beim START verbrauchte Warteschlange `_runQueue_<id>`: die hat einen
 * Testlauf schon durch reines Öffnen aufgebraucht, auch wenn der Durchgang abgebrochen wurde.
 * Alte `_runQueue_*`-Einträge in localStorage werden nicht mehr gelesen und bleiben wirkungslos.
 *
 * `muster` (offizieller Musteraufgaben-Satz) und benannte Jahrgangssätze ("2019") sind nie Teil
 * der Rotation — sie bleiben nur über ihre eigene Startaktion erreichbar.
 */
export function pickRunSetId(moduleId: string, setKeys: string[], sequential = false): string {
  const { next, candidates } = runProgress(moduleId, setKeys)
  if (next) return sequential ? next : shuffleArray(candidates)[0]
  // Modul ohne Testlauf-Pool (nur benannte Sätze): Rückfall auf den ersten nicht reservierten Satz.
  const fallback = setKeys.filter((k) => k !== 'muster')
  return (fallback.length ? fallback : setKeys)[0]
}

export async function startQuiz(options: StartQuizOptions): Promise<void> {
  const { moduleId, setId, mode, fullrun, shuffle } = options

  const quizStore = useQuizStore()
  const appStore = useAppStore()

  const mod = await loadModule(moduleId)
  const set = await loadQuizSet(moduleId, setId)
  let items: QuizItem[] = set.items.map((item) => ({ ...item }))
  if (shuffle) items = maybeShuffle(items)

  const totalPts = items.reduce((sum, it) => sum + (it.pts || 1), 0)
  const durationSec = mod.secPerItem
    ? mod.count! * mod.secPerItem
    : mod.totalSec
      ? mod.totalSec
      : (mod.durationMin || 10) * 60

  const quiz: QuizState = {
    kind: 'quiz',
    id: moduleId,
    setId,
    mode,
    items,
    answers: {},
    marked: {},
    checked: {},
    idx: 0,
    statement: !!set.statement,
    totalPts,
    qTime: {},
    _tStart: Date.now(),
    durationSec,
    timeLeft: durationSec,
    deadlineTs: Date.now() + durationSec * 1000,
    finished: false,
    fullrun: !!fullrun
  }

  quizStore.setQuiz(quiz)
  appStore.navigate('quiz', { id: moduleId })
}

/**
 * Fokus-Training: ported from the original's collectItemsBySubtype()/startFocusTraining().
 * Pulls every item tagged with `cat` across ALL of a module's sets (not just one run), shuffles,
 * and launches an ad-hoc quiz with up to 20 of them - a one-click "give me fresh questions from
 * exactly this weak subtype" action from the Guru's repeated-mistakes/weakest-subtypes lists.
 */
export async function startFocusQuiz(moduleId: string, cat: string): Promise<boolean> {
  const quizStore = useQuizStore()
  const appStore = useAppStore()

  const mod = await loadModule(moduleId)
  if (!mod.sets) return false
  const pool: QuizItem[] = []
  for (const setKey of Object.keys(mod.sets)) {
    for (const item of mod.sets[setKey].items) {
      if ((item.cat || '(allgemein)') === cat) pool.push(item)
    }
  }
  if (!pool.length) return false

  const items = shuffleArray(pool.map((it) => ({ ...it }))).slice(0, Math.min(20, pool.length))
  const totalPts = items.reduce((sum, it) => sum + (it.pts || 1), 0)
  const durationSec = items.length * 30

  const quiz: QuizState = {
    kind: 'quiz',
    id: moduleId,
    setId: `fokus:${cat}`,
    mode: 'uebung',
    items,
    answers: {},
    marked: {},
    checked: {},
    idx: 0,
    statement: false,
    totalPts,
    qTime: {},
    _tStart: Date.now(),
    durationSec,
    timeLeft: durationSec,
    deadlineTs: Date.now() + durationSec * 1000,
    finished: false,
    fullrun: false
  }

  quizStore.setQuiz(quiz)
  appStore.navigate('quiz', { id: moduleId })
  return true
}

/** Compares chosen vs. correct answer across single-choice, multi-select and free-text items. */
export function isItemCorrect(item: QuizItem, answer: number | number[] | string | undefined): boolean {
  if (item.dual) {
    return Array.isArray(answer) && answer.length === 2 && answer[0] === item.aLeft && answer[1] === item.aRight
  }
  if (item.multi) {
    const a = Array.isArray(answer) ? [...answer].sort((x, y) => x - y) : []
    const b = [...(item.aset || [])].sort((x, y) => x - y)
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  if (item.o) {
    return answer === item.a
  }
  if (item.answer != null) {
    const norm = (s: unknown) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/\./g, ',')
        .replace(/,+/g, ',')
    const a = norm(answer)
    const b = norm(item.answer)
    if (a === b) return true

    /*
     * Numerischer Vergleich in deutscher Schreibweise. Zwei Punkte, die vorher fehlten und
     * korrekte Eingaben als falsch bewertet haben (gefunden beim DGP-Mathematik-Neuaufbau
     * 2026-08-10, siehe Solutions/17 DGP-Mathematik):
     *  1. Tausenderpunkte: „3.725,00" wurde durch norm() zu „3,725,00" und fiel damit aus dem
     *     Zahlenmuster heraus - die Eingabe galt als falsch, obwohl sie richtig war.
     *  2. Rundung: bei einer auf zwei Stellen gerundeten Musterlösung (z. B. 62,67 für 62 2/3)
     *     muss auch der unaufgerundete Wert zählen, sonst bestraft die Bewertung eine
     *     mathematisch einwandfreie Antwort.
     */
    const parseDe = (s: string): number | null => {
      // Deutsche Gruppierung (1.234.567,89) - Punkte sind Tausendertrenner, kein Dezimalpunkt.
      const grouped = String(s).replace(/\s/g, '')
      const de = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(grouped)
        ? grouped.replace(/\./g, '')
        : grouped
      const plain = de.replace(/\./g, ',')
      if (!/^-?\d+(,\d+)?$/.test(plain)) return null
      return parseFloat(plain.replace(',', '.'))
    }
    const na = parseDe(String(answer ?? ''))
    const nb = parseDe(String(item.answer))
    if (na != null && nb != null) {
      const dez = (String(item.answer).split(/[.,]/)[1] || '').length
      // Halbe Einheit der letzten ausgewiesenen Dezimalstelle als Toleranz; bei ganzzahliger
      // Musterlösung bleibt es beim exakten Vergleich.
      const tol = dez > 0 ? 0.5 * Math.pow(10, -dez) : 1e-9
      return Math.abs(na - nb) < tol + 1e-12
    }
    return false
  }
  return false
}

function extractAnswerTexts(item: QuizItem, answer: number | number[] | string | undefined) {
  if (item.multi) {
    const aset = item.aset || []
    const correct = aset.length
      ? [...aset].sort((a, b) => a - b).map((x) => `${LETTERS[x]} — ${item.o![x]}`).join('; ')
      : 'keiner der Schlüsse'
    const chosen = Array.isArray(answer) && answer.length
      ? [...answer].sort((a, b) => a - b).map((x) => LETTERS[x]).join(', ')
      : null
    return { correct, chosen }
  }
  if (!item.o) {
    return {
      correct: String(item.answer),
      chosen: answer != null && String(answer).trim() !== '' ? String(answer) : null
    }
  }
  return {
    correct: `${LETTERS[item.a]} — ${item.o[item.a]}`,
    chosen: typeof answer === 'number' ? `${LETTERS[answer]} — ${item.o[answer]}` : null
  }
}

export function submitAnswer(questionIdx: number, answer: number | number[] | string): void {
  const quizStore = useQuizStore()
  quizStore.submitAnswer(questionIdx, answer)
}

export async function finishQuiz(): Promise<void> {
  const quizStore = useQuizStore()
  const appStore = useAppStore()
  const quiz = quizStore.quiz
  if (!quiz || quiz.finished) return

  quizStore.accrueQuestionTime()
  quiz.finished = true

  let earned = 0
  let correct = 0
  quiz.items.forEach((item, idx) => {
    if (isItemCorrect(item, quiz.answers[idx])) {
      earned += item.pts || 1
      correct++
    }
  })

  const totalSec = Object.values(quiz.qTime).reduce((s, t) => s + t, 0)
  const secAvg = quiz.items.length ? totalSec / quiz.items.length : 0
  const pct = quiz.totalPts ? Math.round((earned / quiz.totalPts) * 100) : 0

  quiz.result = {
    earned,
    total: quiz.totalPts,
    correct,
    count: quiz.items.length,
    pct,
    timeUp: quiz.timeLeft <= 0,
    timeUsed: quiz.durationSec - quiz.timeLeft,
    secAvg,
    totalSec
  }

  recordAttempt(quiz, secAvg)
  logQuizErrors(quiz)

  appStore.saveState()

  if (quiz.fullrun) {
    // Dynamic import avoids a circular dependency: fullrun-engine.ts calls startQuiz() from
    // this module to launch each step, so it can't be imported statically at module scope here.
    const { recordFullrunStep } = await import('./fullrun-engine')
    await recordFullrunStep(quiz.id, { kind: 'quiz', pct: quiz.result.pct, earned: quiz.result.earned, total: quiz.result.total })
    return
  }
  appStore.navigate('results', { id: quiz.id })
}

function recordAttempt(quiz: QuizState, secAvg: number): void {
  const appStore = useAppStore()
  const r = quiz.result!
  const attempt: Attempt = {
    module: quiz.id,
    setId: quiz.setId,
    mode: quiz.mode,
    earned: r.earned,
    total: r.total,
    pct: r.pct,
    correct: r.correct,
    count: r.count,
    secAvg: Math.round(secAvg * 10) / 10,
    ts: Date.now()
  }
  appStore.state.attempts.push(attempt)
}

function bumpSubtype(moduleId: string, cat: string | undefined, wrong: boolean): void {
  const appStore = useAppStore()
  const key = `${moduleId}::${cat || '(allgemein)'}`
  const stats = appStore.state.subtypeStats
  if (!stats[key]) stats[key] = { seen: 0, wrong: 0 }
  stats[key].seen++
  if (wrong) stats[key].wrong++
}

function logQuizErrors(quiz: QuizState): void {
  const appStore = useAppStore()
  quiz.items.forEach((item, idx) => {
    const answer = quiz.answers[idx]
    const ok = isItemCorrect(item, answer)
    bumpSubtype(quiz.id, item.cat, !ok)
    if (ok) return
    const texts = extractAnswerTexts(item, answer)
    const entry: ErrorEntry = {
      ts: Date.now(),
      module: quiz.id,
      setId: quiz.setId,
      mode: quiz.mode,
      cat: item.cat || null,
      q: String(item.q || '').slice(0, 300),
      correct: texts.correct,
      chosen: texts.chosen,
      unanswered: texts.chosen == null
    }
    appStore.state.errorLog.push(entry)
  })
}
