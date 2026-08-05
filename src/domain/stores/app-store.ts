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
    essays: [],
    notes: '',
    apiKey: null,
    _apiKeyEditing: false,
    _lastBackupAt: null,
    examDate: CONFIG.examDateDefault
  })

  // Actions
  function init() {
    // Load state from localStorage
    const saved = storage.get<Partial<AppState>>('state')
    if (saved) {
      Object.assign(state.value, saved)
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

  return {
    state,
    router, // Expose router instance
    init,
    saveState,
    cleanup,
    navigate
  }
})
