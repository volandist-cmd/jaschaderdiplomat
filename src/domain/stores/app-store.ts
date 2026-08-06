// Pinia Store for App State
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppState } from '../models/types'
import { storage } from '@/infrastructure/storage/storage-service'
import { CONFIG } from '../models/constants'
import { router } from '@/infrastructure/router/router'

export const useAppStore = defineStore('app', () => {
  // State
  const state = ref<AppState>({
    view: 'dashboard',
    params: {},
    attempts: [],
    errorLog: [],
    subtypeStats: {},
    guruAnalysis: null,
    guruMeta: null,
    subtypeGuru: {},
    guruChat: [],
    readinessCheck: null,
    readinessMeta: null,
    studyPlan: null,
    studyPlanMeta: null,
    essays: [],
    notes: '',
    apiKey: null,
    _apiKeyEditing: false,
    _lastBackupAt: null,
    examDate: CONFIG.examDateDefault,
    fullrun: null,
    sims: []
  })

  // These views only render correctly with live, in-memory state (the active quiz in
  // quiz-store, the active queue in fullrun-store) that is intentionally never persisted to
  // localStorage. Restoring `state.view` to one of these straight from a page reload leaves
  // that backing state empty/null, and several of these views have no fallback for that beyond
  // an unconditional `v-else` spinner - the page gets permanently stuck on a loading indicator
  // with no way to navigate out except the sidebar. Found via a real user report ("app doesn't
  // load after Cmd+Shift+R, static loading sign, sidebar still shows") - reproducible any time
  // a reload happens while `state.view` was last saved as one of these.
  const SESSION_ONLY_VIEWS = new Set(['quiz', 'results', 'fullrun', 'dgptest', 'scoresheet', 'tsu', 'analyse'])

  // The exam date default was wrong ('2025-09-10', already in the past) until 2026-08-08 -
  // anyone who opened the app before that has it baked into their saved state, so fixing
  // CONFIG.examDateDefault alone doesn't reach existing users. One-time migration: if the
  // restored date is exactly the old wrong default, replace it with the corrected one. There is
  // no UI to set a custom exam date, so this value can only ever be the shipped default.
  const STALE_EXAM_DATE_DEFAULT = '2025-09-10'

  // Actions
  function init() {
    // Load state from localStorage
    const saved = storage.get<Partial<AppState>>('state')
    if (saved) {
      Object.assign(state.value, saved)
      if (SESSION_ONLY_VIEWS.has(state.value.view)) {
        state.value.view = 'dashboard'
        state.value.params = {}
      }
      if (state.value.examDate === STALE_EXAM_DATE_DEFAULT) {
        state.value.examDate = CONFIG.examDateDefault
      }
    }

    // Auto-save every 30 seconds
    setInterval(() => {
      saveState()
    }, CONFIG.autoSaveInterval)
  }

  function saveState() {
    storage.set('state', state.value)
  }

  function cleanup() {
    saveState()
  }

  function navigate(view: string, params: Record<string, any> = {}) {
    router.navigate(view, params)
    state.value.view = view
    state.value.params = params
  }

  // Ported from the original's saveApiKeyFromPanel()/clearApiKey() - saved immediately rather
  // than waiting for the 30s autosave, since losing a freshly-entered key to a tab close would
  // be a bad first impression of the AI features.
  function setApiKey(key: string) {
    state.value.apiKey = key.trim() || null
    state.value._apiKeyEditing = false
    saveState()
  }

  function clearApiKey() {
    state.value.apiKey = null
    state.value._apiKeyEditing = false
    saveState()
  }

  return {
    state,
    router, // Expose router instance
    init,
    saveState,
    cleanup,
    navigate,
    setApiKey,
    clearApiKey
  }
})
