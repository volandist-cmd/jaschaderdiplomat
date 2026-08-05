<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Notizen &amp; Analysen</h1>
      <p class="lede">Freie Notizen zur Prüfungsvorbereitung. Wird automatisch lokal gespeichert.</p>
    </div>
    <textarea v-model="notes" class="notes" placeholder="Ihre Notizen …" @input="onInput"></textarea>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" @click="save">Speichern</button>
      <span v-if="savedAt" class="small muted">Gespeichert {{ savedAt }}</span>
    </div>

    <div v-if="essays.length" class="sec-title" style="margin-top:32px">Gespeicherte Analysen (Politische Analyse)</div>
    <div v-for="(essay, i) in essays" :key="i" class="card pad" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">
        <strong>{{ essay.topic }}</strong>
        <span class="small muted">{{ new Date(essay.ts).toLocaleDateString('de-DE') }}</span>
      </div>
      <p class="small" style="white-space:pre-wrap;margin:0">{{ essay.text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'

const appStore = useAppStore()
const notes = ref(appStore.state.notes)
const essays = computed(() => appStore.state.essays)
const savedAt = ref('')

function onInput() {
  savedAt.value = ''
}

function save() {
  appStore.state.notes = notes.value
  appStore.saveState()
  savedAt.value = new Date().toLocaleTimeString('de-DE')
}
</script>
