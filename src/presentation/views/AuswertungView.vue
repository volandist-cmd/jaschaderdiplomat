<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Auswertung</h1>
      <p class="lede">Trefferquoten, Bestleistungen und Übungs- vs. Prüfungsmodus je Prüfungsteil.</p>
    </div>

    <div v-if="!stats.length" class="card pad center" style="padding:48px">
      <div style="font-family:var(--fs-display);font-size:20px;margin-bottom:8px">Noch keine Ergebnisse</div>
      <div class="muted" style="margin-bottom:18px;max-width:46ch;margin-left:auto;margin-right:auto">
        Sobald Sie einen Prüfungsteil abschließen, erscheinen hier Ihre Trefferquoten, Tempo, Bestleistungen und der Verlauf.
      </div>
      <button class="btn btn-primary" @click="appStore.navigate('dashboard')">Zu den Prüfungsteilen</button>
    </div>

    <table v-else class="tbl">
      <thead>
        <tr>
          <th>Modul</th><th class="num">Durchläufe</th><th class="num">Ø</th><th class="num">Best</th>
          <th class="num">Übung Ø</th><th class="num">Prüfung Ø</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stats" :key="s.id">
          <td>{{ s.name }}</td>
          <td class="num">{{ s.n }}</td>
          <td class="num">{{ s.avg }}%</td>
          <td class="num">{{ s.best }}%</td>
          <td class="num">{{ s.ueN ? s.ueAvg + '%' : '–' }}</td>
          <td class="num">{{ s.prN ? s.prAvg + '%' : '–' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { CONFIG, MODULE_META } from '@/domain/models/constants'

const appStore = useAppStore()

function modName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}

function avgPct(list: { pct: number }[]): number {
  return list.length ? Math.round(list.reduce((s, a) => s + a.pct, 0) / list.length) : 0
}

const stats = computed(() => {
  return CONFIG.STAT_MODS.map((id) => {
    const all = appStore.state.attempts.filter((a) => a.module === id)
    if (!all.length) return null
    const ue = all.filter((a) => a.mode === 'uebung')
    const pr = all.filter((a) => a.mode === 'pruefung')
    return {
      id,
      name: modName(id),
      n: all.length,
      avg: avgPct(all),
      best: Math.round(Math.max(...all.map((a) => a.pct))),
      ueN: ue.length,
      ueAvg: avgPct(ue),
      prN: pr.length,
      prAvg: avgPct(pr)
    }
  }).filter((s): s is NonNullable<typeof s> => s !== null)
})
</script>
