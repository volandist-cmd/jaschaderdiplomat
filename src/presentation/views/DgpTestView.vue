<template>
  <div>
    <template v-if="showSummary">
      <div class="page-head">
        <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>DGP-Testabschnitt</div>
        <h1>Ergebnis des DGP-Testabschnitts</h1>
      </div>
      <div class="card result-hero" style="margin-bottom:22px">
        <div class="ring" :style="{ '--p': gesamtPct, '--c': bestanden ? 'var(--green)' : 'var(--red)' }">
          <div class="inner"><div class="pct">{{ gesamtPct }}%</div><div class="pl">Gesamt</div></div>
        </div>
        <div class="result-meta">
          <h2>DGP-Testabschnitt</h2>
          <div class="btn-row" style="margin:8px 0 4px">
            <span class="badge" :class="bestanden ? 'green' : 'red'">{{ bestanden ? `bestanden (≥ ${threshold} %)` : `nicht bestanden (< ${threshold} %)` }}</span>
          </div>
          <p class="muted" style="margin-top:10px">{{ earnedSum }} von {{ totalSum }} Aufgaben richtig gelöst über alle {{ rows.length }} bearbeiteten DGP-Unterkategorien.</p>
        </div>
      </div>
      <div v-if="skipped.length" class="notice warn" style="margin-bottom:18px"><span class="ni">⚠</span><div>{{ skipped.length }} Unterkategorie(n) noch ohne Aufgabenpool (siehe Docs/PORT_STATUS.md) wurden übersprungen: {{ skippedNames }}.</div></div>
      <div class="card" style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>DGP-Unterkategorie</th><th>Punkte</th><th>Ergebnis</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.name }}</td>
              <td class="num">{{ r.earned != null ? `${r.earned} / ${r.total}` : '–' }}</td>
              <td><span class="badge" :class="r.pct != null ? getBand(r.pct).c : 'gray'">{{ r.pct != null ? r.pct + ' %' : '–' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn-primary" @click="restart">Neuer DGP-Testabschnitt</button>
        <button class="btn btn-ghost" @click="appStore.navigate('auswertung')">Zur Auswertung</button>
        <button class="btn btn-ghost" @click="appStore.navigate('dashboard')">Dashboard</button>
      </div>
    </template>

    <template v-else>
      <div class="page-head">
        <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>DGP-Testabschnitt</div>
        <h1>Nur DGP-Testabschnitt</h1>
        <p class="lede">Alle 20 DGP-Unterkategorien nacheinander unter Prüfungsbedingungen – ohne Fachtests, Sprachtests, politische Analyse oder TsU. Bestanden ist der Testabschnitt, wenn insgesamt mindestens {{ threshold }} % aller Aufgaben richtig gelöst wurden.</p>
      </div>
      <div class="card" style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>#</th><th>DGP-Unterkategorie</th></tr></thead>
          <tbody>
            <tr v-for="(id, i) in DGP_ONLY_MODULE_IDS" :key="id">
              <td class="num">{{ i + 1 }}</td>
              <td>{{ moduleName(id) }}<span v-if="isSkipped(id)" class="badge gray" style="margin-left:8px">noch nicht verfügbar</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="skipped.length" class="notice warn" style="margin:18px 0"><span class="ni">⚠</span><div>{{ skipped.length }} Unterkategorie(n) haben aktuell noch keinen Aufgabenpool und werden übersprungen: {{ skippedNames }}. Die {{ threshold }}-%-Schwelle bezieht sich dann auf die übrigen {{ DGP_ONLY_MODULE_IDS.length - skipped.length }} Unterkategorien.</div></div>
      <div class="notice info" style="margin:18px 0"><span class="ni">ℹ︎</span><div>Zwischen den Unterkategorien gibt es keine Pause; die Auswertung erscheint am Ende. Maßgeblich für „bestanden" ist die Gesamt-Trefferquote über alle richtig gelösten Aufgaben (nicht der Mittelwert der einzelnen Richtwerte je Unterkategorie).</div></div>
      <div class="btn-row"><button class="btn btn-primary btn-lg" @click="start">DGP-Testabschnitt starten</button></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { useFullrunStore } from '@/domain/stores/fullrun-store'
import { startDgpOnly } from '@/services/fullrun-engine'
import { DGP_ONLY_MODULE_IDS, DGP_TEST_THRESHOLD_PCT, MODULE_META, GENERATOR_ONLY_MODULES } from '@/domain/models/constants'
import { getBand } from '@/infrastructure/utils/format'

const appStore = useAppStore()
const fr = useFullrunStore()
const threshold = DGP_TEST_THRESHOLD_PCT

const showSummary = computed(() => fr.state?.kind === 'dgpOnly' && fr.state.done)
const skipped = computed(() => (fr.state?.kind === 'dgpOnly' ? fr.state.skipped : GENERATOR_ONLY_MODULES.slice()))
const skippedNames = computed(() => skipped.value.map(moduleName).join(', '))

function moduleName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}
function isSkipped(id: string): boolean {
  return (GENERATOR_ONLY_MODULES as readonly string[]).includes(id)
}

const rows = computed(() => {
  if (!fr.state) return []
  return DGP_ONLY_MODULE_IDS.filter((id) => id in fr.state!.results).map((id) => {
    const r = fr.state!.results[id]
    return { id, name: moduleName(id), earned: r.earned ?? null, total: r.total ?? null, pct: r.pct }
  })
})
const earnedSum = computed(() => rows.value.reduce((s, r) => s + (r.earned || 0), 0))
const totalSum = computed(() => rows.value.reduce((s, r) => s + (r.total || 0), 0))
const gesamtPct = computed(() => (totalSum.value ? Math.round((earnedSum.value / totalSum.value) * 100) : 0))
const bestanden = computed(() => gesamtPct.value >= threshold)

function start() {
  startDgpOnly()
}
function restart() {
  fr.clear()
  startDgpOnly()
}
</script>
