<template>
  <div class="card pad" style="margin-bottom:26px">
    <template v-if="appStore.state._apiKeyEditing">
      <div style="font-weight:600;margin-bottom:6px">Google-Gemini-API-Schlüssel</div>
      <div class="small muted" style="margin-bottom:10px">
        Kostenloser Google-Gemini-API-Schlüssel für die KI-Funktionen (Guru-Analyse, Prüfungsreife,
        Lernplan, Feedback zur Politischen Analyse) – aus
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--navy);font-weight:600">Google AI Studio</a>,
        kein Zahlungsmittel nötig. Wird ausschließlich lokal in diesem Browser gespeichert und nur direkt an Google gesendet.
        Für die tiefergehenden Analysen (Guru, Prüfungsreife, Lernplan) wird das gründlichere Pro-Modell verwendet, für schnelle Zwischenschritte (Rückfragen, Kurzanalysen) das schnellere Flash-Modell – beide im kostenlosen Kontingent, Pro mit einem strikteren Tageslimit.
      </div>
      <div class="btn-row">
        <input
          ref="inputEl"
          v-model="draft"
          type="text"
          class="field"
          style="max-width:420px;font-family:var(--fs-mono)"
          placeholder="AIza… (oder anderes Schlüsselformat)"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          @keydown.enter.prevent="save"
          @keydown.escape="cancel"
        />
        <button class="btn btn-primary btn-sm" @click="save">Speichern</button>
        <button class="btn btn-ghost btn-sm" @click="cancel">Abbrechen</button>
        <button v-if="appStore.state.apiKey" class="btn btn-ghost btn-sm" style="color:var(--red)" @click="clear">Entfernen</button>
      </div>
      <div v-if="saveError" class="small" style="color:var(--red);margin-top:8px">{{ saveError }}</div>
    </template>
    <template v-else>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <strong>KI-Zugang: </strong>
          <span :style="{ color: appStore.state.apiKey ? 'var(--green)' : 'var(--red)' }">
            {{ appStore.state.apiKey ? 'eingerichtet' : 'nicht eingerichtet' }}
          </span>
          <div v-if="!appStore.state.apiKey" class="small muted" style="margin-top:4px;max-width:520px">
            Ohne Schlüssel funktionieren Guru-Analyse, Prüfungsreife-Check, Lernplan und die KI-Bewertung der Politischen Analyse nicht — der Rest der App bleibt uneingeschränkt nutzbar.
          </div>
        </div>
        <button class="btn btn-sm" :class="appStore.state.apiKey ? 'btn-ghost' : 'btn-gold'" @click="open">
          {{ appStore.state.apiKey ? 'Ändern / entfernen' : 'API-Schlüssel eintragen' }}
        </button>
      </div>
      <div v-if="justSaved" class="small" style="color:var(--green);margin-top:8px">✓ Gespeichert ({{ appStore.state.apiKey?.slice(-6) }}).</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'

const appStore = useAppStore()
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const saveError = ref<string | null>(null)
const justSaved = ref(false)

function open() {
  draft.value = appStore.state.apiKey || ''
  saveError.value = null
  appStore.state._apiKeyEditing = true
  nextTick(() => inputEl.value?.focus())
}
function save() {
  saveError.value = null
  const key = draft.value.trim()
  if (!key) {
    saveError.value = 'Bitte zuerst einen Schlüssel eintragen.'
    return
  }
  try {
    appStore.setApiKey(key)
    justSaved.value = true
    setTimeout(() => { justSaved.value = false }, 4000)
  } catch (e) {
    // Should not happen (setApiKey does no I/O beyond localStorage), but surface it visibly
    // rather than silently doing nothing - a save button that appears to "not react" is exactly
    // the symptom an uncaught error here would produce.
    saveError.value = `Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`
  }
}
function cancel() {
  saveError.value = null
  appStore.state._apiKeyEditing = false
}
function clear() {
  appStore.clearApiKey()
}
</script>
