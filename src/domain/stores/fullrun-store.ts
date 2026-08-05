// Pinia store for the DGP-Testabschnitt / Voller Durchlauf / Prüfungssimulation queue.
// Pure state only — the sequencing/scoring logic lives in services/fullrun-engine.ts
// (kept out of this store to avoid a circular import with quiz-engine.ts, which both
// launches quiz steps from the engine and reports results back into this store).
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FullrunQueueState, FullrunStep, FullrunStepResult } from '../models/types'

export const useFullrunStore = defineStore('fullrun', () => {
  const state = ref<FullrunQueueState | null>(null)

  const currentStep = computed<FullrunStep | null>(() => {
    if (!state.value || state.value.idx >= state.value.steps.length) return null
    return state.value.steps[state.value.idx]
  })
  const progressPct = computed(() => {
    if (!state.value || !state.value.steps.length) return 0
    return Math.round((state.value.idx / state.value.steps.length) * 100)
  })

  function start(steps: FullrunStep[], kind: FullrunQueueState['kind'], withAnalyse: boolean, skipped: string[], simN?: number) {
    state.value = {
      steps,
      idx: 0,
      results: {},
      done: false,
      kind,
      withAnalyse,
      simN,
      startedTs: Date.now(),
      skipped
    }
  }

  function recordResult(moduleId: string, result: FullrunStepResult) {
    if (!state.value) return
    state.value.results[moduleId] = result
    state.value.idx++
  }

  function finish() {
    if (!state.value) return
    state.value.done = true
  }

  function clear() {
    state.value = null
  }

  return { state, currentStep, progressPct, start, recordResult, finish, clear }
})
