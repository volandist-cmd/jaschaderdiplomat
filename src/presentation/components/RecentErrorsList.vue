<template>
  <div v-if="!recentErrors.length" class="small muted" style="padding:8px 0">Noch keine Fehler erfasst.</div>
  <div v-for="(err, i) in recentErrors" :key="i" class="card pad" style="margin-bottom:10px">
    <div class="tag">{{ modName(err.module) }}{{ err.cat ? ' · ' + err.cat : '' }} · {{ new Date(err.ts).toLocaleDateString('de-DE') }}</div>
    <div style="font-size:14px;font-weight:500;margin:6px 0">{{ err.q }}</div>
    <div class="small">
      <span style="color:var(--green)">Richtig: {{ err.correct }}</span>
      <span v-if="err.chosen" style="color:var(--red)"><br>Ihre Antwort: {{ err.chosen }}</span>
      <span v-else style="color:var(--faint)"><br>nicht beantwortet</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { MODULE_META } from '@/domain/models/constants'

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 30 })
const appStore = useAppStore()

const recentErrors = computed(() =>
  [...appStore.state.errorLog].sort((a, b) => b.ts - a.ts).slice(0, props.limit)
)

function modName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}
</script>
