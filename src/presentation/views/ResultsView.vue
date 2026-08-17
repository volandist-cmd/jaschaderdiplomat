<template>
  <div v-if="quiz && quiz.result && mod">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>{{ mod.title }}</div>
      <h1>Auswertung</h1>
    </div>

    <div class="card result-hero" style="margin-bottom:24px">
      <div class="ring" :style="{ '--p': result.pct, '--c': ringColor }">
        <div class="inner"><div class="pct">{{ result.pct }}%</div><div class="pl">Treffer</div></div>
      </div>
      <div class="result-meta">
        <h2>{{ result.correct }} von {{ result.count }} richtig</h2>
        <div class="btn-row" style="margin:8px 0 4px">
          <span class="badge" :class="band.c">{{ band.t }}</span>
          <span v-if="passBadge" class="badge" :class="passBadge.c">{{ passBadge.t }}</span>
          <span class="badge gray">{{ result.earned }} / {{ result.total }} Punkte</span>
          <span class="badge navy" title="Durchschnittliche Bearbeitungszeit pro Frage">Ø {{ result.secAvg.toFixed(1) }} Sek./Frage</span>
          <span class="badge gray" title="Langsamste Frage">längste: {{ slowest.toFixed(0) }} s</span>
          <span v-if="quiz.mode === 'pruefung'" class="badge gray">Zeit: {{ fmtTime(result.timeUsed) }}{{ result.timeUp ? ' (Limit erreicht)' : '' }}</span>
          <span v-else class="badge gray">Übungsmodus</span>
        </div>
        <div class="notice info" style="margin-top:16px"><span class="ni">ℹ︎</span><div>{{ thresholdText }}</div></div>
      </div>
    </div>

    <div class="btn-row" style="margin-bottom:22px">
      <button class="btn btn-primary" @click="appStore.navigate('quiz', { id: quiz.id })">Antworten im Detail durchsehen</button>
      <button class="btn btn-ghost" :disabled="!hasWrong" @click="retryWrong">Nur falsche wiederholen</button>
      <button class="btn btn-ghost" @click="startAgain">{{ startAgainLabel }}</button>
      <button class="btn btn-ghost" @click="appStore.navigate('module', { id: quiz.id })">Zurück zum Modul</button>
    </div>

    <div class="sec-title"><span class="flagbar"><i></i><i></i><i></i></span>Überblick</div>
    <div
      v-for="(it, i) in quiz.items"
      :key="i"
      class="card"
      style="padding:14px 16px;margin-bottom:10px"
      :style="{ borderLeft: '3px solid ' + (isCorrect(it, quiz.answers[i]) ? 'var(--green)' : 'var(--red)') }"
    >
      <div style="display:flex;gap:10px;align-items:baseline">
        <span class="tag" :style="{ color: isCorrect(it, quiz.answers[i]) ? 'var(--green)' : 'var(--red)' }">
          {{ isCorrect(it, quiz.answers[i]) ? '✓' : '✗' }} Frage {{ i + 1 }}
        </span>
        <span v-if="it.flag" class="badge gold">zu prüfen</span>
        <span class="tag" style="margin-left:auto" title="Bearbeitungszeit dieser Frage">{{ (quiz.qTime[i] || 0).toFixed(0) }} s</span>
      </div>
      <div style="font-size:14.5px;font-weight:500;margin:6px 0">{{ it.q }}</div>
      <div class="small" v-html="reviewHtml(it, quiz.answers[i])"></div>
      <div class="small muted" style="margin-top:6px">{{ it.e }}</div>
    </div>
  </div>
  <div v-else class="center" style="padding:80px 0"><span class="spinner dark"></span></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuizStore } from '@/domain/stores/quiz-store'
import { useAppStore } from '@/domain/stores/app-store'
import { isItemCorrect, startQuiz, pickRunSetId, isRunSetId } from '@/services/quiz-engine'
import { loadModule } from '@/data/loader'
import { fmtTime } from '@/infrastructure/utils/format'
import { getBand } from '@/infrastructure/utils/format'
import { LETTERS, NAMED_SET_MODULES } from '@/domain/models/constants'
import type { ModuleData, QuizItem, QuizState } from '@/domain/models/types'

const quizStore = useQuizStore()
const appStore = useAppStore()

const quiz = computed(() => quizStore.quiz)
const result = computed(() => quiz.value!.result!)
const mod = ref<ModuleData | null>(null)
const isNamedSet = computed(() => !!quiz.value && (NAMED_SET_MODULES as readonly string[]).includes(quiz.value.id))

const startAgainLabel = computed(() => {
  if (isRunSetId(quiz.value?.setId)) return 'Nächster Testlauf'
  return isNamedSet.value ? 'Erneut starten' : 'Neue Aufgaben'
})

const band = computed(() => getBand(result.value.pct))
const ringColor = computed(() => `var(--${band.value.c === 'red' ? 'red' : band.value.c === 'gold' ? 'gold' : band.value.c === 'green' ? 'green' : 'navy'})`)

const passBadge = computed(() => {
  const threshold = mod.value?.schwellePct
  if (threshold == null) return null
  const passed = result.value.pct >= threshold
  return passed
    ? { c: 'green', t: `✓ bestanden (Schwelle ${threshold} %)` }
    : { c: 'red', t: `✗ nicht bestanden (Schwelle ${threshold} %)` }
})

const slowest = computed(() => {
  const q = quiz.value!
  return Math.max(0, ...q.items.map((_, i) => q.qTime[i] || 0))
})

const hasWrong = computed(() => {
  const q = quiz.value!
  return q.items.some((it, i) => !isItemCorrect(it, q.answers[i]))
})

const thresholdText = computed(() => {
  const m = mod.value
  if (!m) return ''
  if (quiz.value!.id === 'russisch') {
    return 'Im echten Russisch-Test gilt: bestanden ab 30 von 60 Punkten (50 %). Dieser Mustersatz umfasst nur einen Teil der 52 Originalfragen.'
  }
  if (m.schwellePct != null) {
    const perItem = m.secPerItem
    const total = m.totalSec || (perItem && m.count ? perItem * m.count : null)
    const timing = perItem
      ? `mit ${total ? `einem globalen Zeitbudget von ${total} Sekunden (≈ ${perItem} Sek./Aufgabe)` : `${perItem} Sek. pro Aufgabe`} für alle Aufgaben zusammen. Der Timer läuft unsichtbar im Hintergrund.`
      : 'ohne festes Zeitbudget je Aufgabe.'
    return `${m.title} (kognitiver Leistungstest): ${m.count} Aufgaben ${timing} Bestehensschwelle: ${m.schwellePct} %.`
  }
  return 'Das AA legt keine offizielle Bestehensgrenze offen; gewertet wird die Summe der richtigen Antworten. Ziel: möglichst hohe Trefferzahl unter Zeitdruck.'
})

function isCorrect(it: QuizItem, ans: any) {
  return isItemCorrect(it, ans)
}

function reviewHtml(it: QuizItem, your: any): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (it.multi) {
    const aset = it.aset || []
    const cor = aset.length
      ? [...aset].sort((a, b) => a - b).map((x) => `${LETTERS[x]} — ${esc(String(it.o![x]))}`).join('; ')
      : 'keiner der Schlüsse'
    let hh = `<span style="color:var(--green)">Richtig: ${cor}</span>`
    if (Array.isArray(your) && your.length) {
      const ok = isItemCorrect(it, your)
      hh += `<br><span style="color:${ok ? 'var(--green)' : 'var(--red)'}">Ihre Wahl: ${[...your].sort((a: number, b: number) => a - b).map((x: number) => LETTERS[x]).join(', ')}</span>`
    } else {
      hh += '<br><span style="color:var(--faint)">nicht beantwortet</span>'
    }
    return hh
  }
  if (it.dual) {
    const ok = isItemCorrect(it, your)
    const corTxt = `${LETTERS[it.aLeft!]} — ${esc(it.oLeft![it.aLeft!])} / ${(it.aRight ?? 0) + 1} — ${esc(it.oRight![it.aRight!])}`
    let hh = `<span style="color:var(--green)">Richtig: ${corTxt}</span>`
    if (Array.isArray(your) && your[0] >= 0 && your[1] >= 0) {
      const yourTxt = `${LETTERS[your[0]]} — ${esc(it.oLeft![your[0]] ?? '')} / ${your[1] + 1} — ${esc(it.oRight![your[1]] ?? '')}`
      hh += `<br><span style="color:${ok ? 'var(--green)' : 'var(--red)'}">Ihre Wahl: ${yourTxt}</span>`
    } else {
      hh += '<br><span style="color:var(--faint)">nicht beantwortet</span>'
    }
    return hh
  }
  if (!it.o) {
    const ok = isItemCorrect(it, your)
    let hh = `<span style="color:var(--green)">Richtig: ${esc(String(it.answer))}</span>`
    if (your != null && String(your).trim() !== '' && !ok) hh += `<br><span style="color:var(--red)">Ihre Eingabe: ${esc(String(your))}</span>`
    else if (your == null || String(your).trim() === '') hh += '<br><span style="color:var(--faint)">nicht beantwortet</span>'
    return hh
  }
  let hh = `<span style="color:var(--green)">Richtig: ${LETTERS[it.a]} — ${esc(String(it.o[it.a]))}</span>`
  if (your != null && your !== it.a) hh += `<br><span style="color:var(--red)">Ihre Wahl: ${LETTERS[your]} — ${esc(String(it.o[your]))}</span>`
  else if (your == null) hh += '<br><span style="color:var(--faint)">nicht beantwortet</span>'
  return hh
}

function retryWrong() {
  const q = quiz.value!
  const wrong = q.items.filter((it, i) => !isItemCorrect(it, q.answers[i]))
  if (!wrong.length) return
  const retryQuiz: QuizState = {
    kind: 'quiz',
    id: q.id,
    setId: q.setId,
    mode: 'uebung',
    items: wrong.map((it) => ({ ...it })),
    answers: {},
    marked: {},
    checked: {},
    idx: 0,
    statement: q.statement,
    totalPts: wrong.reduce((s, it) => s + (it.pts || 1), 0),
    qTime: {},
    _tStart: Date.now(),
    durationSec: q.durationSec,
    timeLeft: q.durationSec,
    finished: false,
    fullrun: false
  }
  quizStore.setQuiz(retryQuiz)
  appStore.navigate('quiz', { id: q.id })
}

async function startAgain() {
  const q = quiz.value!
  // Benannter Satz (Prüfungsjahrgang, Musteraufgaben): denselben Satz erneut. Testlauf-Satz:
  // den nächsten der Rotation — der gerade beendete ist jetzt als absolviert protokolliert.
  if (isNamedSet.value && !isRunSetId(q.setId)) {
    await startQuiz({ moduleId: q.id, setId: q.setId, mode: q.mode as 'uebung' | 'pruefung' })
  } else if (mod.value?.sets) {
    const setId = pickRunSetId(q.id, Object.keys(mod.value.sets), mod.value.runOrder === 'sequential')
    await startQuiz({ moduleId: q.id, setId, mode: q.mode as 'uebung' | 'pruefung' })
  }
}

onMounted(async () => {
  if (quiz.value) mod.value = await loadModule(quiz.value.id)
})
</script>
