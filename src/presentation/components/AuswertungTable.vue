<template>
  <div v-if="!stats.length" class="small muted" style="padding:8px 0">
    Sobald Sie einen Prüfungsteil abschließen, erscheinen hier Trefferquoten, Tempo und Bestleistungen je Modul.
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { CONFIG } from '@/domain/models/constants'
import { categoryStat } from '@/services/progress-analytics'

const appStore = useAppStore()

const stats = computed(() =>
  CONFIG.STAT_MODS
    .map((id) => categoryStat(appStore.state.attempts, id))
    .filter((s) => s.n > 0)
)
</script>
