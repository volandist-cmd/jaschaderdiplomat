<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Fehleranalyse</h1>
      <p class="lede">Jede falsch beantwortete Aufgabe wird dauerhaft erfasst, um Muster zu erkennen.</p>
    </div>

    <div v-if="!errorLog.length" class="card pad center" style="padding:48px">
      <div style="font-family:var(--fs-display);font-size:20px;margin-bottom:8px">Noch keine Daten</div>
      <div class="muted" style="margin-bottom:18px;max-width:50ch;margin-left:auto;margin-right:auto">
        Sobald Sie Übungs- oder Prüfungsläufe abschließen, wird hier jede falsch beantwortete Aufgabe dauerhaft erfasst und nach Mustern durchsucht.
      </div>
      <button class="btn btn-primary" @click="appStore.navigate('dashboard')">Zu den Prüfungsteilen</button>
    </div>

    <template v-else>
      <div v-if="weakest.length" class="sec-title">Schwächste Unterkategorien</div>
      <div class="bars" style="margin-bottom:28px">
        <div v-for="w in weakest" :key="w.module + w.cat" class="bar-row">
          <div class="bl">{{ w.moduleName }} · {{ w.cat }}</div>
          <div class="bar-track"><div class="bar-fill" :style="{ width: Math.max(w.rate, 4) + '%' }">{{ w.rate }}%</div></div>
        </div>
      </div>

      <div class="sec-title">Letzte Fehler</div>
      <div v-for="(err, i) in recentErrors" :key="i" class="card pad" style="margin-bottom:10px">
        <div class="tag">{{ modName(err.module) }}{{ err.cat ? ' · ' + err.cat : '' }} · {{ new Date(err.ts).toLocaleDateString('de-DE') }}</div>
        <div style="font-size:14px;font-weight:500;margin:6px 0">{{ err.q }}</div>
        <div class="small">
          <span style="color:var(--green)">Richtig: {{ err.correct }}</span>
          <span v-if="err.chosen" style="color:var(--red)"><br>Ihre Antwort: {{ err.chosen }}</span>
          <span v-else style="color:var(--faint)"><br>nicht beantwortet</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { MODULE_META } from '@/domain/models/constants'

const appStore = useAppStore()
const errorLog = computed(() => appStore.state.errorLog)
const recentErrors = computed(() => [...errorLog.value].sort((a, b) => b.ts - a.ts).slice(0, 30))

function modName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}

const weakest = computed(() => {
  const stats = appStore.state.subtypeStats
  return Object.keys(stats)
    .map((key) => {
      const sep = key.lastIndexOf('::')
      const mod = key.slice(0, sep)
      const cat = key.slice(sep + 2)
      const s = stats[key]
      if (s.seen < 3) return null
      return {
        module: mod,
        moduleName: modName(mod),
        cat,
        seen: s.seen,
        wrong: s.wrong,
        rate: Math.round((s.wrong / s.seen) * 100)
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
    .slice(0, 8)
})
</script>
