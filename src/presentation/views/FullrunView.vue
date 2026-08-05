<template>
  <div>
    <template v-if="showSummary">
      <div class="page-head">
        <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Gesamtprüfung</div>
        <h1>Ergebnis des Durchlaufs</h1>
        <p class="lede">Zusammenfassung aller Prüfungsteile dieses Durchlaufs.</p>
      </div>
      <div class="grid g-2" style="margin-bottom:22px">
        <div class="stat"><div class="k">Ø der bewerteten Teile</div><div class="v">{{ avg }}<small>%</small></div><div class="sub">Multiple-Choice & TsU</div></div>
        <div class="stat"><div class="k">Bewertete Teile</div><div class="v">{{ cnt }}</div><div class="sub">automatisch ausgewertet</div></div>
      </div>
      <div class="card" style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Prüfungsteil</th><th>Punkte</th><th>Ergebnis</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.name }}</td>
              <td class="num">{{ r.earned != null ? `${r.earned} / ${r.total}` : '–' }}</td>
              <td><span class="badge" :class="r.pct != null ? getBand(r.pct).c : 'gray'">{{ r.pct != null ? r.pct + ' %' : 'abgegeben' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="notice info" style="margin:18px 0"><span class="ni">ℹ︎</span><div>Einzelne Fragen können Sie über die jeweiligen Prüfungsteile noch einmal durchgehen.</div></div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="restart(true)">Neuer Durchlauf</button>
        <button class="btn btn-ghost" @click="appStore.navigate('auswertung')">Zur Auswertung</button>
        <button class="btn btn-ghost" @click="appStore.navigate('dashboard')">Dashboard</button>
      </div>
    </template>

    <template v-else>
      <div class="page-head">
        <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Gesamtprüfung</div>
        <h1>Voller Prüfungsdurchlauf</h1>
        <p class="lede">Alle Bestandteile nacheinander unter Zeitvorgabe in der Reihenfolge DGP (20 Unterkategorien), Fachtest Recht, Fachtest Wirtschaft, Fachtest Geschichte &amp; Politik, Englisch v1–v3, Russisch, Politische Analyse und TsU – so nah wie möglich am echten Prüfungstag. Zwischen den Teilen gibt es keine Pause; die Auswertung erscheint am Ende.</p>
      </div>
      <div class="card" style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>#</th><th>Prüfungsteil</th><th>Rahmen</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in introSteps" :key="s.id">
              <td class="num">{{ i + 1 }}</td>
              <td>{{ s.name }}<span v-if="isSkipped(s.id)" class="badge gray" style="margin-left:8px">noch nicht verfügbar</span></td>
              <td class="muted">{{ s.timing }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="notice info" style="margin:18px 0"><span class="ni">ℹ︎</span><div>Die Fachprüfungen laufen mit den Sätzen von 2019. Die politische Analyse (optional) läuft nur beim „vollständigen" Durchlauf mit; ohne KI-Bewertung in dieser Version zählt sie als abgegeben, aber unbewertet. Planen Sie für den vollständigen Durchlauf ausreichend ungestörte Zeit ein – im Prüfungsmodus läuft die Uhr.</div></div>
      <div class="btn-row">
        <button class="btn btn-primary btn-lg" @click="restart(true)">Vollständigen Durchlauf starten</button>
        <button class="btn btn-ghost btn-lg" @click="restart(false)">Ohne politische Analyse</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { useFullrunStore } from '@/domain/stores/fullrun-store'
import { startFullrunQueue } from '@/services/fullrun-engine'
import { loadModule } from '@/data/loader'
import { DGP_ONLY_MODULE_IDS, FULLRUN_TAIL_STEPS, MODULE_META, GENERATOR_ONLY_MODULES } from '@/domain/models/constants'
import { getBand } from '@/infrastructure/utils/format'
import type { ModuleData } from '@/domain/models/types'

const appStore = useAppStore()
const fr = useFullrunStore()

const showSummary = computed(() => fr.state?.kind === 'fullrun' && fr.state.done)

function moduleName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}
function isSkipped(id: string): boolean {
  return (GENERATOR_ONLY_MODULES as readonly string[]).includes(id)
}

// --- Summary ---
const rows = computed(() => {
  if (!fr.state) return []
  const order = [...DGP_ONLY_MODULE_IDS, ...FULLRUN_TAIL_STEPS.map((t) => t.id), 'analyse', 'tsu']
  return order
    .filter((id) => id in fr.state!.results)
    .map((id) => {
      const r = fr.state!.results[id]
      return { id, name: moduleName(id), earned: r.earned ?? null, total: r.total ?? null, pct: r.pct }
    })
})
const scored = computed(() => rows.value.filter((r) => r.pct != null))
const cnt = computed(() => scored.value.length)
const avg = computed(() => (cnt.value ? Math.round(scored.value.reduce((s, r) => s + (r.pct as number), 0) / cnt.value) : 0))

// --- Intro: time/scope estimate per step, derived from each module's own metadata ---
const introMeta = ref<Record<string, ModuleData>>({})
const introSteps = computed(() => {
  const ids = [...DGP_ONLY_MODULE_IDS, ...FULLRUN_TAIL_STEPS.map((t) => t.id)]
  const steps = ids.map((id) => ({ id, name: moduleName(id), timing: timingFor(id) }))
  steps.push({ id: 'analyse', name: 'Politische Analyse (optional)', timing: '60 Min · Freitext' })
  steps.push({ id: 'tsu', name: 'Situatives Urteilen (TsU)', timing: tsuTiming() })
  return steps
})
function timingFor(id: string): string {
  const m = introMeta.value[id]
  if (!m) return '…'
  if (isSkipped(id)) return 'übersprungen'
  if (m.count) {
    const totalSec = m.totalSec || (m.secPerItem && m.count ? m.secPerItem * m.count : null)
    const min = totalSec ? totalSec / 60 : null
    const minTxt = min == null ? '' : Number.isInteger(min) ? `${min} Min` : `ca. ${min.toFixed(1).replace('.', ',')} Min`
    return `${m.count} Aufgaben${minTxt ? ' · ' + minTxt + ' (Zeitdruck)' : ''}`
  }
  if (m.sets) {
    const first = Object.values(m.sets)[0]
    return `${first?.items.length ?? '–'} Fragen · ${m.durationMin} Min`
  }
  return `${m.durationMin || '–'} Min`
}
function tsuTiming(): string {
  const m = introMeta.value.tsu
  return m ? `${m.fullrunMin} Min · ${m.fullrunN} Szenarien` : '…'
}

onMounted(async () => {
  const ids = [...DGP_ONLY_MODULE_IDS.filter((id) => !isSkipped(id)), ...FULLRUN_TAIL_STEPS.map((t) => t.id), 'tsu']
  const entries = await Promise.all(ids.map((id) => loadModule(id).then((d) => [id, d] as const)))
  introMeta.value = Object.fromEntries(entries)
})

function restart(withAnalyse: boolean) {
  fr.clear()
  startFullrunQueue(withAnalyse)
}
</script>
