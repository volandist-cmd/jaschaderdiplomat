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
        <button class="btn btn-primary" @click="save">Speichern &amp; abschließen</button>
        <button class="btn btn-ghost" @click="cancel">Abbrechen</button>
      </div>
      <div v-if="saved" class="notice info" style="margin-top:16px"><span class="ni">✓</span><div>Gespeichert. Es gibt keine automatische Bewertung — nutzen Sie den Text zur eigenen Nachbereitung.</div></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import { loadModule } from '@/data/loader'
import { fmtTime } from '@/infrastructure/utils/format'
import type { ModuleData, AnalysisTopic } from '@/domain/models/types'

const appStore = useAppStore()
const mod = ref<ModuleData | null>(null)
const selected = ref<AnalysisTopic | null>(null)
const text = ref('')
const timeLeft = ref(0)
const saved = ref(false)
let intervalId: number | null = null

function selectTopic(i: number) {
  selected.value = mod.value!.topics![i]
  text.value = ''
  saved.value = false
  timeLeft.value = (mod.value!.durationMin || 60) * 60
  intervalId = window.setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - 1)
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

function save() {
  appStore.state.essays.push({ topic: selected.value!.t, text: text.value, ts: Date.now() })
  appStore.saveState()
  saved.value = true
  stopTimer()
}

function cancel() {
  stopTimer()
  selected.value = null
}

onMounted(async () => {
  mod.value = await loadModule('analyse')
})
onUnmounted(stopTimer)
</script>
