<template>
  <div v-if="rec">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Gesamtprüfung</div>
      <h1>Bewertungsblatt</h1>
    </div>
    <div class="card result-hero" style="margin-bottom:22px">
      <div class="ring" :style="{ '--p': rec.sheet.gesamt, '--c': `var(--${getBand(rec.sheet.gesamt).c})` }">
        <div class="inner"><div class="pct">{{ rec.sheet.gesamt }}%</div><div class="pl">Gesamt</div></div>
      </div>
      <div class="result-meta">
        <h2>Versuch {{ rec.n }}</h2>
        <div class="btn-row" style="margin:8px 0 4px">
          <span class="badge" :class="rec.sheet.bestanden ? 'green' : 'red'">{{ rec.sheet.bestanden ? 'alle Schwellen erreicht' : 'Schwelle(n) verfehlt' }}</span>
          <span class="badge gray">{{ dateText(rec.ts) }}</span>
        </div>
        <p class="muted" style="margin-top:10px">Bewertung im Format Ihrer Unterlagen. Maßgeblich sind die dort genannten Maxima und Schwellen.</p>
        <p class="small muted" style="margin-top:6px">Hinweis: Politische Analyse wird ohne KI-Bewertung nur als „abgegeben" erfasst (siehe Docs/PORT_STATUS.md) und fließt nicht in Gesamtwertung oder „bestanden" ein.</p>
      </div>
    </div>

    <div class="sec-title"><span class="flagbar"><i></i><i></i><i></i></span>Bewertungsblatt je Modul</div>
    <div class="card" style="overflow-x:auto;margin-bottom:22px">
      <table class="tbl">
        <thead><tr><th>Modul</th><th>Erreicht</th><th>Bezug</th><th>Schwelle / Richtwert</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="r in rec.sheet.rows" :key="r.key" :style="highlight(r.key)">
            <td :style="highlight(r.key) ? 'font-weight:600' : ''">{{ r.name }}</td>
            <td class="num">{{ erreicht(r) }}</td>
            <td class="muted">{{ bezug(r) }}</td>
            <td class="muted">{{ schwelle(r) }}</td>
            <td>
              <span v-if="r.pass == null" class="tag muted">Teilbereich</span>
              <span v-else class="badge" :class="r.pass ? 'green' : 'red'">{{ r.pass ? 'bestanden' : 'nicht bestanden' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" @click="appStore.navigate('simulation')">Zur Prüfungssimulation</button>
      <button class="btn btn-ghost" @click="appStore.navigate('dashboard')">Dashboard</button>
    </div>
  </div>
  <div v-else class="center" style="padding:80px 0"><span class="spinner dark"></span></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { getBand } from '@/infrastructure/utils/format'
import type { ScoresheetRow } from '@/domain/models/types'

const appStore = useAppStore()
const idx = computed(() => appStore.state.params?.idx)
const rec = computed(() => (idx.value != null ? appStore.state.sims?.[idx.value] : null))

function dateText(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function highlight(key: string) {
  return key === 'fach' || key === 'dgpcog' ? 'background:var(--surface-2)' : ''
}
function erreicht(r: ScoresheetRow): string {
  if (r.earned != null) return `${r.earned} / ${r.total}${r.pct != null ? ' · ' + r.pct + '%' : ''}`
  return r.pct != null ? `${r.pct}%` : '–'
}
function bezug(r: ScoresheetRow): string {
  if (r.max != null) return `max. ${r.max}`
  if (r.total != null) return `max. ${r.total}`
  return '–'
}
function schwelle(r: ScoresheetRow): string {
  if (r.schwelle != null) return `≥ ${r.schwelle} Pkt.`
  if (r.schwellePct != null) return `≥ ${r.schwellePct} %`
  return r.comp ? '(Teil der Fachtests)' : '–'
}
</script>
