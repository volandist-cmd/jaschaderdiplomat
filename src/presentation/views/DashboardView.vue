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

    <ApiKeyCard />

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

    <div v-if="totalAttempts > 0" class="card pad" style="margin-bottom:26px">
      <div class="sec-title" style="margin-bottom:4px;font-size:16px">Entwicklung — letzte 3 Wochen</div>
      <div class="small muted" style="margin-bottom:10px">Ø Trefferquote über alle Prüfungsteile, pro Tag.</div>
      <TrendChart :points="trendPoints" />
    </div>

    <div v-if="heatmapRows.length" class="card pad" style="margin-bottom:26px">
      <div class="sec-title" style="margin-bottom:4px;font-size:16px">Trefferquote je Prüfungsteil und Tag</div>
      <div class="small muted" style="margin-bottom:14px">
        Die {{ heatmapRows.length }} zuletzt geübten Prüfungsteile, letzte 21 Tage.
      </div>
      <CategoryHeatmap :rows="heatmapRows" />
    </div>

    <div v-if="strengths.length || weaknesses.length" class="grid g-2" style="margin-bottom:26px">
      <div class="card pad">
        <div class="sec-title" style="margin-bottom:14px;font-size:16px">Stärken</div>
        <div class="bars">
          <div v-for="m in strengths" :key="m.id" class="bar-row">
            <div class="bl">{{ m.name }}<span v-if="isVolatile(m)" class="small muted" title="Schwankt stark zwischen Versuchen"> ⚡</span></div>
            <div class="bar-track"><div class="bar-fill good" :style="{ width: m.avg + '%' }">{{ m.avg }}%</div></div>
          </div>
        </div>
      </div>
      <div class="card pad">
        <div class="sec-title" style="margin-bottom:14px;font-size:16px">Schwächen</div>
        <div class="bars">
          <div v-for="m in weaknesses" :key="m.id" class="bar-row">
            <div class="bl">{{ m.name }}<span v-if="isVolatile(m)" class="small muted" title="Schwankt stark zwischen Versuchen"> ⚡</span></div>
            <div class="bar-track"><div class="bar-fill bad" :style="{ width: Math.max(m.avg || 0, 4) + '%' }">{{ m.avg }}%</div></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="paceIssues.length" class="card pad" style="margin-bottom:26px">
      <div class="sec-title" style="margin-bottom:4px;font-size:16px">Tempo oder Wissen?</div>
      <div class="small muted" style="margin-bottom:14px">
        Bei diesen Prüfungsteilen liegt die Schwäche vermutlich eher an folgendem:
      </div>
      <div class="list-clean">
        <div v-for="p in paceIssues" :key="p.id" class="next-step-row" style="cursor:default">
          <span>{{ p.name }}</span>
          <span class="small" :style="{ color: p.kind === 'tempo' ? '#7C5E16' : 'var(--red)' }">
            {{ p.kind === 'tempo' ? '⏱ vermutlich Zeitdruck' : '📖 vermutlich Wissenslücke' }} · Ø {{ p.avgPct }}%
          </span>
        </div>
      </div>
    </div>

    <div class="card pad" style="margin-bottom:26px">
      <div class="sec-title" style="margin-bottom:10px;font-size:16px">Wochenrückblick</div>
      <div v-if="!digest.attemptsThisWeek && !digest.attemptsLastWeek" class="small muted">
        Noch keine Daten für die letzten zwei Wochen.
      </div>
      <template v-else>
        <div style="display:flex;gap:28px;flex-wrap:wrap;margin-bottom:10px">
          <div>
            <div class="tag">Durchläufe diese Woche</div>
            <div style="font-family:var(--fs-mono);font-weight:600;font-size:18px">
              {{ digest.attemptsThisWeek }} <small class="muted" style="font-size:12px">(Vorwoche {{ digest.attemptsLastWeek }})</small>
            </div>
          </div>
          <div>
            <div class="tag">Ø Trefferquote diese Woche</div>
            <div style="font-family:var(--fs-mono);font-weight:600;font-size:18px">
              {{ digest.avgThisWeek ?? '–' }}<small style="font-size:12px">%</small>
              <small class="muted" style="font-size:12px"> (Vorwoche {{ digest.avgLastWeek ?? '–' }}%)</small>
            </div>
          </div>
        </div>
        <div v-if="digest.mostImproved" class="small" style="color:var(--green)">↑ größter Fortschritt: {{ digest.mostImproved.name }} ({{ digest.mostImproved.delta > 0 ? '+' : '' }}{{ digest.mostImproved.delta }} Punkte ggü. Vorwoche)</div>
        <div v-if="digest.mostDeclined" class="small" style="color:var(--red)">↓ größter Rückgang: {{ digest.mostDeclined.name }} ({{ digest.mostDeclined.delta }} Punkte ggü. Vorwoche)</div>
        <div v-if="digest.newlyPracticed.length" class="small muted">Neu diese Woche begonnen: {{ digest.newlyPracticed.join(', ') }}</div>
      </template>
    </div>

    <div class="card pad" style="margin-bottom:26px">
      <div class="sec-title" style="margin-bottom:10px;font-size:16px">Projizierte Prüfungssimulation</div>
      <template v-if="projectedSheet">
        <div class="small muted" style="margin-bottom:12px">
          Hochrechnung aus Ihren bisherigen Durchschnittswerten je Prüfungsteil — keine echte Simulation, sondern eine Momentaufnahme.
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:8px">
          <span class="badge" :class="projectedSheet.bestanden ? 'green' : 'red'">{{ projectedSheet.bestanden ? 'bestanden' : 'nicht bestanden' }}</span>
          <span class="tag">Gesamt {{ projectedSheet.gesamt }}%</span>
          <span v-if="projectedSheet.fachPct != null" class="tag">Fachtests {{ projectedSheet.fachPct }}%</span>
          <span v-if="projectedSheet.cogPct != null" class="tag">DGP {{ projectedSheet.cogPct }}%</span>
        </div>
        <div v-if="appStore.state.sims?.length" class="small muted">
          {{ appStore.state.sims.length }} echte Prüfungssimulation{{ appStore.state.sims.length === 1 ? '' : 'en' }} absolviert, letztes Ergebnis {{ appStore.state.sims[appStore.state.sims.length - 1].sheet.gesamt }}%.
        </div>
        <div v-else class="small muted">
          Noch keine echte Prüfungssimulation absolviert — <a href="#" @click.prevent="appStore.navigate('simulation')" style="color:var(--navy);font-weight:600">jetzt starten</a>.
        </div>
      </template>
      <div v-else class="small muted">Noch zu wenige Daten für eine Hochrechnung (mindestens 5 Prüfungsteile mit Ergebnissen nötig).</div>
    </div>

    <div class="sec-title"><span class="flagbar"><i></i><i></i><i></i></span>Auswertung je Prüfungsteil</div>
    <div class="card" style="overflow-x:auto;margin-bottom:26px"><AuswertungTable /></div>

    <template v-if="appStore.state.errorLog.length">
      <div class="sec-title">Schwächste Unterkategorien</div>
      <div style="margin-bottom:26px"><WeakestSubtypesPanel /></div>

      <GuruPanel />

      <div class="sec-title" style="margin-top:26px">Wiederholte Fehler</div>
      <div class="card" style="overflow-x:auto;margin-bottom:26px"><RepeatedMistakesTable /></div>

      <div class="sec-title">Letzte Fehler</div>
      <RecentErrorsList :limit="10" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { formatDate, daysUntil } from '@/infrastructure/utils/format'
import { MODULE_META, CONFIG, DGP_ONLY_MODULE_IDS } from '@/domain/models/constants'
import { computeScoresheet } from '@/services/fullrun-engine'
import {
  categoryStat,
  categoryVariance,
  dailyTrend,
  categoryDayHeatmap,
  paceInsights,
  weeklyDigest
} from '@/services/progress-analytics'
import type { ModuleData, Scoresheet, FullrunStepResult } from '@/domain/models/types'
import TrendChart from '@/presentation/components/TrendChart.vue'
import CategoryHeatmap from '@/presentation/components/CategoryHeatmap.vue'
import ApiKeyCard from '@/presentation/components/ApiKeyCard.vue'
import AuswertungTable from '@/presentation/components/AuswertungTable.vue'
import WeakestSubtypesPanel from '@/presentation/components/WeakestSubtypesPanel.vue'
import GuruPanel from '@/presentation/components/GuruPanel.vue'
import RepeatedMistakesTable from '@/presentation/components/RepeatedMistakesTable.vue'
import RecentErrorsList from '@/presentation/components/RecentErrorsList.vue'

const appStore = useAppStore()
const moduleMeta = MODULE_META
const moduleData = ref<Record<string, ModuleData>>({})
const projectedSheet = ref<Scoresheet | null>(null)

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
  variance: number | null
}

// Per-Prüfungsteil-Fortschritt über alle bewertbaren Module (CONFIG.STAT_MODS) - Grundlage für
// die Bereit-für-die-Prüfung-, Stärken/Schwächen- und Nächste-Schritte-Widgets unten.
const moduleProgress = computed<ModuleProgress[]>(() => {
  return CONFIG.STAT_MODS.map((id) => {
    const stat = categoryStat(appStore.state.attempts, id)
    const schwelle = moduleData.value[id]?.schwellePct ?? 60
    const variance = categoryVariance(appStore.state.attempts, id)
    return { id, name: stat.name, n: stat.n, avg: stat.avg, daysSince: stat.daysSince, schwelle, variance }
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

// A category is flagged "volatile" when its score swings by 20+ percentage points between
// attempts on average (stdev) - it needs a different remediation strategy than a category that's
// just steadily weak.
function isVolatile(m: ModuleProgress): boolean {
  return m.variance != null && m.variance >= 20
}

const trendPoints = computed(() => dailyTrend(appStore.state.attempts, 21))
const heatmapRows = computed(() => categoryDayHeatmap(appStore.state.attempts, 21, 12))
const paceIssues = computed(() => paceInsights(appStore.state.attempts, moduleData.value, CONFIG.STAT_MODS))
const digest = computed(() => weeklyDigest(appStore.state.attempts, CONFIG.STAT_MODS))

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

function goToModule(id: string) {
  appStore.navigate(id === 'analyse' || id === 'tsu' ? id : 'module', { id })
}

// "What would today's exam simulation look like" - reuses computeScoresheet() from the real
// Prüfungssimulation, fed with a synthetic FullrunStepResult per module built from that module's
// average pct/earned/total across all attempts, instead of one actual completed run.
async function buildProjectedSheet() {
  const ids: string[] = [...DGP_ONLY_MODULE_IDS, 'recht', 'wirtschaft', 'geschichte', 'englisch', 'englischv2', 'englischv3', 'russisch', 'tsu']
  const results: Record<string, FullrunStepResult> = {}
  for (const id of ids) {
    const all = appStore.state.attempts.filter((a) => a.module === id)
    if (!all.length) continue
    const avgPct = Math.round(all.reduce((s, a) => s + a.pct, 0) / all.length)
    const avgTotal = Math.round(all.reduce((s, a) => s + a.total, 0) / all.length)
    const avgEarned = Math.round((avgPct / 100) * avgTotal)
    results[id] = { kind: 'quiz', pct: avgPct, earned: avgEarned, total: avgTotal }
  }
  if (Object.keys(results).length < 5) { projectedSheet.value = null; return }
  projectedSheet.value = await computeScoresheet(results)
}

onMounted(async () => {
  const entries = await Promise.all(moduleMeta.map((m) => loadModule(m.id).then((d) => [m.id, d] as const)))
  moduleData.value = Object.fromEntries(entries)
  await buildProjectedSheet()
})
</script>
