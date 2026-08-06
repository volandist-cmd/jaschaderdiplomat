import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { QuizState } from '../models/types'

export const useQuizStore = defineStore('quiz', () => {
  const quiz = ref<QuizState | null>(null)

  const hasActiveQuiz = computed(() => quiz.value !== null)
  const currentQuestion = computed(() => {
    if (!quiz.value) return null
    return quiz.value.items[quiz.value.idx]
  })
  const progress = computed(() => {
    if (!quiz.value) return 0
    return Math.round((Object.keys(quiz.value.answers).length / quiz.value.items.length) * 100)
  })
  const isLastQuestion = computed(() => {
    if (!quiz.value) return false
    return quiz.value.idx >= quiz.value.items.length - 1
  })
  /** Übungsmodus reveals the explanation once the item has been answered (or explicitly checked). */
  const isRevealed = computed(() => {
    const q = quiz.value
    if (!q) return false
    if (q.finished) return true
    if (q.mode !== 'uebung') return false
    const item = q.items[q.idx]
    const isTextItem = !item.multi && !item.o && !item.dual
    if (item.multi || item.dual || isTextItem) return !!q.checked[q.idx]
    return q.answers[q.idx] != null
  })

  function setQuiz(newQuiz: QuizState | null) {
    quiz.value = newQuiz
  }

  function accrueQuestionTime() {
    const q = quiz.value
    if (!q || q.finished) return
    q.qTime[q.idx] = (q.qTime[q.idx] || 0) + (Date.now() - q._tStart) / 1000
    q._tStart = Date.now()
  }

  function submitAnswer(questionIdx: number, answer: number | number[] | string) {
    if (!quiz.value) return
    quiz.value.answers[questionIdx] = answer
  }

  function answerOptMulti(optionIdx: number) {
    const q = quiz.value
    if (!q || q.finished) return
    if (q.mode === 'uebung' && q.checked[q.idx]) return
    const item = q.items[q.idx]
    const noneIdx = item.o!.length - 1
    const current = Array.isArray(q.answers[q.idx]) ? [...(q.answers[q.idx] as number[])] : []
    let next: number[]
    if (optionIdx === noneIdx) {
      next = [noneIdx]
    } else {
      next = current.filter((x) => x !== noneIdx)
      const pos = next.indexOf(optionIdx)
      if (pos >= 0) next.splice(pos, 1)
      else next.push(optionIdx)
    }
    if (next.length === 0) delete q.answers[q.idx]
    else q.answers[q.idx] = next
  }

  function checkMulti() {
    const q = quiz.value
    if (!q) return
    const answer = q.answers[q.idx]
    if (Array.isArray(answer) && answer.length) q.checked[q.idx] = true
  }

  /** Two-blank "Wortgleichung" items: each side picked independently, stored as [left, right]. */
  function answerOptDual(side: 'left' | 'right', optionIdx: number) {
    const q = quiz.value
    if (!q || q.finished) return
    if (q.mode === 'uebung' && q.checked[q.idx]) return
    const current = Array.isArray(q.answers[q.idx]) ? [...(q.answers[q.idx] as number[])] : [-1, -1]
    if (side === 'left') current[0] = optionIdx
    else current[1] = optionIdx
    q.answers[q.idx] = current
  }

  function checkDual() {
    const q = quiz.value
    if (!q) return
    const answer = q.answers[q.idx]
    if (Array.isArray(answer) && answer[0] >= 0 && answer[1] >= 0) q.checked[q.idx] = true
  }

  function checkTextAnswer(value: string) {
    const q = quiz.value
    if (!q || q.finished || !value.trim()) return
    q.answers[q.idx] = value
    q.checked[q.idx] = true
  }

  function nextQuestion() {
    if (!quiz.value || quiz.value.finished) return
    if (quiz.value.idx < quiz.value.items.length - 1) {
      accrueQuestionTime()
      quiz.value.idx++
    }
  }

  function previousQuestion() {
    if (!quiz.value || quiz.value.idx === 0) return
    accrueQuestionTime()
    quiz.value.idx--
  }

  function goToQuestion(idx: number) {
    if (!quiz.value) return
    if (idx >= 0 && idx < quiz.value.items.length) {
      accrueQuestionTime()
      quiz.value.idx = idx
    }
  }

  function toggleMark() {
    if (!quiz.value) return
    const idx = quiz.value.idx
    quiz.value.marked[idx] = !quiz.value.marked[idx]
  }

  function clearQuiz() {
    quiz.value = null
  }

  return {
    quiz,
    hasActiveQuiz,
    currentQuestion,
    progress,
    isLastQuestion,
    isRevealed,
    setQuiz,
    submitAnswer,
    answerOptMulti,
    checkMulti,
    answerOptDual,
    checkDual,
    checkTextAnswer,
    accrueQuestionTime,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    toggleMark,
    clearQuiz
  }
})
