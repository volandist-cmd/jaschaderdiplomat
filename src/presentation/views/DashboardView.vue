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
        <div class="sub">Termin: {{ formatDate(appStore.state.examDate) }}<template v-if="phase"> · {{ phase }}</template></div>
      </div>
      <div class="stat">
        <div class="k">Absolvierte Durchläufe</div>
        <div class="v">{{ totalAttempts }}</div>
        <div class="sub">über alle Prüfungsteile</div>
      </div>
      <div class="stat">
        <div class="k">Ø Trefferquote</div>
        <div class="v">
          {{ averageScore }}<small>%</small>
          <small
            v-if="trend"
            :style="{ color: trend.dir === 'up' ? 'var(--green)' : trend.dir === 'down' ? 'var(--red)' : 'var(--faint)' }"
          >{{ trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→' }}</small>
        </div>
        <div class="sub">Übung {{ modeAvg.uebung ?? '–' }}% · Prüfung {{ modeAvg.pruefung ?? '–' }}%</div>
      </div>
      <div class="stat">
        <div class="k">Lernserie</div>
        <div class="v">{{ streak }}<small> Tag{{ streak === 1 ? '' : 'e' }}</small></div>
        <div class="sub">{{ streak > 0 ? 'in Folge geübt' : 'heute starten?' }}</div>
      </div>
    </div>

    <div class="grid g-2" style="margin-bottom:26px">
      <div class="card pad">
        <div class="sec-title" style="margin-bottom:10px;font-size:16px">Bereit für die Prüfung?</div>
        <div class="small muted" style="margin-bottom:14px">
          {{ readiness.erreicht }} von {{ readiness.total }} Prüfungsteilen erreichen bereits ihre eigene Bestehensschwelle.
        </div>
        <div style="display:flex;gap:4px;margin-bottom:14px;height:10px">
          <div class="readiness-seg" :style="{ flex: readiness.erreicht || 0.0001, background: 'var(--green)' }"></div>
          <div class="readiness-seg" :style="{ flex: readiness.inArbeit || 0.0001, background: 'var(--gold)' }"></div>
          <div class="readiness-seg" :style="{ flex: readiness.nichtBegonnen || 0.0001, background: 'var(--line-2)' }"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <span class="badge green">{{ readiness.erreicht }} erreicht</span>
          <span class="badge gold">{{ readiness.inArbeit }} in Arbeit</span>
          <span class="badge gray">{{ readiness.nichtBegonnen }} nicht begonnen</span>
        </div>
      </div>

      <div class="card pad">
        <div class="sec-title" style="margin-bottom:10px;font-size:16px">Empfehlung: Nächste Schritte</div>
        <div v-if="!nextSteps.length" class="small muted" style="padding:8px 0">
          Alle Prüfungsteile aktiv im Training — weiter so.
        </div>
        <div v-else class="list-clean">
          <div v-for="m in nextSteps" :key="m.id" class="next-step-row" @click="goToModule(m.id)">
            <span>{{ m.name }}</span>
            <span class="small muted">{{ m.n === 0 ? 'noch nicht geübt' : `seit ${m.daysSince} Tagen nicht geübt` }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="strengths.length || weaknesses.length" class="grid g-2" style="margin-bottom:26px">
      <div class="card pad">
        <div class="sec-title" style="margin-bottom:14px;font-size:16px">Stärken</div>
        <div class="bars">
          <div v-for="m in strengths" :key="m.id" class="bar-row">
            <div class="bl">{{ m.name }}</div>
            <div class="bar-track"><div class="bar-fill good" :style="{ width: m.avg + '%' }">{{ m.avg }}%</div></div>
          </div>
        </div>
      </div>
      <div class="card pad">
        <div class="sec-title" style="margin-bottom:14px;font-size:16px">Schwächen</div>
        <div class="bars">
          <div v-for="m in weaknesses" :key="m.id" class="bar-row">
            <div class="bl">{{ m.name }}</div>
            <div class="bar-track"><div class="bar-fill bad" :style="{ width: Math.max(m.avg || 0, 4) + '%' }">{{ m.avg }}%</div></div>
          </div>
        </div>
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
import { MODULE_META, CONFIG } from '@/domain/models/constants'
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

// Rough exam-prep phase label under the countdown - purely informational, no logic depends on it.
const phase = computed(() => {
  const d = daysLeft.value
  if (d < 0) return null
  if (d <= 7) return 'Zielgerade'
  if (d <= 30) return 'Endspurt'
  if (d <= 90) return 'Vertiefungsphase'
  return 'Grundlagenphase'
})

// Global Übungsmodus- vs Prüfungsmodus-Schnitt (CLAUDE.md "Statistik": beide getrennt zeigen).
const modeAvg = computed(() => {
  const avg = (list: typeof appStore.state.attempts) =>
    list.length ? Math.round(list.reduce((s, a) => s + a.pct, 0) / list.length) : null
  return {
    uebung: avg(appStore.state.attempts.filter((a) => a.mode === 'uebung')),
    pruefung: avg(appStore.state.attempts.filter((a) => a.mode === 'pruefung'))
  }
})

// Trend: average of the last 5 attempts vs. the 5 before that, across all modules combined.
const trend = computed(() => {
  const sorted = [...appStore.state.attempts].sort((a, b) => a.ts - b.ts)
  if (sorted.length < 6) return null
  const recent = sorted.slice(-5)
  const prior = sorted.slice(-10, -5)
  if (!prior.length) return null
  const avg = (list: typeof recent) => list.reduce((s, a) => s + a.pct, 0) / list.length
  const diff = Math.round(avg(recent) - avg(prior))
  if (diff >= 3) return { dir: 'up' as const, diff }
  if (diff <= -3) return { dir: 'down' as const, diff }
  return { dir: 'flat' as const, diff }
})

interface ModuleProgress {
  id: string
  name: string
  n: number
  avg: number | null
  daysSince: number | null
  schwelle: number
}

// Per-Prüfungsteil-Fortschritt über alle bewertbaren Module (CONFIG.STAT_MODS) - Grundlage für
// die Bereit-für-die-Prüfung-, Stärken/Schwächen- und Nächste-Schritte-Widgets unten.
const moduleProgress = computed<ModuleProgress[]>(() => {
  return CONFIG.STAT_MODS.map((id) => {
    const all = appStore.state.attempts.filter((a) => a.module === id)
    const schwelle = moduleData.value[id]?.schwellePct ?? 60
    if (!all.length) {
      return { id, name: modName(id), n: 0, avg: null, daysSince: null, schwelle }
    }
    const avg = Math.round(all.reduce((s, a) => s + a.pct, 0) / all.length)
    const lastTs = Math.max(...all.map((a) => a.ts))
    const daysSince = Math.floor((Date.now() - lastTs) / 86400000)
    return { id, name: modName(id), n: all.length, avg, daysSince, schwelle }
  })
})

const readiness = computed(() => {
  const list = moduleProgress.value
  return {
    erreicht: list.filter((m) => m.n > 0 && m.avg! >= m.schwelle).length,
    inArbeit: list.filter((m) => m.n > 0 && m.avg! < m.schwelle).length,
    nichtBegonnen: list.filter((m) => m.n === 0).length,
    total: list.length
  }
})

const STALE_DAYS = 10
const nextSteps = computed(() => {
  const list = moduleProgress.value
  const neverTried = list.filter((m) => m.n === 0)
  const stale = list
    .filter((m) => m.n > 0 && m.daysSince !== null && m.daysSince >= STALE_DAYS)
    .sort((a, b) => b.daysSince! - a.daysSince!)
  return [...neverTried, ...stale].slice(0, 6)
})

const rankedModules = computed(() =>
  moduleProgress.value.filter((m) => m.n >= 2).sort((a, b) => b.avg! - a.avg!)
)
const strengths = computed(() => rankedModules.value.slice(0, 3))
const weaknesses = computed(() => [...rankedModules.value].reverse().slice(0, 3))
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

function modName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}

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
