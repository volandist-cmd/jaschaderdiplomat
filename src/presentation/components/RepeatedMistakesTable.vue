<template>
  <div v-if="!repeats.length" class="small muted" style="padding:16px">
    Bisher keine Frage mehrfach falsch beantwortet — gut gelernt!
  </div>
  <table v-else class="tbl">
    <thead>
      <tr><th>Kategorie</th><th>Typ</th><th>Frage</th><th class="num">falsch</th><th>zuletzt am</th><th>richtige Antwort</th><th></th></tr>
    </thead>
    <tbody>
      <tr v-for="(r, i) in repeats.slice(0, 25)" :key="i">
        <td>{{ r.moduleName }}</td>
        <td class="muted">{{ r.cat || '–' }}</td>
        <td style="max-width:320px">{{ r.q }}</td>
        <td class="num"><span class="badge red">{{ r.n }}×</span></td>
        <td class="muted">{{ tsDate(r.lastTs) }}</td>
        <td class="small" style="color:var(--green)">{{ r.correct }}</td>
        <td style="white-space:nowrap">
          <button v-if="focusEligible(r.module, r.cat)" class="btn btn-ghost btn-sm" title="Übungsset zu diesem Aufgabentyp starten" @click="startFocus(r.module, r.cat)">🎯 Üben</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { repeatedMistakes } from '@/services/progress-analytics'
import { startFocusQuiz } from '@/services/quiz-engine'

const appStore = useAppStore()
const repeats = computed(() => repeatedMistakes(appStore.state.errorLog))

function tsDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE')
}
function focusEligible(mod: string, cat: string): boolean {
  if (mod === 'tsu') return false
  if (cat === 'Textverständnis') return false
  return true
}
async function startFocus(mod: string, cat: string) {
  await startFocusQuiz(mod, cat)
}
</script>
