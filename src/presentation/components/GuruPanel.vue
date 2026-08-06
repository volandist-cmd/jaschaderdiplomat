<template>
  <div v-if="!appStore.state.apiKey" class="notice info">
    <span class="ni">✨</span>
    <div>
      <strong>KI-Guru verfügbar.</strong> Mit einem kostenlosen Gemini-API-Schlüssel wertet der Guru Ihre gesamten
      Leistungsdaten aus, erstellt eine Prüfungsreife-Einschätzung und einen Lernplan für die verbleibende Zeit.
      Weiter oben unter „KI-Zugang" einrichten.
    </div>
  </div>
  <template v-else>
    <div class="sec-title" style="font-size:16px;margin-bottom:10px">Guru-Analyse</div>
    <div class="card pad" style="margin-bottom:24px">
      <template v-if="guruLoading">
        <div class="center" style="padding:20px"><span class="spinner dark"></span><div class="muted" style="margin-top:10px">Der Guru wertet alle erfassten Fehler aus – das kann einen Moment dauern …</div></div>
      </template>
      <template v-else-if="appStore.state.guruAnalysis">
        <div class="small muted" style="margin-bottom:10px">
          Erstellt am {{ tsDate(appStore.state.guruMeta!.ts) }}
          <span v-if="newErrorsSinceGuru >= 15"> · {{ newErrorsSinceGuru }} neue Fehler seither — eine Aktualisierung könnte sich lohnen.</span>
        </div>
        <div class="ai-out">{{ appStore.state.guruAnalysis }}</div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-ghost btn-sm" @click="runGuruAnalysis">Neu erstellen</button>
          <button class="btn btn-quiet btn-sm" @click="copyGuruAnalysis">Kopieren</button>
        </div>
        <div style="margin-top:16px">
          <div v-for="(m, i) in appStore.state.guruChat" :key="i" class="explain" :class="m.role === 'user' ? '' : 'ok'" style="margin-bottom:8px">
            <h5>{{ m.role === 'user' ? 'Sie' : 'Guru' }}</h5>
            <div class="ai-out">{{ m.text }}</div>
          </div>
          <div v-if="guruChatLoading" class="small muted"><span class="spinner dark"></span> Guru antwortet …</div>
          <div class="btn-row" style="margin-top:10px">
            <input v-model="guruQuestion" class="field" style="max-width:420px" placeholder="Rückfrage an den Guru…" @keydown.enter.prevent="askGuru" />
            <button class="btn btn-ghost btn-sm" :disabled="guruChatLoading || !guruQuestion.trim()" @click="askGuru">Fragen</button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="small muted" style="margin-bottom:12px">
          Analysiert Ihre gesamten Leistungs- und Fehlerdaten: wiederkehrende Denkfehler, thematische Wissenslücken,
          wiederholte Fehler, die Übung-vs-Prüfung-Lücke, Ihre Entwicklung über die Zeit und einen priorisierten Lernplan.
        </div>
        <div v-if="guruError" class="small" style="color:var(--red);margin-bottom:10px">{{ guruError }}</div>
        <button class="btn btn-primary btn-sm" @click="runGuruAnalysis">Guru-Analyse erstellen</button>
      </template>
    </div>

    <div class="sec-title" style="font-size:16px;margin-bottom:10px">Prüfungsreife</div>
    <div class="card pad" style="margin-bottom:24px">
      <template v-if="readinessLoading">
        <div class="center" style="padding:20px"><span class="spinner dark"></span><div class="muted" style="margin-top:10px">Prüfungsreife wird eingeschätzt …</div></div>
      </template>
      <template v-else-if="appStore.state.readinessCheck">
        <div class="small muted" style="margin-bottom:10px">Erstellt am {{ tsDate(appStore.state.readinessMeta!.ts) }}</div>
        <div class="ai-out">{{ appStore.state.readinessCheck }}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:14px" @click="runReadinessCheck">Neu einschätzen</button>
      </template>
      <template v-else>
        <div class="small muted" style="margin-bottom:12px">Ehrliche Einschätzung, ob Sie aktuell prüfungsreif sind — kategorienweise gegen die jeweilige Bestehensschwelle, mit den größten Risikofeldern.</div>
        <div v-if="readinessError" class="small" style="color:var(--red);margin-bottom:10px">{{ readinessError }}</div>
        <button class="btn btn-primary btn-sm" @click="runReadinessCheck">Prüfungsreife einschätzen</button>
      </template>
    </div>

    <div class="sec-title" style="font-size:16px;margin-bottom:10px">Lernplan bis zur Prüfung</div>
    <div class="card pad">
      <template v-if="studyPlanLoading">
        <div class="center" style="padding:20px"><span class="spinner dark"></span><div class="muted" style="margin-top:10px">Lernplan wird erstellt …</div></div>
      </template>
      <template v-else-if="appStore.state.studyPlan">
        <div class="small muted" style="margin-bottom:10px">Erstellt am {{ tsDate(appStore.state.studyPlanMeta!.ts) }} · damals {{ daysLeft }} Tage bis zur Prüfung</div>
        <div class="ai-out">{{ appStore.state.studyPlan }}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:14px" @click="runStudyPlan">Neu erstellen</button>
      </template>
      <template v-else>
        <div class="small muted" style="margin-bottom:12px">Ein Tag-für-Tag- bzw. wochenweise gegliederter Lernplan für die verbleibenden {{ daysLeft }} Tage, priorisiert nach Ihren Schwachstellen.</div>
        <div v-if="studyPlanError" class="small" style="color:var(--red);margin-bottom:10px">{{ studyPlanError }}</div>
        <button class="btn btn-primary btn-sm" @click="runStudyPlan">Lernplan erstellen</button>
      </template>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { CONFIG } from '@/domain/models/constants'
import { loadModule } from '@/data/loader'
import { daysUntil } from '@/infrastructure/utils/format'
import { callAI, aiErrorText, buildGuruPrompt, buildReadinessPrompt, buildStudyPlanPrompt, buildGuruFollowupPrompt, GURU_SYSTEM_INSTRUCTION } from '@/services/ai-service'
import type { ModuleData } from '@/domain/models/types'

const appStore = useAppStore()
const moduleData = ref<Record<string, ModuleData>>({})
const daysLeft = computed(() => daysUntil(appStore.state.examDate))
const newErrorsSinceGuru = computed(() => appStore.state.guruMeta ? appStore.state.errorLog.length - appStore.state.guruMeta.errorCount : 0)

function tsDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE')
}
function schwellePctFor(id: string): number | null {
  return moduleData.value[id]?.schwellePct ?? null
}

// --- Guru-Hauptanalyse + Rückfragen ---
const guruLoading = ref(false)
const guruError = ref<string | null>(null)
const guruQuestion = ref('')
const guruChatLoading = ref(false)

async function runGuruAnalysis() {
  guruLoading.value = true
  guruError.value = null
  try {
    const text = await callAI(appStore.state.apiKey, buildGuruPrompt(appStore.state), { deep: true, systemInstruction: GURU_SYSTEM_INSTRUCTION })
    appStore.state.guruAnalysis = text
    appStore.state.guruMeta = { ts: Date.now(), errorCount: appStore.state.errorLog.length }
    appStore.saveState()
  } catch (e) {
    guruError.value = aiErrorText(e)
  }
  guruLoading.value = false
}

function copyGuruAnalysis() {
  if (!appStore.state.guruAnalysis) return
  navigator.clipboard?.writeText(appStore.state.guruAnalysis).catch(() => {})
}

async function askGuru() {
  const q = guruQuestion.value.trim()
  if (!q) return
  guruQuestion.value = ''
  appStore.state.guruChat.push({ role: 'user', text: q })
  guruChatLoading.value = true
  try {
    const answer = await callAI(appStore.state.apiKey, buildGuruFollowupPrompt(appStore.state, q), { systemInstruction: GURU_SYSTEM_INSTRUCTION })
    appStore.state.guruChat.push({ role: 'guru', text: answer })
  } catch (e) {
    appStore.state.guruChat.push({ role: 'guru', text: `(${aiErrorText(e)})` })
  }
  appStore.saveState()
  guruChatLoading.value = false
}

// --- Prüfungsreife ---
const readinessLoading = ref(false)
const readinessError = ref<string | null>(null)

async function runReadinessCheck() {
  readinessLoading.value = true
  readinessError.value = null
  try {
    const text = await callAI(appStore.state.apiKey, buildReadinessPrompt(appStore.state, schwellePctFor), { deep: true, systemInstruction: GURU_SYSTEM_INSTRUCTION })
    appStore.state.readinessCheck = text
    appStore.state.readinessMeta = { ts: Date.now(), errorCount: appStore.state.errorLog.length }
    appStore.saveState()
  } catch (e) {
    readinessError.value = aiErrorText(e)
  }
  readinessLoading.value = false
}

// --- Lernplan ---
const studyPlanLoading = ref(false)
const studyPlanError = ref<string | null>(null)

async function runStudyPlan() {
  studyPlanLoading.value = true
  studyPlanError.value = null
  try {
    const text = await callAI(appStore.state.apiKey, buildStudyPlanPrompt(appStore.state, daysLeft.value, schwellePctFor), { deep: true, systemInstruction: GURU_SYSTEM_INSTRUCTION })
    appStore.state.studyPlan = text
    appStore.state.studyPlanMeta = { ts: Date.now(), errorCount: appStore.state.errorLog.length }
    appStore.saveState()
  } catch (e) {
    studyPlanError.value = aiErrorText(e)
  }
  studyPlanLoading.value = false
}

onMounted(async () => {
  const entries = await Promise.all(CONFIG.STAT_MODS.map((id) => loadModule(id).then((d) => [id, d] as const)))
  moduleData.value = Object.fromEntries(entries)
})
</script>
