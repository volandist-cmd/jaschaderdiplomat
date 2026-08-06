<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Auswertung</h1>
      <p class="lede">Trefferquoten, Bestleistungen und Übungs- vs. Prüfungsmodus je Prüfungsteil.</p>
    </div>

    <div v-if="!appStore.state.attempts.length" class="card pad center" style="padding:48px">
      <div style="font-family:var(--fs-display);font-size:20px;margin-bottom:8px">Noch keine Ergebnisse</div>
      <div class="muted" style="margin-bottom:18px;max-width:46ch;margin-left:auto;margin-right:auto">
        Sobald Sie einen Prüfungsteil abschließen, erscheinen hier Ihre Trefferquoten, Tempo, Bestleistungen und der Verlauf.
      </div>
      <button class="btn btn-primary" @click="appStore.navigate('dashboard')">Zu den Prüfungsteilen</button>
    </div>
    <AuswertungTable v-else />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/domain/stores/app-store'
import AuswertungTable from '@/presentation/components/AuswertungTable.vue'

const appStore = useAppStore()
</script>
