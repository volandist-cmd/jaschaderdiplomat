<template>
  <div v-if="mod">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>{{ mod.short }}</div>
      <h1>{{ mod.title }}</h1>
      <p class="lede">{{ mod.desc }}</p>
    </div>

    <template v-if="!selected">
      <div class="sec-title">Thema wählen</div>
      <div class="grid g-2">
        <div v-for="(topic, i) in mod.topics" :key="i" class="topic" @click="selectTopic(i)">
          <div class="tt"><span class="tcat">{{ topic.cat }}</span></div>
          <div class="tt" style="margin-top:2px">{{ topic.t }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="exam-head">
        <div class="row">
          <div class="exam-title"><span class="flagbar"><i></i><i></i><i></i></span>{{ selected.t }}</div>
          <div class="timer" :class="{ warn: timeLeft <= 300 }"><span class="dot"></span><span>{{ fmtTime(timeLeft) }}</span></div>
        </div>
      </div>
      <div class="card pad" style="margin-bottom:18px">
        <p style="white-space:pre-wrap;margin:0">{{ selected.prompt }}</p>
      </div>
      <textarea
        v-model="text"
        class="analysis"
        placeholder="Ihre Analyse …"
        @input="onInput"
      ></textarea>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-primary" :disabled="saved" @click="save">{{ isFullrun ? 'Abgeben & weiter' : 'Speichern & abschließen' }}</button>
        <button v-if="!isFullrun" class="btn btn-ghost" @click="cancel">Abbrechen</button>
      </div>
      <div v-if="saved && !isFullrun" class="notice info" style="margin-top:16px"><span class="ni">✓</span><div>Gespeichert. Es gibt keine automatische Bewertung — nutzen Sie den Text zur eigenen Nachbereitung.</div></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { fmtTime } from '@/infrastructure/utils/format'
import { recordFullrunStep } from '@/services/fullrun-engine'
import type { ModuleData, AnalysisTopic } from '@/domain/models/types'

const appStore = useAppStore()
const mod = ref<ModuleData | null>(null)
const selected = ref<AnalysisTopic | null>(null)
const text = ref('')
const timeLeft = ref(0)
const saved = ref(false)
let intervalId: number | null = null

/** Prüfungssimulation/Voller Durchlauf drive this view as one queue step (see fullrun-engine.ts): topic is picked at random and "Abgeben" advances the queue instead of just saving. */
const isFullrun = computed(() => !!appStore.state.params?.fullrun)

function selectTopic(i: number) {
  selected.value = mod.value!.topics![i]
  text.value = ''
  saved.value = false
  timeLeft.value = (mod.value!.durationMin || 60) * 60
  intervalId = window.setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - 1)
    if (timeLeft.value <= 0) finishWriting()
  }, 1000)
}

function onInput() {
  saved.value = false
}

function stopTimer() {
  if (intervalId) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

async function finishWriting() {
  if (saved.value) return
  stopTimer()
  saved.value = true
  appStore.state.essays.push({ topic: selected.value!.t, text: text.value, ts: Date.now() })
  appStore.saveState()
  if (isFullrun.value) {
    // No AI feedback in this build (Docs/PORT_STATUS.md gap #3) — the original also falls back
    // to an ungraded "abgegeben" entry on the Scoresheet whenever no AI grade is available yet.
    await recordFullrunStep('analyse', { kind: 'analyse', pct: null })
  }
}

function save() {
  finishWriting()
}

function cancel() {
  stopTimer()
  selected.value = null
}

onMounted(async () => {
  mod.value = await loadModule('analyse')
  if (isFullrun.value && mod.value.topics?.length) {
    selectTopic(Math.floor(Math.random() * mod.value.topics.length))
  }
})
onUnmounted(stopTimer)
</script>
