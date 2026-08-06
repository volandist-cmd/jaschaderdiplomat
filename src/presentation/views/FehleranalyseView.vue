<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Fehleranalyse</h1>
      <p class="lede">Jede falsch beantwortete Aufgabe wird dauerhaft erfasst, um Muster zu erkennen.</p>
    </div>

    <div v-if="!appStore.state.errorLog.length" class="card pad center" style="padding:48px">
      <div style="font-family:var(--fs-display);font-size:20px;margin-bottom:8px">Noch keine Daten</div>
      <div class="muted" style="margin-bottom:18px;max-width:50ch;margin-left:auto;margin-right:auto">
        Sobald Sie Übungs- oder Prüfungsläufe abschließen, wird hier jede falsch beantwortete Aufgabe dauerhaft erfasst und nach Mustern durchsucht.
      </div>
      <button class="btn btn-primary" @click="appStore.navigate('dashboard')">Zu den Prüfungsteilen</button>
    </div>

    <template v-else>
      <div class="sec-title">Schwächste Unterkategorien</div>
      <div style="margin-bottom:28px"><WeakestSubtypesPanel /></div>

      <GuruPanel />

      <div class="sec-title" style="margin-top:28px">Wiederholte Fehler</div>
      <div class="card" style="overflow-x:auto;margin-bottom:28px"><RepeatedMistakesTable /></div>

      <div class="sec-title">Letzte Fehler</div>
      <RecentErrorsList :limit="30" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/domain/stores/app-store'
import WeakestSubtypesPanel from '@/presentation/components/WeakestSubtypesPanel.vue'
import GuruPanel from '@/presentation/components/GuruPanel.vue'
import RepeatedMistakesTable from '@/presentation/components/RepeatedMistakesTable.vue'
import RecentErrorsList from '@/presentation/components/RecentErrorsList.vue'

const appStore = useAppStore()
</script>
