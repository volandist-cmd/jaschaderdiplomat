import { useQuizStore } from '@/domain/stores/quiz-store'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule, loadQuizSet } from '@/data/loader'
import type { QuizItem, QuizState, Attempt, ErrorEntry } from '@/domain/models/types'
import { shuffleArray } from '@/infrastructure/utils/random'
import { LETTERS } from '@/domain/models/constants'

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

/** Non-repeating random set picker — mirrors the original's pickAWSet() shuffled queue. */
export function pickRunSetId(moduleId: string, setKeys: string[]): string {
  const appStore = useAppStore()
  const queueKey = `_runQueue_${moduleId}`
  let queue: string[] = appStore.state[queueKey]
  if (!Array.isArray(queue) || queue.length === 0) {
    queue = shuffleArray(setKeys)
  }
  const next = queue.shift() as string
  appStore.state[queueKey] = queue
  return next
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
    finished: false,
    fullrun: !!fullrun
  }

  quizStore.setQuiz(quiz)
  appStore.navigate('quiz', { id: moduleId })
}

/** Compares chosen vs. correct answer across single-choice, multi-select and free-text items. */
export function isItemCorrect(item: QuizItem, answer: number | number[] | string | undefined): boolean {
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
    if (/^-?\d+(,\d+)?$/.test(a) && /^-?\d+(,\d+)?$/.test(b)) {
      const na = parseFloat(a.replace(',', '.'))
      const nb = parseFloat(b.replace(',', '.'))
      return Math.abs(na - nb) < 1e-9
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
