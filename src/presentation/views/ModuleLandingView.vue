<template>
  <div v-if="mod" class="module-landing">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>{{ mod.short }}</div>
      <h1>{{ mod.title }}</h1>
      <p class="lede">{{ mod.desc }}</p>
    </div>

    <!-- Generator-only module: no static item pool ported yet -->
    <div v-if="isGeneratorOnly">
      <div class="notice warn" style="margin-bottom:22px">
        <span class="ni">⚠</span>
        <div><strong>Dieser Aufgabentyp wird zur Laufzeit generiert</strong> und ist im Refactoring noch nicht portiert. Die Original-Beschreibung und ein Beispiel:</div>
      </div>
      <div class="notice info" style="margin-bottom:22px"><span class="ni">ℹ︎</span><div>{{ mod.intro }}</div></div>
      <div v-if="mod.example" class="card pad center">
        <div class="q-stem" style="margin-top:0">{{ mod.example.q }}</div>
        <div class="small muted">{{ mod.example.e }}</div>
      </div>
    </div>

    <!-- Named-set modules: pick a specific set (year / official sample) -->
    <template v-else-if="isNamedSet">
      <div class="sec-title">Aufgabensatz wählen</div>
      <div class="grid g-2" style="margin-bottom:24px">
        <div
          v-for="setId in setKeys"
          :key="setId"
          class="topic"
          :class="{ sel: selectedSet === setId }"
          @click="selectedSet = setId"
        >
          <div class="tt">
            {{ mod.sets![setId].label }}
            <span v-if="bestFor(setId) != null" class="badge navy" style="margin-left:auto">Best {{ bestFor(setId) }}%</span>
          </div>
          <div class="td">{{ mod.sets![setId].items.length }} Fragen · {{ mod.durationMin }} Min{{ mod.sets![setId].note ? ' — ' + mod.sets![setId].note : '' }}</div>
        </div>
      </div>
      <div class="sec-title">Modus wählen</div>
      <div class="grid g-2" style="margin-bottom:26px">
        <div class="topic" :class="{ sel: selectedMode === 'uebung' }" @click="selectedMode = 'uebung'">
          <div class="tt">Übungsmodus</div>
          <div class="td">Sofortige Rückmeldung nach jeder Frage, mit Erklärung. Ohne Zeitdruck.</div>
        </div>
        <div class="topic" :class="{ sel: selectedMode === 'pruefung' }" @click="selectedMode = 'pruefung'">
          <div class="tt">Prüfungsmodus</div>
          <div class="td">Echte Zeitvorgabe ({{ mod.durationMin }} Min), Auswertung erst am Ende – wie in der Prüfung.</div>
        </div>
      </div>
      <button class="btn btn-primary btn-lg" @click="startNamed">Test starten</button>
    </template>

    <!-- Run-pool modules: no set picker, direct start with a fresh non-repeating run -->
    <template v-else>
      <div v-if="mod.intro" class="notice info" style="margin-bottom:22px"><span class="ni">ℹ︎</span><div>{{ mod.intro }}</div></div>
      <div class="grid g-3" style="margin-bottom:24px">
        <div class="stat"><div class="k">Aufgaben</div><div class="v">{{ mod.count }}</div><div class="sub">pro Testlauf</div></div>
        <div class="stat" v-if="perItemSeconds"><div class="k">Zeit/Aufgabe</div><div class="v">{{ perItemSeconds }}<small> Sek</small></div><div class="sub">{{ totalSeconds }} Sek. gesamt (Prüfungsmodus)</div></div>
        <div class="stat"><div class="k">Bestleistung</div><div class="v">{{ bestFor(undefined) != null ? bestFor(undefined) : '–' }}<small>%</small></div><div class="sub">Ihr bisher bestes Ergebnis</div></div>
      </div>
      <div class="sec-title">Modus wählen</div>
      <div class="grid g-2" :style="{ 'margin-bottom': hasMuster ? '26px' : '24px' }">
        <div class="topic" @click="startRun('uebung')">
          <div class="tt">Übungsmodus</div>
          <div class="td">{{ mod.count }} Fragen aus einem neuen Testlauf, sofortige Rückmeldung nach jeder Frage mit Erklärung. Ohne Zeitdruck.</div>
        </div>
        <div class="topic" @click="startRun('pruefung')">
          <div class="tt">Prüfungsmodus</div>
          <div class="td">{{ mod.count }} Fragen aus einem neuen Testlauf unter echtem Zeitdruck{{ perItemSeconds ? ` (${perItemSeconds} Sek./Frage)` : '' }}; Auswertung erst am Ende.</div>
        </div>
      </div>
      <template v-if="hasMuster">
        <div class="sec-title">Offizielle Musteraufgaben</div>
        <div class="grid g-2" style="margin-bottom:24px">
          <div class="topic" @click="startMuster('uebung')">
            <div class="tt">Musteraufgaben (Übung)</div>
            <div class="td">{{ mod.sets!.muster.items.length }} Aufgaben{{ mod.sets!.muster.note ? ' — ' + mod.sets!.muster.note : '' }} Ohne Zeitdruck.</div>
          </div>
          <div class="topic" @click="startMuster('pruefung')">
            <div class="tt">Musteraufgaben (Prüfung)</div>
            <div class="td">Dieselben Musteraufgaben unter echtem Zeitdruck ({{ mod.durationMin }} Min); Auswertung erst am Ende.</div>
          </div>
        </div>
      </template>
    </template>
  </div>
  <div v-else class="center" style="padding:80px 0"><span class="spinner dark"></span></div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { startQuiz, pickRunSetId } from '@/services/quiz-engine'
import { NAMED_SET_MODULES, GENERATOR_ONLY_MODULES } from '@/domain/models/constants'
import type { ModuleData } from '@/domain/models/types'

const appStore = useAppStore()

const moduleId = computed(() => appStore.state.params?.id || '')
const mod = ref<ModuleData | null>(null)
const selectedSet = ref<string>('')
const selectedMode = ref<'uebung' | 'pruefung'>('uebung')

const isGeneratorOnly = computed(() => (GENERATOR_ONLY_MODULES as readonly string[]).includes(moduleId.value))
const isNamedSet = computed(() => (NAMED_SET_MODULES as readonly string[]).includes(moduleId.value))
const setKeys = computed(() => (mod.value?.sets ? Object.keys(mod.value.sets) : []))
const hasMuster = computed(() => !!mod.value?.sets?.muster)
const perItemSeconds = computed(() => mod.value?.secPerItem || null)
const totalSeconds = computed(() => {
  if (!mod.value) return 0
  return mod.value.totalSec || (mod.value.secPerItem && mod.value.count ? mod.value.secPerItem * mod.value.count : 0)
})

function bestFor(setId: string | undefined): number | null {
  const attempts = appStore.state.attempts.filter(
    (a) => a.module === moduleId.value && (setId == null || a.setId === setId)
  )
  if (!attempts.length) return null
  return Math.round(Math.max(...attempts.map((a) => a.pct)))
}

async function load() {
  mod.value = null
  const data = await loadModule(moduleId.value)
  mod.value = data
  if (data.sets) selectedSet.value = Object.keys(data.sets)[0]
}

function startNamed() {
  startQuiz({ moduleId: moduleId.value, setId: selectedSet.value, mode: selectedMode.value })
}

function startRun(mode: 'uebung' | 'pruefung') {
  if (!mod.value?.sets) return
  const setId = pickRunSetId(moduleId.value, Object.keys(mod.value.sets))
  startQuiz({ moduleId: moduleId.value, setId, mode })
}

function startMuster(mode: 'uebung' | 'pruefung') {
  startQuiz({ moduleId: moduleId.value, setId: 'muster', mode })
}

watch(moduleId, load)
onMounted(load)
</script>
