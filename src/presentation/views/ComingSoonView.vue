<template>
  <div>
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Gesamtprüfung</div>
      <h1>{{ title }}</h1>
      <p class="lede">{{ desc }}</p>
    </div>
    <div class="notice warn">
      <span class="ni">⚠</span>
      <div><strong>Noch nicht portiert.</strong> Dieser Bestandteil kombiniert mehrere Prüfungsteile zu einem zusammenhängenden Durchlauf mit gemeinsamem Timer und ist im Refactoring noch nicht umgesetzt. Nutzen Sie bis dahin die einzelnen Prüfungsteile unter „Prüfungsteile“.</div>
    </div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-primary" @click="appStore.navigate('dashboard')">Zum Dashboard</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'

const appStore = useAppStore()

const titles: Record<string, { title: string; desc: string }> = {
  dgptest: { title: 'DGP-Testabschnitt', desc: 'Alle 20 DGP-Aufgabentypen als ein zusammenhängender Durchlauf, bestanden ab 80 %.' },
  fullrun: { title: 'Voller Durchlauf', desc: 'Alle Prüfungsteile hintereinander wie am Prüfungstag.' },
  simulation: { title: 'Prüfungssimulation', desc: 'Volle Prüfungssimulation über 100 Versuche.' }
}

const title = computed(() => titles[appStore.state.view]?.title || 'Gesamtprüfung')
const desc = computed(() => titles[appStore.state.view]?.desc || '')
</script>
