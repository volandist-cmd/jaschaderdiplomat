<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Gesamtprüfung</div>
      <h1>Prüfungssimulation</h1>
      <p class="lede">Jeder Versuch spielt alle Bestandteile als komplette Prüfung durch – mit neu gemischten Fragen und Antwortoptionen bei Fachtests, Sprachtests und TsU – und liefert ein Bewertungsblatt im Format Ihrer Unterlagen (Maxima, Schwellen, Bestanden).</p>
    </div>

    <div class="card pad" style="margin-bottom:22px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <strong>Fortschritt</strong>
        <span class="tag">{{ sims.length }} / {{ goal }} Versuchen absolviert</span>
      </div>
      <div class="exam-prog"><i :style="{ width: pctDone + '%' }"></i></div>
    </div>

    <div class="btn-row" style="margin-bottom:8px">
      <button class="btn btn-primary btn-lg" @click="start(true)">Versuch {{ sims.length + 1 }} starten (vollständig)</button>
      <button class="btn btn-ghost btn-lg" @click="start(false)">Schneller Versuch (ohne Analyse)</button>
    </div>
    <div class="notice info" style="margin:14px 0 22px"><span class="ni">ℹ︎</span><div>„Vollständig" enthält die 60-minütige politische Analyse (ohne KI-Bewertung in dieser Version); „schnell" überspringt sie für reines Fach-, Sprach- und TsU-Training. Reihenfolge der Fragen und Antwortoptionen bei Fachtests, Sprachtests und TsU werden bei jedem Versuch neu gemischt; die DGP-Reihenfolge bleibt unverändert.</div></div>

    <div class="sec-title"><span class="flagbar"><i></i><i></i><i></i></span>Absolvierte Versuche</div>
    <div v-if="!sims.length" class="card pad muted">Noch kein Versuch absolviert – starten Sie Versuch 1.</div>
    <div v-else class="card" style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr><th>Versuch</th><th>Datum</th><th>DGP</th><th>Fachtests</th><th>Engl. v1</th><th>Zweitspr.</th><th>TsU</th><th>Gesamt</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="(rec, ri) in reversed" :key="rec.n" style="cursor:pointer" @click="appStore.navigate('scoresheet', { idx: sims.length - 1 - ri })">
            <td class="num">#{{ rec.n }}</td>
            <td class="muted">{{ dateText(rec.ts) }}</td>
            <td class="num">{{ pctCell(rec, 'dgpcog') }}</td>
            <td class="num">{{ pointsCell(rec, 'fach') }}</td>
            <td class="num">{{ pctCell(rec, 'englisch') }}</td>
            <td class="num">{{ pctCell(rec, 'russisch') }}</td>
            <td class="num">{{ pctCell(rec, 'tsu') }}</td>
            <td class="num">{{ rec.sheet.gesamt }}%</td>
            <td><span class="badge" :class="rec.sheet.bestanden ? 'green' : 'red'">{{ rec.sheet.bestanden ? '✓' : '✗' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="sims.length" class="btn-row" style="margin-top:18px">
      <button class="btn btn-ghost btn-sm" @click="clearHistory">Simulationsverlauf löschen</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { startSimulationQueue } from '@/services/fullrun-engine'
import { SIMULATION_GOAL_ATTEMPTS } from '@/domain/models/constants'
import type { SimAttempt } from '@/domain/models/types'

const appStore = useAppStore()
const goal = SIMULATION_GOAL_ATTEMPTS

const sims = computed(() => appStore.state.sims || [])
const reversed = computed(() => [...sims.value].reverse())
const pctDone = computed(() => Math.min(100, Math.round((sims.value.length / goal) * 100)))

function dateText(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function pctCell(rec: SimAttempt, key: string): string {
  const r = rec.sheet.rows.find((x) => x.key === key)
  return r && r.pct != null ? r.pct + '%' : '–'
}
function pointsCell(rec: SimAttempt, key: string): string {
  const r = rec.sheet.rows.find((x) => x.key === key)
  return r && r.earned != null ? `${r.earned}/${r.total}` : '–'
}

function start(withAnalyse: boolean) {
  startSimulationQueue(withAnalyse)
}
function clearHistory() {
  if (!window.confirm('Simulationsverlauf wirklich löschen?')) return
  appStore.state.sims = []
  appStore.saveState()
}
</script>
