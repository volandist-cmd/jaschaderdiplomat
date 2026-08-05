# Port Status: Original → Refactored Application

**Last verified:** 2026-08-06 (Prüfungssimulation build), initially 2026-08-05, by direct comparison of `jaschaderdiplomat.html` (5,287 lines / 9.4 MB, 266 top-level functions) against the current `src/` tree. This replaces the earlier "Phase 1 / Week 2" narrative below and in `STATUS.md`, `VERIFICATION.md`, `NEXT_STEPS.md`, `README.md` — those describe the scaffolding stage from before real data population happened and are now materially wrong (e.g. they claim only 3 modules have data; actually 29/29 modules are wired and 26/29 are fully data-complete). Treat this file as the current source of truth; the others are historical.

## ✅ 2026-08-06 — Gap #1 (Prüfungssimulation) closed
DGP-Testabschnitt, Voller Durchlauf, and Prüfungssimulation (with persistent Scoresheet history) are now fully built — see "Resolved" section below for what was ported and verified. This turned out to be **three separate systems**, not one/two as CLAUDE.md's summary bullet suggests — confirmed against the original's actual code (`startFullrun`/`startSimulation` are distinct functions with different persistence/shuffle/scoring behavior). Detail in `Bewusste Abweichungen & Entscheidungen.md` in the vault.

## How this was verified
- `grep -n "function "` over the monolith → 266 function names + line numbers (used throughout below as `file.js:LINE` equivalents, i.e. `jaschaderdiplomat.html:LINE`).
- Every `src/data/*.json` parsed to count real items/sets (not just file size).
- Every view component in `src/presentation/views/` read in full and cross-checked against the corresponding `render*`/`start*` functions in the original.
- `grep -rn` across `src/` for feature keywords (guru, apiKey, backup, readiness, scoresheet, fullrun, simulation, focusTraining, customTopic, repeatedMistakes, categoryTrend, …) to confirm total absence vs. partial presence.

---

## P0 — Critical gaps (contradict explicit CLAUDE.md rules)

### 1. ~~Prüfungssimulation is entirely unbuilt~~ — ✅ RESOLVED 2026-08-06
Built as three systems, matching the original's actual code (not CLAUDE.md's abbreviated 2-mode summary — see the vault's `Bewusste Abweichungen & Entscheidungen.md`):

| Piece | Ported from (original line) | Where it lives now |
|---|---|---|
| `DGP_ONLY_QUEUE`, `startDgpOnly`, `renderDgpTestIntro`/`Summary` | :3952–3996 | `constants.ts` (`DGP_ONLY_MODULE_IDS`), `fullrun-engine.ts`, `DgpTestView.vue` |
| `startFullrun`, `renderFullrun*` | :3806–3947 | `fullrun-engine.ts` (`startFullrunQueue`), `FullrunView.vue` |
| `startSimulation`, `renderSimulation`, `resetSims` | :4552, 4652 | `fullrun-engine.ts` (`startSimulationQueue`), `SimulationView.vue` |
| `launchFullrunStep`, `fullrunRecord`/`fullrunNext` | :3886, 3916 | `fullrun-engine.ts` (`launchCurrentStep`, `recordFullrunStep`), called from `quiz-engine.ts`'s `finishQuiz()` and from `TsuView.vue`/`AnalyseView.vue` in fullrun mode |
| `computeScoresheet`, `renderScoresheet` | :4603, 4683 | `fullrun-engine.ts` (`computeScoresheet`), `ScoresheetView.vue` |
| `maybeShuffle`/`shuffleArr` | :4541 | `quiz-engine.ts` (`maybeShuffle`, multi-select items now explicitly excluded — see below) |

State: `fullrun-store.ts` (new Pinia store, queue/idx/results only — kept free of business logic to avoid a circular import with `quiz-engine.ts`, which both launches steps via the engine and reports results back into this store). `AppState.sims`/`AppState.fullrun` added to `types.ts`/`app-store.ts`.

**Verified in a real browser** (Playwright, headless Chromium — `chromium-cli` wasn't available in this environment, so Playwright was installed temporarily with `--no-save` and removed afterward; `package.json`/`package-lock.json` untouched):
- Full DGP-Testabschnitt run: all 17 available categories chain in the correct order, land on the summary with the correct 80%-of-total (not average-of-percentages) gesamtPct and pass/fail badge, zero console errors.
- Full Voller Durchlauf run (no Analyse): all 17 DGP + 3 Fachtest (named-set) + 4 Sprachtest + TSU chain correctly across three different step "kinds" (run-pool quiz → named-set quiz → TSU's own view+timer), reaches the Fullrun summary, zero console errors.
- Full Prüfungssimulation run: reaches the Scoresheet with all 30 rows (20 DGP + dgpcog + 3 individual Fach + fach-combined + 4 language + TSU) correctly populated, thresholds and pass/fail per row correct, zero console errors.

**Two real bugs found only by this browser testing (not caught by `vue-tsc`), both fixed:**
1. `QuizView.vue` loaded its module metadata (title, duration) only in `onMounted`. Fullrun mode navigates `quiz → quiz` repeatedly for consecutive steps, so `<component :is>` in `App.vue` never remounts the component — the displayed category title got stuck on whichever module loaded first, even though the actual questions underneath were correctly advancing. Fixed with a `watch(() => quiz.value?.id, …, { immediate: true })` instead of a mount-only load.
2. `computeScoresheet()` only loaded a DGP category's `schwellePct` when it had been attempted (`if (r.pct != null)`), so the 3 skipped K4 categories (gap #2) fell through to a misleading "(Teil der Fachtests)" placeholder in the Schwelle column instead of their real (unused) 60% threshold. `schwellePct` is a property of the module, not of the attempt — fixed to load unconditionally.

**Known interim limitations, by design (not bugs):**
- The 3 zero-content DGP categories (gap #2) are silently excluded from all three queues, with a visible "noch nicht verfügbar" notice on the intro pages — see gap #2 below for why.
- Politische Analyse always records `pct: null` ("abgegeben", ungraded) in every queue — no AI feedback exists in this build (gap #3), so it never gates `bestanden` or contributes to `gesamt`/`gesamtNachPA`, matching the original's own null-feedback fallback path.
- No toast notifications between steps (original showed one per step) — no toast/notification primitive exists in this app yet; out of scope to add one just for this feature.
- `FullrunView.vue`'s intro-table "Rahmen" (time estimate) column is derived live from each module's own `count`/`totalSec`/`durationMin` fields rather than copying the original's 29 hardcoded strings verbatim — materially accurate, not pixel-identical wording.

### 2. Three DGP categories have zero real content (0 of the required 1,000 tasks)
`src/data/dgpschaetz.json`, `dgptab.json`, `dgpnorm.json` are metadata-only stubs (894–1,192 bytes: `title`/`desc`/`intro`/one `example`) — no `sets` key, no items at all. This is already self-flagged in the code (`GENERATOR_ONLY_MODULES` in `constants.ts`, and `ModuleLandingView.vue` shows a literal "not ported yet" warning banner for these three), but it's worth stating plainly: **these are the single largest remaining content gap** and directly violate the "1.000 Aufgaben pro Kategorie" rule for 3 of 20 DGP categories.

They need the original's runtime chart/generator subsystem, which is entirely unported:
- Data pools: `K4CHART_ENT`, `K4CHART_YEARS`, `K4DATA_SCEN`, `K4GEN`, `K4IDS`, `K4NORM_REASON_TIERS`, `K4NORM_SETS`, `K4SCHAETZ_PCT_POOL`, `K4TAB_SCEN`, `K4TWOCHART_ENT`, `K4TWOCHART_ITEMS`, `K4_FORCE`
- Generators: `genChartDualAxis`, `genChartGroupedBar`, `genChartHBarRanking`, `genChartHistogram`, `genChartLineMulti`, `genChartPieDouble`, `genChartScatter`, `genChartStacked100`, `genChartStackedBar`, `genChartTruncatedAxis`, `genChartTwoCharts`, `genK4DatenPlain`, `genK4Norm`, `genK4Schaetz`, `genK4Tab`, `genK4TabPlain`, `sampleK4`, `pickK4PoolSet`, `isK4`, `mkSeries`
- SVG rendering: `svgBars`, `svgDualAxis`, `svgFor`, `svgHBar`, `svgHistogram`, `svgLines`, `svgPieDouble`, `svgScatter`, `_svgHead`, `_htmlTable`, `_niceMax`
- `QuizItem.chartHTML` in `types.ts` and the `v-html="item.chartHTML"` slot in `QuizView.vue` already anticipate this — the rendering hook exists, only the generation logic is missing.

**Decision needed before starting:** should these three follow the same pattern as the other 17 DGP categories (pre-bake 50×20 static runs into JSON, like `dgpzahl`/`dgpserie`), or should the runtime SVG generator actually be ported so charts are freshly generated per attempt like the original? The original generates at runtime; CLAUDE.md's "pick`<Name>`Set" convention (used for `dgpzahl`/`dgpserie`) suggests the project's general preference has been to convert live generators into static pools. Worth confirming which approach before investing the time either way.

---

## P1 — Whole feature systems missing (present in original, zero trace in `src/`)

### 3. AI "Guru" tutor system — 100% unbuilt
`AppState` in `types.ts` already carries the state shape (`guruAnalysis`, `guruMeta`, `subtypeGuru`, `guruChat`, `readinessCheck`, `readinessMeta`, `apiKey`, `_apiKeyEditing`), but **nothing reads or writes any of it** — confirmed via repo-wide grep. This is an AI-powered feature that calls an external API to analyze error patterns, score exam readiness, coach per-subtype weaknesses, and answer chat follow-ups.

| Function | Original line |
|---|---|
| `callAI` | 413 |
| `askGuru` | 4277 |
| `runReadinessCheck` | 4257 |
| `runGuruAnalysis` / `runSubtypeGuru` / `toggleSubtypeGuru` | — |
| `buildGuruPrompt` / `buildGuruFollowupPrompt` / `buildOverallPrompt` / `buildPerfPrompt` / `buildReadinessPrompt` / `buildSubtypeGuruPrompt` | — |
| `aiExplain` / `aiErrorHtml` / `aiErrorText` | — |
| `renderGuruCard` / `renderReadinessCard` / `copyGuruAnalysis` / `guruQuestionKeydown` | — |
| API key panel: `openApiKeyPanel`/`closeApiKeyPanel`/`editApiKey`/`saveApiKeyFromPanel`/`clearApiKey`/`apiKeyPanelKeydown`, `renderApiKeyCard` | — |

**Decision needed:** this calls an external AI API with a user-supplied key in the original. Before porting, confirm which provider/endpoint it targets and whether that's still the intended approach (vs., e.g., swapping to a Claude-based call).

### 4. Backup / Restore — unbuilt
`exportBackup` (4461), `importBackupFile` (4478), `triggerImportBackup`, `needsBackupReminder` (2862), `renderDatensicherungCard` (4001). State field `_lastBackupAt` exists in `types.ts` but nothing sets it. No export/import UI anywhere in `src/`.

### 5. Focus Training mode — unbuilt
`startFocusTraining` (4217), `focusTrainingEligible` (4208) — builds a custom practice run from the user's weakest subtypes across categories (feeds off the same `subtypeStats` that `FehleranalyseView.vue` already displays, but nothing lets the user *practice* those weak spots directly). Zero trace in `src/`.

### 6. Scoresheet — unbuilt
`computeScoresheet` (4603) / `renderScoresheet` (4683) — a cross-category summary sheet. Tied to gap #1 (Prüfungssimulation); likely the results screen shown after a full simulation run.

---

## P2 — Partially ported views (base flow works, original had more)

### 7. Politische Analyse (`AnalyseView.vue`)
Working: topic list → timed free-text writing → save to `essays`. As of 2026-08-06 the countdown also auto-submits at zero (`finishWriting()`, matching the original's `onZero:()=>finishAnalyse(true)` — needed for the fullrun step to progress unattended, fixed for standalone mode too since it's the same timer). Missing vs. original:
- AI feedback on the submitted essay: `analysisFeedback` (3574), `overallFeedback` (4842), `renderAnalyseFeedback` — depends on gap #3.
- Custom/regenerated topics: `customTopic` (3499), `newAnalyseTopic` (3801), `genTopic` (3504), `pickTopic` — Vue version only offers the 6 stored topics, no custom entry, no "give me a different one."
- Edit/delete a saved essay: `editAnalyse` (3632), `deleteEssay` (4519) — `NotizenView.vue` only lists past essays read-only.
- Pause/resume the writing timer: `toggleAnalyseTimer` (3532) — current timer runs continuously once started.

### 7b. Situatives Urteilen standalone mode (`TsuView.vue`) — see correction note below
Working: scenario flow, 4-point rating scale, per-statement result breakdown, now-fixed official-scenario-first sampling. Missing: Übungsmodus/Prüfungsmodus split (:3656–3660) — no timer, no inline per-scenario reveal in standalone mode. Full detail in the "Verified complete" section's correction note.

### 8. Fehleranalyse (`FehleranalyseView.vue`)
Working: weakest-subcategory bars + last-30-errors list. Missing:
- Repeated-mistake tracking: `repeatedMistakes` (2837) — same question missed more than once isn't surfaced; only a flat recent list.
- Category/module filter on the error log: `setFehlerFilter` (4093) — no filter control in the current template.

### 9. Auswertung (`AuswertungView.vue`)
Working: per-module n/avg/best/Übung-Ø/Prüfung-Ø table — this already satisfies CLAUDE.md's "separate Übungs-/Prüfungsmodus-Erfolgsquote" ask. Missing:
- Trend over time per category: `categoryTrend` (2807), `trendRow` (4369) — no improving/declining indicator, only a static aggregate.
- `perfSummary` (4825) style plain-language performance summary — `band()`-based badges exist in `ResultsView.vue` per-attempt, but aren't surfaced in the aggregate table.

---

## Data completeness (all 29 modules, verified by parsing every JSON)

**Full pools (50 runs × 20 items = 1,000 items) — 17/20 DGP categories, all good:**
`dgp`, `dgpaew`, `dgpmath`, `dgpmatrix`, `dgportho`, `dgprech`, `dgprecht2`, `dgpsatz`, `dgpschlussmulti`, `dgpserie`, `dgpsprich`, `dgptx`, `dgptextsinn`, `dgpwort`, `dgpwsch`, `dgpzahl`, `allgemeinwissen`

**Zero content (stubs only) — the 3 categories in gap #2:**
`dgpschaetz`, `dgptab`, `dgpnorm`

**Named-set modules (year/sample sets, not a 1000-item pool — matches original's own architecture):**
`recht` (50), `wirtschaft` (50), `geschichte` (50), `englisch` (3,023 across 51 sets), `englischv2` (1,000/50), `englischv3` (1,000/51), `russisch` (19, single "muster" set — **this matches the original**, which also only has a `set:"muster"` for Russisch; not a gap)

**Other:** `tsu` — 60 scenarios (the original has exactly one `scenarios:[…]` array; 60 appears to be the complete original set). `analyse` — 6 topics (matches original). `lerntipps` — static content, present.

**Verified correct schema exceptions (CLAUDE.md's documented exceptions):**
- `dgpzahl` and `dgpserie` correctly use free-text `answer` field (1,000/1,000 items), zero multiple-choice `o`/`a` — matches the Zahlenreihen/Buchstabenreihen exception.
- `dgprecht2` (Rechtschreibung) does include Zusammenschreibung/Getrenntschreibung items (401 "Getrennt…" hits, ~34 "immer noch"/"immernoch" variants) — the explicit CLAUDE.md ask for this topic is already satisfied.

---

## Verified complete / no action needed
(Listed explicitly so this doesn't get re-investigated — the stale docs previously claimed these were missing.)
- **QuizView.vue** — multi-select, free-text input, matrix-table rendering, `chartHTML` slot, cognitive-mode hidden timer, question navigator grid, marking, retry-wrong. No material gap found.
- **ResultsView.vue** — ring chart, pass/fail badge vs. `schwellePct`, per-question review with correct/chosen diff, retry-only-wrong, restart. Solid — contrary to the old `NEXT_STEPS.md`/`STATUS.md` claiming this wasn't built yet.
- **Fachtests (Recht/Wirtschaft/Geschichte) + Englisch v1/v2/v3** — fully data-populated, named-set architecture matches original.
- Shuffle in `quiz-engine.ts` is now opt-in per call (`startQuiz({ shuffle })`) and off by default — CLAUDE.md rule 5 (identical tier-sorted order in Übung *and* Prüfung) holds for every standalone module, and the Fullrun/Simulation queues only turn it on for Fachtest/Sprachtest/TSU legs, never DGP legs (verified in `fullrun-engine.ts`'s `tailSteps()`).

### Correction to the 2026-08-05 pass: TsuView.vue is *not* fully at parity
Building the Prüfungssimulation's fullrun-mode TSU step required reading `TsuView.vue` far more closely, which surfaced a real standalone-mode gap missed on the first pass: the original's `renderTsuHome()` offers separate Übungsmodus (reveals expert rating + explanation inline once a scenario is fully rated, no time limit) and Prüfungsmodus (visible countdown, no reveal until the end) buttons — `startTsu('uebung')` vs `startTsu('pruefung')`, original :3656–3660. The ported standalone view has neither: one button, no timer, no inline reveal ever (the sampling-order bug — original's official-scenario-first behavior wasn't ported either — *was* fixed in this session, see `sampleScenarios()`). Scoped out of the 2026-08-06 Prüfungssimulation work deliberately (see `Bewusste Abweichungen & Entscheidungen.md`) — the fullrun-mode step needed its own timer regardless and got one, but the standalone mode split is a separate, still-open piece of work.

---

## Needs a dedicated verification pass (not confirmed broken, not confirmed fine)

### DGP difficulty-tier ordering (CLAUDE.md rules 3 & 5, and the "WICHTIGE REGEL FÜR DIE SCHWIERIGKEITSSTUFEN" 1–10 staffelung)
None of the sampled ported items (checked `run1` across `dgpzahl`, `dgpserie`, `dgp`, `allgemeinwissen`, `dgprecht2`, `dgpmatrix`) carry the `_tier` field that `QuizItem` in `types.ts` reserves for it — it's `null`/absent on every item checked. The original *does* use an explicit tier mechanism during generation (`tierForIndex` at :1198, `_pkTier` at :1201, `_tierScale` at :1443), so the absence of the tag doesn't by itself prove the ordering is wrong (tier could have been "baked into" item order without persisting the tag) — but it does mean **no evidence currently exists** that the mandatory tier-monotonicity check (CLAUDE.md's "Hauptregel") was actually run against the data as it sits in this repo. Recommend a scripted pass (or at minimum manual spot-checks across a sample of runs per category) before trusting the ordering, rather than assuming it's fine because the file sizes look right.

---

## Housekeeping discrepancies
- `vue-router` is a listed dependency in `package.json` but is never imported anywhere in `src/` — the app uses a hand-rolled `src/infrastructure/router/router.ts` instead. Either remove the dependency or actually adopt it; currently dead weight.
- `Docs/STATUS.md`, `Docs/VERIFICATION.md`, `Docs/NEXT_STEPS.md`, `Docs/PHASE-1-*.md`, and the root `README.md` all describe the original "Phase 1 / Week 2, 60,000-line monolith, 3-of-30-modules" scaffolding narrative. That's no longer true (29/29 modules wired, 26/29 fully data-complete) — worth a follow-up pass to rewrite or archive them so they stop contradicting the real repo state.

---

## Suggested priority order
1. ~~**Prüfungssimulation** (gap #1)~~ — ✅ done 2026-08-06.
2. **DGP tier-ordering audit** — cheap to check, and CLAUDE.md treats this as non-negotiable before any category counts as "done." Now also feeds three Scoresheet rows (DGP subcategories + the aggregate `dgpcog` row), so it's higher-leverage than before.
3. **K4 categories** (gap #2) — largest content gap, and now also the reason DGP-Testabschnitt/Fullrun/Simulation run 17 steps instead of 20. Needs the static-vs-runtime-generation decision made first.
4. **Fehleranalyse/Auswertung completions** (gaps #7–9) — smaller, additive, no architecture decisions blocking them.
5. **AI Guru / Backup / Focus Training** (gaps #3–5) — real original functionality, but not covered by an explicit CLAUDE.md rule. Note that closing gap #3 (AI) would also let Politische Analyse contribute a real `paNote`/`gesamtNachPA` to the Scoresheet instead of always being null — sequence relative to the above based on how much you actually use them.
