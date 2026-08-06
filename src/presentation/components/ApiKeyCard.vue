<template>
  <div class="card pad" style="margin-bottom:26px">
    <template v-if="appStore.state._apiKeyEditing">
      <div style="font-weight:600;margin-bottom:6px">Google-Gemini-API-Schlüssel</div>
      <div class="small muted" style="margin-bottom:10px">
        Kostenloser Google-Gemini-API-Schlüssel für die KI-Funktionen (Guru-Analyse, Prüfungsreife,
        Lernplan, Feedback zur Politischen Analyse) – aus
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--navy);font-weight:600">Google AI Studio</a>,
        kein Zahlungsmittel nötig. Wird ausschließlich lokal in diesem Browser gespeichert und nur direkt an Google gesendet.
      </div>
      <div class="btn-row">
        <input
          ref="inputEl"
          v-model="draft"
          type="password"
          class="field"
          style="max-width:420px"
          placeholder="AIza…"
          autocomplete="off"
          @keydown.enter.prevent="save"
          @keydown.escape="cancel"
        />
        <button class="btn btn-primary btn-sm" @click="save">Speichern</button>
        <button class="btn btn-ghost btn-sm" @click="cancel">Abbrechen</button>
        <button v-if="appStore.state.apiKey" class="btn btn-ghost btn-sm" style="color:var(--red)" @click="clear">Entfernen</button>
      </div>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'

const appStore = useAppStore()
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

function open() {
  draft.value = appStore.state.apiKey || ''
  appStore.state._apiKeyEditing = true
  nextTick(() => inputEl.value?.focus())
}
function save() {
  appStore.setApiKey(draft.value)
}
function cancel() {
  appStore.state._apiKeyEditing = false
}
function clear() {
  appStore.clearApiKey()
}
</script>
