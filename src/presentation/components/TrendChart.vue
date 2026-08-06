<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="trend-chart" preserveAspectRatio="none">
    <!-- horizontal gridlines at 0/50/100% -->
    <line v-for="g in [0, 50, 100]" :key="g" :x1="PAD_L" :x2="W - PAD_R" :y1="yFor(g)" :y2="yFor(g)" class="tc-grid" />
    <text v-for="g in [0, 50, 100]" :key="'l' + g" :x="PAD_L - 6" :y="yFor(g) + 3" class="tc-axis" text-anchor="end">{{ g }}</text>

    <path v-for="(seg, i) in segments" :key="i" :d="seg" class="tc-line" />
    <g v-for="(p, i) in points" :key="p.day">
      <circle v-if="p.avg != null" :cx="xFor(i)" :cy="yFor(p.avg)" r="3" class="tc-dot">
        <title>{{ formatDay(p.day) }}: {{ p.avg }}% ({{ p.n }} Durchlauf{{ p.n === 1 ? '' : 'e' }})</title>
      </circle>
    </g>

    <text v-for="i in labelIdxs" :key="'d' + i" :x="xFor(i)" :y="H - 4" class="tc-axis" text-anchor="middle">{{ formatDayShort(points[i].day) }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailyPoint } from '@/domain/models/types'

const props = defineProps<{ points: DailyPoint[] }>()

const W = 640
const H = 160
const PAD_L = 30
const PAD_R = 10
const PAD_T = 10
const PAD_B = 20

function xFor(i: number): number {
  const n = props.points.length
  if (n <= 1) return PAD_L
  return PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R)
}
function yFor(pct: number): number {
  const usable = H - PAD_T - PAD_B
  return PAD_T + usable - (pct / 100) * usable
}

const segments = computed(() => {
  const segs: string[] = []
  let current: string | null = null
  props.points.forEach((p, i) => {
    if (p.avg == null) {
      if (current) { segs.push(current); current = null }
      return
    }
    const cmd = current ? 'L' : 'M'
    current = (current || '') + `${cmd}${xFor(i)},${yFor(p.avg)} `
  })
  if (current) segs.push(current)
  return segs
})

const labelIdxs = computed(() => {
  const n = props.points.length
  if (n <= 1) return [0]
  const step = Math.max(1, Math.ceil(n / 6))
  const idxs: number[] = []
  for (let i = 0; i < n; i += step) idxs.push(i)
  if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1)
  return idxs
})

function formatDay(day: string): string {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })
}
function formatDayShort(day: string): string {
  const d = new Date(day + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
</script>
