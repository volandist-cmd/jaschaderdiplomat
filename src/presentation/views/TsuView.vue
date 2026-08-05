<template>
  <div v-if="mod">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>{{ mod.short }}</div>
      <h1>{{ mod.title }}</h1>
      <p class="lede">{{ mod.desc }}</p>
    </div>

    <!-- Landing -->
    <template v-if="!running">
      <div class="grid g-3" style="margin-bottom:24px">
        <div class="stat"><div class="k">Szenarien / Durchlauf</div><div class="v">{{ mod.attemptN }}</div><div class="sub">von {{ mod.scenarios!.length }} insgesamt</div></div>
        <div class="stat"><div class="k">Bestleistung</div><div class="v">{{ best != null ? best : '–' }}<small>%</small></div><div class="sub">Ihr bisher bestes Ergebnis</div></div>
        <div class="stat"><div class="k">Skala</div><div class="v" style="font-size:14px">{{ mod.scale!.join(' · ') }}</div></div>
      </div>
      <button class="btn btn-primary btn-lg" @click="start">Durchlauf starten</button>
    </template>

    <!-- Running -->
    <template v-else-if="!finished">
      <div class="exam-head">
        <div class="row">
          <div class="exam-title"><span class="flagbar"><i></i><i></i><i></i></span>{{ mod.title }}</div>
          <span class="badge gold">Szenario {{ idx + 1 }} von {{ scenarios.length }}</span>
        </div>
        <div class="exam-prog"><i :style="{ width: (idx / scenarios.length * 100) + '%' }"></i></div>
      </div>

      <div class="card pad" style="margin-bottom:18px">
        <h3 style="font-family:var(--fs-display);font-size:18px;margin-bottom:10px">{{ current.title }}</h3>
        <p style="margin:0">{{ current.context }}</p>
      </div>

      <div v-for="(st, si) in current.statements" :key="si" class="tsu-stmt">
        <div class="st">{{ st.t }}</div>
        <div class="scale">
          <button
            v-for="(label, li) in mod.scale"
            :key="li"
            :class="{ on: ratings[si] === li }"
            @click="ratings[si] = li"
          >{{ label }}</button>
        </div>
      </div>

      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn-ghost" :disabled="idx === 0" @click="idx--">← Zurück</button>
        <button v-if="idx < scenarios.length - 1" class="btn btn-primary" @click="nextScenario">Weiter →</button>
        <button v-else class="btn btn-gold" @click="finish">Abgeben &amp; auswerten</button>
      </div>
    </template>

    <!-- Results -->
    <template v-else>
      <div class="card result-hero" style="margin-bottom:24px">
        <div class="ring" :style="{ '--p': pct, '--c': 'var(--navy)' }">
          <div class="inner"><div class="pct">{{ pct }}%</div><div class="pl">Treffer</div></div>
        </div>
        <div class="result-meta">
          <h2>{{ correctCount }} von {{ totalStatements }} Bewertungen korrekt</h2>
          <div class="btn-row"><button class="btn btn-ghost" @click="reset">Neuer Durchlauf</button></div>
        </div>
      </div>
      <div class="sec-title">Überblick</div>
      <div v-for="(sc, i) in scenarios" :key="i" class="card pad" style="margin-bottom:14px">
        <h4 style="font-family:var(--fs-display);font-size:16px;margin-bottom:8px">{{ sc.title }}</h4>
        <div v-for="(st, si) in sc.statements" :key="si" style="margin-bottom:10px;font-size:13.5px">
          <div>{{ st.t }}</div>
          <div class="small" :style="{ color: allRatings[i][si] === st.a ? 'var(--green)' : 'var(--red)' }">
            Ihre Einschätzung: {{ mod.scale![allRatings[i][si]] ?? 'nicht bewertet' }} · Musterbewertung: {{ mod.scale![st.a] }}
          </div>
          <div class="small muted">{{ st.e }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { shuffleArray } from '@/infrastructure/utils/random'
import type { ModuleData, TsuScenario } from '@/domain/models/types'

const appStore = useAppStore()
const mod = ref<ModuleData | null>(null)
const running = ref(false)
const finished = ref(false)
const scenarios = ref<TsuScenario[]>([])
const idx = ref(0)
const allRatings = ref<number[][]>([])
const ratings = ref<number[]>([])

const current = computed(() => scenarios.value[idx.value])
const best = computed(() => {
  const attempts = appStore.state.attempts.filter((a) => a.module === 'tsu')
  return attempts.length ? Math.round(Math.max(...attempts.map((a) => a.pct))) : null
})

const totalStatements = computed(() => scenarios.value.reduce((s, sc) => s + sc.statements.length, 0))
const correctCount = computed(() =>
  scenarios.value.reduce((s, sc, i) => s + sc.statements.filter((st, si) => allRatings.value[i][si] === st.a).length, 0)
)
const pct = computed(() => (totalStatements.value ? Math.round((correctCount.value / totalStatements.value) * 100) : 0))

function start() {
  const pool = shuffleArray(mod.value!.scenarios!)
  scenarios.value = pool.slice(0, mod.value!.attemptN || pool.length)
  idx.value = 0
  ratings.value = new Array(scenarios.value[0].statements.length).fill(-1)
  allRatings.value = scenarios.value.map((sc) => new Array(sc.statements.length).fill(-1))
  running.value = true
  finished.value = false
}

function nextScenario() {
  allRatings.value[idx.value] = [...ratings.value]
  idx.value++
  ratings.value = new Array(current.value.statements.length).fill(-1)
}

function finish() {
  allRatings.value[idx.value] = [...ratings.value]
  const total = totalStatements.value
  const correct = correctCount.value
  appStore.state.attempts.push({
    module: 'tsu',
    setId: 'run',
    mode: 'uebung',
    earned: correct,
    total,
    pct: total ? Math.round((correct / total) * 100) : 0,
    correct,
    count: total,
    secAvg: 0,
    ts: Date.now()
  })
  appStore.saveState()
  finished.value = true
}

function reset() {
  running.value = false
  finished.value = false
}

onMounted(async () => {
  mod.value = await loadModule('tsu')
})
</script>
