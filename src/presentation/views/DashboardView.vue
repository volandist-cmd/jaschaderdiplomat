<template>
  <div class="dashboard">
    <div class="page-head">
      <div class="eyebrow">
        <span class="flagbar h"><i></i><i></i><i></i></span>
        Vorbereitung schriftliches Auswahlverfahren
      </div>
      <h1>Dashboard</h1>
      <p class="lede">
        Üben Sie alle Bestandteile der schriftlichen Prüfung des höheren Auswärtigen Dienstes unter realistischen
        Bedingungen.
      </p>
    </div>

    <div class="grid g-4" style="margin-bottom:26px">
      <div class="stat">
        <div class="k">Tage bis zur Prüfung</div>
        <div class="v">{{ daysLeft >= 0 ? daysLeft : '–' }}</div>
        <div class="sub">Termin: {{ formatDate(appStore.state.examDate) }}</div>
      </div>
      <div class="stat">
        <div class="k">Absolvierte Durchläufe</div>
        <div class="v">{{ totalAttempts }}</div>
        <div class="sub">über alle Prüfungsteile</div>
      </div>
      <div class="stat">
        <div class="k">Ø Trefferquote</div>
        <div class="v">{{ averageScore }}<small>%</small></div>
        <div class="sub">Mittel aller Auswertungen</div>
      </div>
      <div class="stat">
        <div class="k">Lernserie</div>
        <div class="v">{{ streak }}<small> Tag{{ streak === 1 ? '' : 'e' }}</small></div>
        <div class="sub">{{ streak > 0 ? 'in Folge geübt' : 'heute starten?' }}</div>
      </div>
    </div>

    <div class="sec-title"><span class="flagbar"><i></i><i></i><i></i></span>Prüfungsteile</div>
    <div class="grid g-3">
      <div
        v-for="m in moduleMeta"
        :key="m.id"
        class="mod-card"
        @click="goToModule(m.id)"
      >
        <div class="spine"><i></i><i></i><i></i></div>
        <h3>{{ moduleData[m.id]?.title || m.title }}</h3>
        <div class="mod-meta">{{ metaLine(m.id) }}</div>
        <div class="mod-desc">{{ moduleData[m.id]?.desc || '' }}</div>
        <div class="mod-foot">
          <div class="mini-prog"><i :style="{ width: (bestFor(m.id) || 0) + '%' }"></i></div>
          <span v-if="bestFor(m.id) != null" class="mod-best">Best {{ bestFor(m.id) }}%</span>
          <span v-else class="mod-best" style="color:var(--faint)">neu</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { formatDate, daysUntil } from '@/infrastructure/utils/format'
import { MODULE_META } from '@/domain/models/constants'
import type { ModuleData } from '@/domain/models/types'

const appStore = useAppStore()
const moduleMeta = MODULE_META
const moduleData = ref<Record<string, ModuleData>>({})

const totalAttempts = computed(() => appStore.state.attempts.length)
const averageScore = computed(() => {
  const attempts = appStore.state.attempts
  if (!attempts.length) return 0
  return Math.round(attempts.reduce((sum, a) => sum + a.pct, 0) / attempts.length)
})
const daysLeft = computed(() => daysUntil(appStore.state.examDate))
const streak = computed(() => {
  const attempts = appStore.state.attempts
  if (!attempts.length) return 0
  const DAY = 86400000
  const days = new Set(
    attempts.map((a) => {
      const d = new Date(a.ts)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let cursor = today.getTime()
  if (!days.has(cursor)) cursor -= DAY
  let count = 0
  while (days.has(cursor)) {
    count++
    cursor -= DAY
  }
  return count
})

function bestFor(id: string): number | null {
  const attempts = appStore.state.attempts.filter((a) => a.module === id)
  return attempts.length ? Math.round(Math.max(...attempts.map((a) => a.pct))) : null
}

function metaLine(id: string): string {
  const d = moduleData.value[id]
  if (!d) return ''
  if (d.scenarios) return `${d.attemptN} Szenarien · neu zusammengestellt`
  if (d.topics) return `${d.topics.length} Themen · ${d.durationMin} Min`
  // DGP-style modules: procedurally-flavored run pool, timed by count/secPerItem/totalSec
  if (d.count) {
    const secs = d.secPerItem ? d.count * d.secPerItem : d.totalSec
    const runs = d.sets ? Object.keys(d.sets).length : null
    return `${d.count} Aufgaben` + (secs ? ` · ${secs} Sek.` : '') + (runs ? ` · ${runs} Testläufe` : ' · neu generiert')
  }
  // Named-set modules (recht/geschichte/wirtschaft/englisch/russisch): fixed duration in minutes
  if (d.sets) {
    const keys = Object.keys(d.sets)
    const first = d.sets[keys[0]]
    return `${first.items.length} Fragen · ${d.durationMin} Min` + (keys.length > 1 ? ` · ${keys.length} Sätze` : '')
  }
  return ''
}

function goToModule(id: string) {
  appStore.navigate(id === 'analyse' || id === 'tsu' ? id : 'module', { id })
}

onMounted(async () => {
  const entries = await Promise.all(moduleMeta.map((m) => loadModule(m.id).then((d) => [m.id, d] as const)))
  moduleData.value = Object.fromEntries(entries)
})
</script>
