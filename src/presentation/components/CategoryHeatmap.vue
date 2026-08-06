<template>
  <div class="heatmap">
    <div v-for="row in rows" :key="row.id" class="heatmap-row">
      <div class="hl">{{ row.name }}</div>
      <div class="heatmap-cells">
        <div
          v-for="cell in row.cells"
          :key="cell.day"
          class="heatmap-cell"
          :style="cellStyle(cell.avg)"
        >
          <title>{{ formatDay(cell.day) }}{{ cell.avg != null ? `: ${cell.avg}% (${cell.n} Durchlauf${cell.n === 1 ? '' : 'e'})` : ': nicht geübt' }}</title>
        </div>
      </div>
    </div>
    <div class="heatmap-legend">
      <span>wenig</span>
      <div class="heatmap-cell" :style="{ background: 'var(--line-2)' }"></div>
      <div class="heatmap-cell" :style="{ background: 'var(--red)' }"></div>
      <div class="heatmap-cell" :style="{ background: 'var(--gold)' }"></div>
      <div class="heatmap-cell" :style="{ background: 'var(--navy)' }"></div>
      <div class="heatmap-cell" :style="{ background: 'var(--green)' }"></div>
      <span>viel richtig</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryHeatmapRow } from '@/domain/models/types'
import { getBand } from '@/infrastructure/utils/format'

defineProps<{ rows: CategoryHeatmapRow[] }>()

const BAND_COLOR: Record<string, string> = {
  green: 'var(--green)',
  navy: 'var(--navy)',
  gold: 'var(--gold)',
  red: 'var(--red)'
}

function cellStyle(avg: number | null) {
  if (avg == null) return { background: 'var(--line-2)' }
  return { background: BAND_COLOR[getBand(avg).c] || 'var(--line-2)' }
}

function formatDay(day: string): string {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })
}
</script>
