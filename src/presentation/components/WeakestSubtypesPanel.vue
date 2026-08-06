<template>
  <div v-if="!weakest.length" class="small muted" style="padding:8px 0">
    Noch keine Unterkategorie mit ausreichend Daten (mind. 3 gesehene Aufgaben).
  </div>
  <div v-else>
    <div v-for="w in weakest" :key="w.module + w.cat" style="margin-bottom:6px">
      <div class="bar-row">
        <div class="bl">{{ w.moduleName }} · {{ w.cat }}</div>
        <div class="bar-track"><div class="bar-fill" :style="{ width: Math.max(w.rate, 4) + '%' }">{{ w.rate }}%</div></div>
        <div style="display:flex;gap:6px;flex:none">
          <button class="btn btn-ghost btn-sm" title="20 frische Aufgaben zu diesem Typ üben" @click="startFocus(w.module, w.cat)">🎯 Üben</button>
          <button v-if="apiKeySet" class="btn btn-ghost btn-sm" title="Kurzanalyse dieses Aufgabentyps" @click="toggleSubtypeGuru(w.module, w.cat)">
            {{ subtypeGuruOpen === w.module + '::' + w.cat ? '▾' : '▸' }} Guru
          </button>
        </div>
      </div>
      <div v-if="subtypeGuruOpen === w.module + '::' + w.cat" class="explain" style="margin:8px 0 0">
        <template v-if="subtypeGuruLoadingKey === w.module + '::' + w.cat">
          <span class="spinner dark"></span> Der Guru analysiert diesen Aufgabentyp …
        </template>
        <template v-else-if="subtypeGuruErrors[w.module + '::' + w.cat]">
          <span style="color:var(--red)">{{ subtypeGuruErrors[w.module + '::' + w.cat] }}</span>
        </template>
        <div v-else class="ai-out">{{ appStore.state.subtypeGuru[w.module + '::' + w.cat]?.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { weakestSubtypes } from '@/services/progress-analytics'
import { startFocusQuiz } from '@/services/quiz-engine'
import { callAI, aiErrorText, buildSubtypeGuruPrompt } from '@/services/ai-service'

const appStore = useAppStore()
const apiKeySet = computed(() => !!appStore.state.apiKey)
const weakest = computed(() => weakestSubtypes(appStore.state.subtypeStats, appStore.state.errorLog, 3).slice(0, 8))

async function startFocus(mod: string, cat: string) {
  await startFocusQuiz(mod, cat)
}

const subtypeGuruOpen = ref<string | null>(null)
const subtypeGuruLoadingKey = ref<string | null>(null)
const subtypeGuruErrors = ref<Record<string, string>>({})

async function toggleSubtypeGuru(mod: string, cat: string) {
  const key = `${mod}::${cat}`
  if (subtypeGuruOpen.value === key) { subtypeGuruOpen.value = null; return }
  subtypeGuruOpen.value = key
  if (appStore.state.subtypeGuru[key]?.text) return
  subtypeGuruLoadingKey.value = key
  delete subtypeGuruErrors.value[key]
  try {
    const text = await callAI(appStore.state.apiKey, buildSubtypeGuruPrompt(appStore.state, mod, cat))
    appStore.state.subtypeGuru[key] = { text, ts: Date.now() }
    appStore.saveState()
  } catch (e) {
    subtypeGuruErrors.value[key] = aiErrorText(e)
  }
  subtypeGuruLoadingKey.value = null
}
</script>
