<template>
  <div v-if="quiz && item" class="quiz-view">
    <div class="exam-head">
      <div class="row">
        <div class="exam-title"><span class="flagbar"><i></i><i></i><i></i></span>{{ modTitle }}</div>
        <div v-if="quiz.mode === 'pruefung'">
          <span v-if="isCognitive" class="badge gray">Prüfungsmodus</span>
          <div v-else class="timer" :class="{ warn: quiz.timeLeft <= 60 }">
            <span class="dot"></span><span>{{ fmtTime(quiz.timeLeft) }}</span>
          </div>
        </div>
        <span v-else class="badge gold">Übungsmodus{{ isCognitive ? '' : ` · Richtzeit ${modDurationMin} Min` }}</span>
      </div>
      <div class="exam-prog"><i :style="{ width: answeredPct + '%' }"></i></div>
    </div>

    <div v-if="item.passage" class="passage" :class="{ 'premise-lines': quiz.id === 'dgpschlussmulti' }">
      {{ item.passage }}<span v-if="item.src" class="src">Quelle: {{ item.src }}</span>
    </div>
    <div v-if="item.chartHTML" class="chart-wrap" v-html="item.chartHTML"></div>

    <div class="q-counter">
      Frage {{ quiz.idx + 1 }} von {{ quiz.items.length }}{{ item.cat ? ' · ' + item.cat : '' }}
      <span v-if="item.official" style="color:var(--green)"> · offiziell</span>
      <span v-if="item.flag" style="color:var(--gold)"> · zu prüfen</span>
    </div>

    <div v-if="quiz.id === 'dgpserie'" class="alpharef">a b c d e f g h i j k l m n o p q r s t u v w x y z</div>

    <template v-if="quiz.id === 'dgpzahl' || quiz.id === 'dgpserie'">
      <div class="q-stem" style="margin:14px 0 4px">{{ stemLines.label }}</div>
      <div v-if="stemLines.seq" class="zahlenreihe-row"><div class="zahlenreihe-inner">{{ stemLines.seq }}</div></div>
    </template>
    <template v-else-if="quiz.id === 'dgpmatrix'">
      <div class="q-stem" style="margin:14px 0 4px">{{ matrixStem.label }}</div>
      <div class="matrix-row">
        <table class="matrix-table"><tbody>
          <tr v-for="(row, ri) in matrixStem.rows" :key="ri" class="mrow">
            <td v-for="(cell, ci) in row" :key="ci">
              <span class="mcell" :class="{ blank: cell === '?' }">{{ cell }}</span>
            </td>
          </tr>
        </tbody></table>
      </div>
    </template>
    <div v-else class="q-stem" :style="quiz.id === 'dgprech' ? 'text-align:center;font-size:23px;font-weight:600;margin:14px 0 22px' : ''">
      {{ item.q }}<span v-if="quiz.statement" style="color:var(--muted);font-weight:400"> — welche Aussage ist korrekt?</span>
    </div>

    <!-- Multi-select -->
    <template v-if="item.multi">
      <div class="small muted" style="margin:2px 0 10px">Mehrfachauswahl – es können mehrere, einer oder keiner der Schlüsse zutreffen. Nur die exakt richtige Auswahl zählt.</div>
      <button
        v-for="(opt, j) in item.o"
        :key="j"
        class="opt"
        :class="optMultiClass(j)"
        @click="onAnswerOptMulti(j)"
      >
        <span class="mk">{{ optMultiMark(j) }}</span><span class="opt-txt">{{ opt }}</span>
      </button>
      <div v-if="quiz.mode === 'uebung' && !revealed" style="margin-top:10px">
        <button class="btn btn-gold btn-sm" :disabled="!multiHasSelection" @click="quizStore.checkMulti()">Antwort prüfen</button>
      </div>
    </template>

    <!-- Two-blank "Wortgleichung" (DGP-Verbale Analogien) -->
    <template v-else-if="item.dual">
      <div class="small muted" style="margin:2px 0 10px">Wortgleichung – wählen Sie je eine Option aus der linken und der rechten Spalte.</div>
      <div class="dual-cols" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div class="small muted" style="margin-bottom:6px">Linke Spalte</div>
          <button
            v-for="(opt, j) in item.oLeft"
            :key="'l' + j"
            class="opt"
            :class="optDualClass('left', j)"
            @click="onAnswerOptDual('left', j)"
          >
            <span class="mk">{{ optDualMark('left', j) }}</span><span class="opt-txt">{{ opt }}</span>
          </button>
        </div>
        <div>
          <div class="small muted" style="margin-bottom:6px">Rechte Spalte</div>
          <button
            v-for="(opt, j) in item.oRight"
            :key="'r' + j"
            class="opt"
            :class="optDualClass('right', j)"
            @click="onAnswerOptDual('right', j)"
          >
            <span class="mk">{{ optDualMark('right', j) }}</span><span class="opt-txt">{{ opt }}</span>
          </button>
        </div>
      </div>
      <div v-if="quiz.mode === 'uebung' && !revealed" style="margin-top:10px">
        <button class="btn btn-gold btn-sm" :disabled="!dualHasSelection" @click="quizStore.checkDual()">Antwort prüfen</button>
      </div>
    </template>

    <!-- Free-text -->
    <template v-else-if="isTextItem">
      <div class="text-answer-box">
        <input
          v-if="!revealed"
          v-model="textInput"
          type="text"
          class="field text-answer-input"
          placeholder="Antwort eingeben …"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter.prevent="submitTextAnswer"
        />
        <input v-else type="text" class="field text-answer-input" :value="String(quiz.answers[quiz.idx] ?? '')" disabled />
      </div>
      <div v-if="!revealed" style="margin-top:10px;text-align:center">
        <button class="btn btn-gold btn-sm" :disabled="!textInput.trim()" @click="submitTextAnswer">Antwort prüfen</button>
      </div>
    </template>

    <!-- Single-select -->
    <template v-else>
      <button
        v-for="(opt, j) in item.o"
        :key="j"
        class="opt"
        :class="optClass(j)"
        @click="onAnswerOpt(j)"
      >
        <span class="mk">{{ optMark(j) }}</span><span class="opt-txt">{{ opt }}</span>
      </button>
    </template>

    <!-- Explanation -->
    <div v-if="revealed" class="explain" :class="itemCorrect ? 'ok' : 'no'">
      <h5>{{ itemCorrect ? '✓ Richtig' : '✗ Nicht korrekt — ' + wrongCorrectionText }}</h5>
      {{ item.e }}
    </div>

    <!-- Navigator -->
    <div class="navigator">
      <button
        v-for="(_, i) in quiz.items"
        :key="i"
        class="nav-cell"
        :class="navCellClass(i)"
        @click="quizStore.goToQuestion(i)"
      >{{ i + 1 }}</button>
    </div>

    <div class="exam-foot">
      <div class="btn-row">
        <button class="btn btn-ghost btn-sm" :disabled="quiz.idx === 0" @click="quizStore.previousQuestion()">← Zurück</button>
        <button class="btn btn-ghost btn-sm" :disabled="quiz.idx >= quiz.items.length - 1" @click="quizStore.nextQuestion()">Weiter →</button>
        <button v-if="!quiz.finished" class="btn btn-quiet btn-sm" @click="quizStore.toggleMark()">
          {{ quiz.marked[quiz.idx] ? '★ Markiert' : '☆ Markieren' }}
        </button>
      </div>
      <button v-if="quiz.finished" class="btn btn-primary" @click="appStore.navigate('results', { id: quiz.id })">Zur Auswertung</button>
      <button v-else class="btn btn-gold" @click="submit">Abgeben &amp; auswerten</button>
    </div>
  </div>
  <div v-else class="center" style="padding:80px 0"><span class="spinner dark"></span></div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useQuizStore } from '@/domain/stores/quiz-store'
import { useAppStore } from '@/domain/stores/app-store'
import { finishQuiz, isItemCorrect } from '@/services/quiz-engine'
import { loadModule } from '@/data/loader'
import { fmtTime } from '@/infrastructure/utils/format'
import { LETTERS, COGNITIVE_MODULES } from '@/domain/models/constants'
import type { ModuleData } from '@/domain/models/types'

const quizStore = useQuizStore()
const appStore = useAppStore()

const quiz = computed(() => quizStore.quiz)
const item = computed(() => quiz.value?.items[quiz.value.idx] ?? null)
const revealed = computed(() => quizStore.isRevealed)
const isTextItem = computed(() => !!item.value && !item.value.multi && !item.value.o && !item.value.dual)
const isCognitive = computed(() => !!quiz.value && (COGNITIVE_MODULES as readonly string[]).includes(quiz.value.id))
const answeredPct = computed(() => {
  if (!quiz.value) return 0
  return Math.round((Object.keys(quiz.value.answers).length / quiz.value.items.length) * 100)
})

const modData = ref<ModuleData | null>(null)
const modTitle = computed(() => modData.value?.title ?? '')
const modDurationMin = computed(() => modData.value?.durationMin ?? 0)

const textInput = ref('')
watch(() => quiz.value?.idx, () => {
  textInput.value = typeof quiz.value?.answers[quiz.value.idx] === 'string' ? (quiz.value.answers[quiz.value.idx] as string) : ''
})

const itemCorrect = computed(() => {
  if (!item.value || !quiz.value) return false
  return isItemCorrect(item.value, quiz.value.answers[quiz.value.idx])
})

const wrongCorrectionText = computed(() => {
  const it = item.value
  if (!it) return ''
  if (it.dual) {
    return `richtig ist ${LETTERS[it.aLeft!]} ${(it.aRight ?? 0) + 1}`
  }
  if (it.multi) {
    return (it.aset && it.aset.length)
      ? 'richtig sind ' + [...it.aset].sort((a, b) => a - b).map((x) => LETTERS[x]).join(', ')
      : 'richtig ist keiner'
  }
  if (isTextItem.value) return `richtig ist „${it.answer}“`
  return `richtig ist ${LETTERS[it.a]}`
})

const multiHasSelection = computed(() => {
  const ans = quiz.value?.answers[quiz.value.idx]
  return Array.isArray(ans) && ans.length > 0
})

const dualAnswer = computed(() => {
  const ans = quiz.value?.answers[quiz.value.idx]
  return Array.isArray(ans) ? (ans as number[]) : [-1, -1]
})
const dualHasSelection = computed(() => dualAnswer.value[0] >= 0 && dualAnswer.value[1] >= 0)

function onAnswerOptDual(side: 'left' | 'right', j: number) {
  quizStore.answerOptDual(side, j)
}
function optDualMark(side: 'left' | 'right', j: number): string {
  const it = item.value!
  const correctIdx = side === 'left' ? it.aLeft : it.aRight
  const picked = side === 'left' ? dualAnswer.value[0] : dualAnswer.value[1]
  if (revealed.value) {
    if (j === correctIdx) return '✓'
    if (picked === j) return '✗'
  }
  return side === 'left' ? LETTERS[j] : String(j + 1)
}
function optDualClass(side: 'left' | 'right', j: number) {
  const it = item.value!
  const correctIdx = side === 'left' ? it.aLeft : it.aRight
  const picked = side === 'left' ? dualAnswer.value[0] : dualAnswer.value[1]
  const cls: Record<string, boolean> = { sel: picked === j }
  if (revealed.value) {
    if (j === correctIdx) { cls.correct = true; cls.sel = false }
    else if (picked === j) { cls.wrong = true; cls.sel = false }
    else cls.dim = true
  }
  return cls
}

const stemLines = computed(() => {
  const q = item.value?.q || ''
  const nl = q.indexOf('\n')
  return nl >= 0 ? { label: q.slice(0, nl), seq: q.slice(nl + 1) } : { label: q, seq: '' }
})

const matrixStem = computed(() => {
  const lines = (item.value?.q || '').split('\n')
  return { label: lines[0], rows: lines.slice(1).map((r) => r.split('|').map((c) => c.trim())) }
})

function optMark(j: number): string {
  const it = item.value!
  if (revealed.value) {
    if (j === it.a) return '✓'
    if (quiz.value!.answers[quiz.value!.idx] === j) return '✗'
  }
  return LETTERS[j]
}
function optClass(j: number) {
  const it = item.value!
  const answered = quiz.value!.answers[quiz.value!.idx]
  const cls: Record<string, boolean> = { sel: answered === j }
  if (revealed.value) {
    if (j === it.a) { cls.correct = true; cls.sel = false }
    else if (answered === j) { cls.wrong = true; cls.sel = false }
    else cls.dim = true
  }
  return cls
}
function optMultiMark(j: number): string {
  const sel = (Array.isArray(quiz.value!.answers[quiz.value!.idx]) ? quiz.value!.answers[quiz.value!.idx] : []) as number[]
  if (revealed.value) {
    if (item.value!.aset!.includes(j)) return '✓'
    if (sel.includes(j)) return '✗'
  }
  return sel.includes(j) ? '☑' : '☐'
}
function optMultiClass(j: number) {
  const sel = (Array.isArray(quiz.value!.answers[quiz.value!.idx]) ? quiz.value!.answers[quiz.value!.idx] : []) as number[]
  const cls: Record<string, boolean> = { 'opt-multi': true }
  if (revealed.value) {
    if (item.value!.aset!.includes(j)) cls.correct = true
    else if (sel.includes(j)) cls.wrong = true
    else cls.dim = true
  } else if (sel.includes(j)) cls.sel = true
  return cls
}
function navCellClass(i: number) {
  const q = quiz.value!
  const cls: Record<string, boolean> = { current: i === q.idx }
  if (q.finished) {
    const it = q.items[i]
    if (isItemCorrect(it, q.answers[i])) cls['r-correct'] = true
    else if (q.answers[i] != null) cls['r-wrong'] = true
  } else {
    if (q.answers[i] != null) cls.answered = true
    if (q.marked[i]) cls.marked = true
  }
  return cls
}

function onAnswerOpt(j: number) {
  if (quiz.value!.finished) return
  quiz.value!.answers[quiz.value!.idx] = j
}
function onAnswerOptMulti(j: number) {
  quizStore.answerOptMulti(j)
}
function submitTextAnswer() {
  quizStore.checkTextAnswer(textInput.value)
}
function submit() {
  const q = quiz.value!
  const unanswered = q.items.length - Object.keys(q.answers).length
  if (unanswered > 0 && !window.confirm(`${unanswered} Frage(n) noch unbeantwortet. Trotzdem abgeben?`)) return
  finishQuiz()
}

let intervalId: number | null = null
function tick() {
  const q = quiz.value
  if (!q || q.finished || q.mode !== 'pruefung') return
  // Deadline-based instead of decrement-per-tick: setInterval is throttled (sometimes to
  // once a minute or less) in backgrounded/inactive tabs, so counting down by 1 per firing
  // would silently pause the exam clock while the tab is out of focus. Computing timeLeft
  // from the wall-clock deadline self-corrects on whatever cadence the tick actually fires,
  // and the visibilitychange listener below forces an immediate correction on tab refocus.
  if (q.deadlineTs != null) {
    q.timeLeft = Math.max(0, Math.round((q.deadlineTs - Date.now()) / 1000))
  } else {
    q.timeLeft = Math.max(0, q.timeLeft - 1)
  }
  if (q.timeLeft <= 0) finishQuiz()
}
function onVisibilityChange() {
  if (document.visibilityState === 'visible') tick()
}

// Prüfungssimulation/Voller Durchlauf/DGP-Testabschnitt chain multiple quizzes through this
// same route (quiz -> quiz) without an intermediate view, so <component :is> never remounts
// this component — onMounted alone would leave modData (and the title/duration it drives)
// stuck on the first module. Watch the module id instead so each new step reloads it.
watch(
  () => quiz.value?.id,
  async (id) => {
    modData.value = id ? await loadModule(id) : null
  },
  { immediate: true }
)

onMounted(() => {
  intervalId = window.setInterval(tick, 1000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  if (intervalId) window.clearInterval(intervalId)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
