# Migration Guide: From Monolith to Modular

## Overview

This guide explains how to continue the refactoring from the completed **Phase 1 Foundation** to the full modular architecture.

---

## Phase 1 ✅ Complete: What We Have

### Architecture Established
- ✅ TypeScript types and interfaces (`types.ts`, `constants.ts`)
- ✅ Infrastructure services (storage, router, timer, utilities)
- ✅ Pinia state management (`app-store.ts`)
- ✅ Vue 3 app shell (`App.vue`, `main.ts`)
- ✅ Global styles and CSS variables

### What Still Lives in the Monolith
The original `jaschaderdiplomat.html` (60,000+ lines) still contains:
- **Data:** `DATA.recht`, `DATA.geschichte`, all quiz content (~15,000 lines)
- **Generators:** All 13 DGP generators (~8,000 lines)
- **UI:** All HTML templates and render functions (~30,000 lines)
- **Logic:** Quiz engine, scoring, analytics (~5,000 lines)

---

## Phase 2: Data Layer Extraction

### Step 1: Extract Quiz Data to JSON

**Example: Recht Module**

The monolith contains:
```javascript
DATA.recht = {
  title: "Recht",
  sets: {
    y2019: {
      label: "Prüfungsjahr 2019",
      items: [
        { q: "Was ist...", o: ["A", "B", "C"], a: 1, e: "Erklärung", cat: "Verfassung" },
        // ... 100 more
      ]
    },
    y2023: { label: "2023", items: [...] }
  }
}
```

**Create:** `src/data/recht-2019.json`
```json
{
  "label": "Prüfungsjahr 2019",
  "items": [
    {
      "q": "Was ist laut Grundgesetz die Grundlage der staatlichen Ordnung?",
      "o": [
        "Das Volk",
        "Die Menschenwürde",
        "Die Demokratie",
        "Die Rechtsstaatlichkeit"
      ],
      "a": 1,
      "e": "Art. 1 Abs. 1 GG: Die Würde des Menschen ist unantastbar. Sie zu achten und zu schützen ist Verpflichtung aller staatlichen Gewalt.",
      "cat": "Verfassung",
      "official": true
    }
    // ... rest of items
  ]
}
```

**Create:** `src/data/recht-2023.json` (same structure)

### Step 2: Create Data Loader

**Create:** `src/data/loader.ts`
```typescript
import type { QuizSet } from '@/domain/models/types'

export async function loadQuizSet(moduleId: string, setId: string): Promise<QuizSet> {
  try {
    const response = await fetch(`/src/data/${moduleId}-${setId}.json`)
    if (!response.ok) throw new Error(`Failed to load ${moduleId}-${setId}`)
    return await response.json()
  } catch (error) {
    console.error(`Error loading quiz data:`, error)
    throw error
  }
}

export function getAvailableSets(moduleId: string): string[] {
  // Return list of available sets for a module
  const setMap: Record<string, string[]> = {
    'recht': ['y2019', 'y2023'],
    'geschichte': ['y2019', 'y2023'],
    'wirtschaft': ['y2019', 'y2023'],
    'englisch': ['default'],
    'russisch': ['default']
  }
  return setMap[moduleId] || []
}
```

### Step 3: Update Module Definitions

**Create:** `src/data/module-registry.ts`
```typescript
import type { ModuleData } from '@/domain/models/types'

export const MODULE_DATA: Record<string, ModuleData> = {
  recht: {
    short: "Recht",
    title: "Recht & Verfassung",
    desc: "100 Fragen zum deutschen Recht, Verfassungsrecht und EU-Recht",
    durationMin: 10,
    icon: "scale",
    sets: ['y2019', 'y2023']
  },
  geschichte: {
    short: "Geschichte",
    title: "Geschichte & Politik",
    desc: "100 Fragen zu deutscher und internationaler Geschichte",
    durationMin: 10,
    icon: "book",
    sets: ['y2019', 'y2023']
  }
  // ... rest of modules
}
```

### Step 4: Extract DGP Static Pools

For modules with pre-generated test runs (not live generators):

**Example: Allgemeinwissen** (50 test runs × 25 questions)

Extract from monolith:
```javascript
const AW_SETS = {
  "run1": { items: [...25 questions...] },
  "run2": { items: [...] },
  // ... run50
}
```

**Create:** `src/data/dgp/allgemeinwissen/` directory with:
- `run1.json` through `run50.json` (50 files)
- Each file: `{ "items": [...] }`

**Loader:**
```typescript
export async function loadDgpRun(
  moduleId: string,
  runNumber: number
): Promise<QuizSet> {
  const response = await fetch(
    `/src/data/dgp/${moduleId}/run${runNumber}.json`
  )
  return response.json()
}
```

---

## Phase 3: Module Logic (Generators)

### Step 1: Extract One Generator

**Example: DGP Analogien (Verbale Analogien)**

**From monolith** (`jaschaderdiplomat.html`, line ~8000):
```javascript
function genDGP(tier){
  tier=tier||3;
  const pool = DGP_PAIRS; // large array of word pairs
  const base = pickRandom(pool);
  // ... 100 lines of generator logic ...
  return { q, o, a, e, cat };
}
```

**Create:** `src/modules/dgp/generators/analogien.ts`
```typescript
import { pickRandom, shuffleArray, pickByTier } from '@/infrastructure/utils/random'
import type { QuizItem } from '@/domain/models/types'
import { DGP_PAIRS } from '../data/dgp-pairs'

export interface AnalogieConfig {
  tier?: number
}

export function generateAnalogieItem(config: AnalogieConfig = {}): QuizItem {
  const tier = config.tier || 3
  
  // Pick base pair weighted by tier
  const base = pickByTier(DGP_PAIRS, tier)
  
  // Generator logic here (copied from monolith)
  const q = `${base.a} verhält sich zu ${base.b} wie:`
  const correct = base.c
  const options = generateDistractors(base, tier)
  const shuffled = shuffleArray([correct, ...options])
  
  return {
    q,
    o: shuffled,
    a: shuffled.indexOf(correct),
    e: `Analogie: ${base.a} → ${base.b} entspricht ${base.c} → ${base.d}. ${base.explanation}`,
    cat: 'Verbale Analogien',
    _tier: tier
  }
}

function generateDistractors(base: any, tier: number): string[] {
  // Distractor generation logic
  // ...
}
```

### Step 2: Port Data Structures

**Create:** `src/modules/dgp/data/dgp-pairs.ts`
```typescript
export interface DgpPair {
  a: string
  b: string
  c: string
  d: string
  explanation: string
  tier: number
}

export const DGP_PAIRS: DgpPair[] = [
  {
    a: "Baum",
    b: "Wald",
    c: "Fisch",
    d: "Schwarm",
    explanation: "Baum ist Teil eines Waldes, Fisch ist Teil eines Schwarms",
    tier: 1
  },
  // ... ~200 more pairs
]
```

### Step 3: Repeat for All Generators

Follow this pattern for:
- `buchstabenreihen.ts` (letter sequences)
- `grundrechnen.ts` (arithmetic)
- `zahlenreihen.ts` (number sequences)
- `zahlenmatrix.ts` (3×3 matrices)
- ... and 9 more

---

## Phase 4: Quiz Engine

### Step 1: Extract Core Logic

**From monolith:**
```javascript
function startQuiz(id, mode, fullrun) {
  const D = DATA[id];
  const items = sampleItems(id, D.count);
  state.quiz = {
    kind: "quiz",
    id, mode, items,
    answers: {}, idx: 0, finished: false
  };
  navigate("quiz", {id});
}
```

**Create:** `src/services/quiz-engine.ts`
```typescript
import { useQuizStore } from '@/domain/stores/quiz-store'
import { loadQuizSet } from '@/data/loader'
import type { QuizState } from '@/domain/models/types'

export async function startQuiz(
  moduleId: string,
  mode: 'uebung' | 'pruefung',
  setId?: string
): Promise<void> {
  const quizStore = useQuizStore()
  
  // Load quiz data
  const set = await loadQuizSet(moduleId, setId || 'default')
  
  // Initialize quiz state
  const quiz: QuizState = {
    kind: 'quiz',
    id: moduleId,
    setId: setId || 'default',
    mode,
    items: set.items,
    answers: {},
    marked: {},
    idx: 0,
    statement: false,
    totalPts: set.items.length,
    qTime: {},
    _tStart: Date.now(),
    finished: false,
    fullrun: false
  }
  
  // Set duration for pruefung mode
  if (mode === 'pruefung') {
    const durationMin = getModuleDuration(moduleId)
    quiz.durationSec = durationMin * 60
    quiz.timeLeft = quiz.durationSec
    quiz.onZero = () => finishQuiz()
  }
  
  quizStore.setQuiz(quiz)
}

export function submitAnswer(questionIdx: number, answer: number): void {
  const quizStore = useQuizStore()
  // Logic here
}

export function finishQuiz(): void {
  const quizStore = useQuizStore()
  // Calculate scores, record attempt, navigate to results
}
```

### Step 2: Create Quiz Store

**Create:** `src/domain/stores/quiz-store.ts`
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QuizState } from '../models/types'

export const useQuizStore = defineStore('quiz', () => {
  const quiz = ref<QuizState | null>(null)
  
  function setQuiz(newQuiz: QuizState | null) {
    quiz.value = newQuiz
  }
  
  function submitAnswer(idx: number, answer: number) {
    if (!quiz.value) return
    quiz.value.answers[idx] = answer
  }
  
  function nextQuestion() {
    if (!quiz.value) return
    quiz.value.idx++
  }
  
  return {
    quiz,
    setQuiz,
    submitAnswer,
    nextQuestion
  }
})
```

---

## Phase 5: Presentation Layer

### Step 1: Create a Simple View

**Create:** `src/presentation/views/DashboardView.vue`
```vue
<template>
  <div class="dashboard">
    <PageHeader
      eyebrow="Vorbereitung schriftliches Auswahlverfahren"
      title="Dashboard"
      :lede="description"
    />
    
    <StatsGrid :stats="stats" />
    
    <div class="module-grid">
      <ModuleCard
        v-for="module in modules"
        :key="module.id"
        :module="module"
        @click="navigateToModule(module.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/domain/stores/app-store'
import PageHeader from '../components/layout/PageHeader.vue'
import StatsGrid from '../components/dashboard/StatsGrid.vue'
import ModuleCard from '../components/dashboard/ModuleCard.vue'

const appStore = useAppStore()

const stats = computed(() => {
  // Calculate stats from appStore.state.attempts
  return [
    { label: 'Durchläufe', value: appStore.state.attempts.length },
    { label: 'Ø Trefferquote', value: calculateAverage() + '%' }
  ]
})

function navigateToModule(id: string) {
  appStore.navigate('module', { id })
}
</script>
```

### Step 2: Create Reusable Components

**Create:** `src/presentation/components/layout/PageHeader.vue`
```vue
<template>
  <div class="page-head">
    <div v-if="eyebrow" class="eyebrow">
      <span class="flagbar h">
        <i></i><i></i><i></i>
      </span>
      {{ eyebrow }}
    </div>
    <h1>{{ title }}</h1>
    <p v-if="lede" class="lede">{{ lede }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  lede?: string
}>()
</script>

<style scoped>
.page-head {
  margin-bottom: var(--spacing-xl);
}
/* ... rest of styles ... */
</style>
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/generators/analogien.test.ts
import { describe, it, expect } from 'vitest'
import { generateAnalogieItem } from '@/modules/dgp/generators/analogien'

describe('generateAnalogieItem', () => {
  it('generates valid quiz item', () => {
    const item = generateAnalogieItem({ tier: 3 })
    
    expect(item).toHaveProperty('q')
    expect(item).toHaveProperty('o')
    expect(item).toHaveProperty('a')
    expect(item).toHaveProperty('e')
    expect(item.o).toHaveLength(4)
    expect(item.a).toBeGreaterThanOrEqual(0)
    expect(item.a).toBeLessThan(4)
  })
  
  it('respects tier difficulty', () => {
    const easy = generateAnalogieItem({ tier: 1 })
    const hard = generateAnalogieItem({ tier: 5 })
    
    // Verify that tier 1 uses simpler pairs
    expect(easy._tier).toBe(1)
    expect(hard._tier).toBe(5)
  })
})
```

### Integration Tests

```typescript
// tests/integration/quiz-flow.test.ts
import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { startQuiz, submitAnswer, finishQuiz } from '@/services/quiz-engine'
import { useQuizStore } from '@/domain/stores/quiz-store'

describe('Quiz Flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('completes a full quiz', async () => {
    await startQuiz('dgp', 'uebung')
    
    const quizStore = useQuizStore()
    expect(quizStore.quiz).not.toBeNull()
    expect(quizStore.quiz?.items).toHaveLength(20)
    
    // Submit all answers
    for (let i = 0; i < 20; i++) {
      submitAnswer(i, 0)
    }
    
    finishQuiz()
    expect(quizStore.quiz?.finished).toBe(true)
  })
})
```

---

## Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Deploy Options

1. **Static hosting (Vercel, Netlify):**
   ```bash
   # Vercel
   vercel deploy
   
   # Netlify
   netlify deploy --prod
   ```

2. **GitHub Pages:**
   ```bash
   npm run build
   npm run deploy  # Add deploy script to package.json
   ```

3. **Self-hosted:**
   - Copy `dist/` to web server
   - Configure nginx/Apache for SPA routing

---

## Rollback Plan

If issues arise, the original monolith (`jaschaderdiplomat.html`) remains untouched and fully functional. You can:

1. Rename `jaschaderdiplomat.html` → `index.html`
2. Delete the `dist/` directory
3. Continue using the monolith

The refactored version is **additive** - it doesn't replace the monolith until you're ready.

---

## Next Steps

1. ✅ Phase 1 Foundation complete
2. ⏩ **Start Phase 2:** Extract 1-2 quiz JSON files to test data loading
3. ⏩ **Validate** data loading works in dev mode
4. ⏩ **Continue** with rest of data extraction
5. Move to Phase 3 (generators) once data layer is solid

---

## Questions & Support

- Review the full [ROADMAP.md](./ROADMAP.md) for detailed timeline
- Check [README.md](./README.md) for architecture overview
- Reference original monolith for any unclear logic
- TypeScript compiler will catch type mismatches early
