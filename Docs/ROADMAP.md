# Development Roadmap - Weeks 2-6

## Week 2: Data Layer Extraction (15-20 files)

### Goal: Split the massive DATA object into modular JSON files

**Priority 1: Quiz Content**
```
src/data/
├── recht-2019.json         # DATA.recht.sets.y2019.items
├── recht-2023.json         # DATA.recht.sets.y2023.items
├── geschichte-2019.json    # DATA.geschichte sets
├── geschichte-2023.json
├── wirtschaft-2019.json
├── wirtschaft-2023.json
├── englisch-v1.json        # DATA.englisch
├── englisch-v2.json        # DATA.englischv2
├── englisch-v3.json        # DATA.englischv3
└── russisch.json           # DATA.russisch
```

**Priority 2: DGP Static Pools**
```
src/data/dgp/
├── allgemeinwissen/
│   ├── run1.json ... run50.json    # 50 × 25 questions
├── wortklassifikationen/
│   ├── run1.json ... run50.json    # 50 × 20 questions
├── aehnliche-wortbedeutung/
│   ├── run1.json ... run50.json    # AEW_SETS (1,000 total)
├── textanalyse/
│   ├── run1.json ... run50.json    # TSINN_SETS
├── logische-schluesse/
│   ├── run1.json ... run50.json    # SCHLUSSMULTI_SETS
└── tsu/
    └── scenarios.json              # DATA.tsu.scenarios (200+)
```

**Implementation:**
```typescript
// src/data/loader.ts
export async function loadQuizData(moduleId: string, setId: string): Promise<QuizSet> {
  const response = await fetch(`/src/data/${moduleId}-${setId}.json`)
  return response.json()
}
```

---

## Week 3: Module Logic - DGP Generators (13 modules, ~8,000 lines)

### Goal: Extract all live generators from monolith

**Files to Create:**
```
src/modules/dgp/
├── generators/
│   ├── analogien.ts          # genDGP() - Verbale Analogien
│   ├── buchstabenreihen.ts   # genSerie() - Letter sequences
│   ├── grundrechnen.ts       # genRech() - Basic arithmetic
│   ├── wortklassifikation.ts # Uses static pool (Week 2)
│   ├── zahlenreihen.ts       # genK4Zahl() - Number sequences
│   ├── zahlenmatrix.ts       # genK4Matrix() - 3×3 matrices
│   ├── tabellen.ts           # genK4Tab() - 10 chart types
│   ├── text-rechnen.ts       # genK4Tx() - Word problems
│   ├── schaetzen.ts          # genK4Schaetz() - Estimation
│   ├── norm-diktum.ts        # genK4Norm() - Legal subsumption
│   ├── sprichwoerter.ts      # genK4Sprich() - Proverbs
│   ├── grammatik.ts          # genK4Ortho() - Grammar
│   └── rechtschreibung.ts    # genK4Recht() - Spelling
│
├── chart-generators/         # SVG chart generation (10 types)
│   ├── bar-chart.ts          # svgBars()
│   ├── line-chart.ts         # svgLines()
│   ├── scatter-chart.ts      # svgScatter()
│   ├── pie-chart.ts          # svgPieDouble()
│   ├── histogram.ts          # svgHistogram()
│   ├── dual-axis.ts          # svgDualAxis()
│   ├── stacked-bar.ts        # stacked variants
│   ├── h-bar.ts              # svgHBar()
│   └── table.ts              # HTML table generator
│
└── k4-data-scenarios.ts      # K4CHART_ENT4, K4NORM_SETS, etc.
```

**Key Functions to Port:**
- `genDGP(tier)` → `generateAnalogieItem(tier)`
- `genSerie(tier)` → `generateBuchstabenreihe(tier)`
- All 10 `genChart*()` functions
- Chart SVG generators (`svgBars`, `svgLines`, etc.)

**Dependencies:**
- `random.ts` utilities (already done ✅)
- `format.ts` for K4 number formatting (already done ✅)

---

## Week 4: Quiz Engine & Services (5 modules, ~3,000 lines)

### Goal: Core application logic and state management

```
src/services/
├── quiz-engine.ts
│   ├── startQuiz()
│   ├── submitAnswer()
│   ├── nextQuestion()
│   ├── finishQuiz()
│   └── calculateScore()
│
├── scoring-service.ts
│   ├── recordAttempt()
│   ├── updateSubtypeStats()
│   ├── logError()
│   ├── calculateWeakestSubtypes()
│   └── findRepeatedMistakes()
│
├── analytics-service.ts
│   ├── getCurrentStreak()
│   ├── getCategoryStat()
│   ├── getCategoryTrend()
│   └── generateReadinessCheck()
│
├── persistence-service.ts
│   ├── autoSave()
│   ├── exportBackup()
│   ├── importBackup()
│   └── migrateOldState()
│
└── api/
    ├── gemini-client.ts      # AI feedback via Gemini API
    └── types.ts              # API request/response types
```

**Pinia Stores:**
```
src/domain/stores/
├── app-store.ts              # ✅ Done (global state)
├── quiz-store.ts             # Quiz session state
└── analytics-store.ts        # Scoring & statistics
```

---

## Week 5: Presentation Layer (40 components, ~20,000 lines)

### Goal: All UI components and views

**Views (37 pages):**
```
src/presentation/views/
├── DashboardView.vue         # Main dashboard
├── ModuleLandingView.vue     # Generic module landing (reused)
├── QuizView.vue              # Active quiz renderer
├── QuizResultsView.vue       # Results with explanations
├── TsuView.vue               # Situational judgment
├── AnalyseView.vue           # Political analysis
├── FullrunView.vue           # Complete test run
├── DgpTestView.vue           # DGP test section
├── SimulationView.vue        # Simulation mode
├── ScoresheetView.vue        # Scoresheet viewer
├── AuswertungView.vue        # Analytics dashboard
├── FehleranalyseView.vue     # Error analysis
├── NotizenView.vue           # Notes editor
└── LerntippsView.vue         # Learning tips
```

**Components:**
```
src/presentation/components/
├── layout/
│   ├── AppHeader.vue
│   ├── NavMenu.vue
│   ├── TimerDisplay.vue
│   └── MobileNavToggle.vue
│
├── quiz/
│   ├── QuestionCard.vue
│   ├── AnswerOptions.vue
│   ├── ExplanationBox.vue
│   ├── ProgressBar.vue
│   └── QuizNavigation.vue
│
├── dashboard/
│   ├── ModuleCard.vue
│   ├── StatsGrid.vue
│   ├── StreakDisplay.vue
│   └── BackupReminder.vue
│
├── charts/
│   ├── BarChart.vue
│   ├── LineChart.vue
│   ├── PieChart.vue
│   └── ChartLegend.vue
│
└── common/
    ├── Button.vue
    ├── Card.vue
    ├── Badge.vue
    ├── Notice.vue
    └── Spinner.vue
```

---

## Week 6: Polish & Integration (~2,000 lines)

### Goal: Final integration, testing, deployment

**Tasks:**
1. **Navigation System**
   - Render NAV structure in `NavMenu.vue`
   - Route guards and transitions
   - Breadcrumb navigation

2. **API Integration**
   - Gemini API for AI feedback (Analyse module)
   - Error handling and retry logic
   - API key management UI

3. **Error Handling**
   - Global error boundary
   - Toast notifications
   - Graceful degradation

4. **Mobile Optimization**
   - Responsive navigation (hamburger menu)
   - Touch-friendly quiz interface
   - Mobile-optimized charts

5. **Testing**
   ```
   tests/
   ├── unit/
   │   ├── generators.test.ts    # DGP generators
   │   ├── scoring.test.ts       # Scoring logic
   │   └── utils.test.ts         # Utility functions
   ├── integration/
   │   ├── quiz-flow.test.ts     # Complete quiz workflow
   │   └── data-persistence.test.ts
   └── e2e/
       └── full-simulation.spec.ts
   ```

6. **Performance**
   - Lazy loading for data files
   - Code splitting for modules
   - Service worker for offline support

7. **Documentation**
   - Component documentation (Storybook?)
   - API documentation (TSDoc)
   - Deployment guide

---

## Completion Checklist

### Week 2 ✅
- [ ] Extract all quiz JSON files (15 files)
- [ ] Create data loader utility
- [ ] Test data loading in dev mode

### Week 3 ✅
- [ ] Port all 13 DGP generators
- [ ] Port 10 chart generators
- [ ] Unit tests for generators

### Week 4 ✅
- [ ] Implement quiz engine
- [ ] Implement scoring service
- [ ] Implement analytics service
- [ ] Create quiz-store.ts

### Week 5 ✅
- [ ] Create all 37 view components
- [ ] Create all common components
- [ ] Responsive design
- [ ] Mobile navigation

### Week 6 ✅
- [ ] API integration
- [ ] Error handling
- [ ] Testing suite
- [ ] Performance optimization
- [ ] Final deployment

---

## Estimated Timeline

| Week | Component | Effort | Complexity |
|------|-----------|--------|------------|
| 1 | Foundation | 🟢 Done | Medium |
| 2 | Data Layer | 10-15h | Low |
| 3 | Generators | 20-25h | High |
| 4 | Services | 15-20h | Medium |
| 5 | Presentation | 25-30h | Medium |
| 6 | Polish | 10-15h | Medium |

**Total:** ~80-100 hours of focused development

---

## Risk Mitigation

**Risks:**
1. Generator logic is complex (K4 chart generators especially)
2. Data extraction might reveal inconsistencies
3. State management migration could introduce bugs

**Mitigations:**
1. Port generators one-by-one with unit tests
2. Validate JSON data against TypeScript types
3. Keep monolith as fallback during transition
4. Incremental testing at each phase
