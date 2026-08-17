import { useFullrunStore } from '@/domain/stores/fullrun-store'
import { useAppStore } from '@/domain/stores/app-store'
import { startQuiz, pickRunSetId } from './quiz-engine'
import { loadModule } from '@/data/loader'
import {
  DGP_ONLY_MODULE_IDS,
  FULLRUN_TAIL_STEPS,
  GENERATOR_ONLY_MODULES,
  MODULE_META,
  SCORESHEET_THRESHOLDS
} from '@/domain/models/constants'
import type { FullrunStep, FullrunStepResult, Scoresheet, ScoresheetRow } from '@/domain/models/types'

/**
 * DGP-Testabschnitt / Voller Durchlauf / Prüfungssimulation.
 * Ported from the original's DGP_ONLY_QUEUE, startFullrun()/startSimulation(),
 * launchFullrunStep()/fullrunRecord() and computeScoresheet(). Queue/result state lives in
 * fullrun-store.ts (kept dependency-free to avoid a cycle with quiz-engine.ts, which this
 * module calls to launch each quiz step and which reports results back in via a dynamic import).
 */

/** The 3 DGP categories with zero ported content today (Docs/PORT_STATUS.md gap #2) are left out of the queue rather than failing on an empty set. */
function dgpSteps(): { steps: FullrunStep[]; skipped: string[] } {
  const skipped: string[] = []
  const steps: FullrunStep[] = []
  for (const id of DGP_ONLY_MODULE_IDS) {
    if ((GENERATOR_ONLY_MODULES as readonly string[]).includes(id)) {
      skipped.push(id)
      continue
    }
    steps.push({ moduleId: id, kind: 'quiz' })
  }
  return { steps, skipped }
}

/** Fachtest/Sprachtest/TsU tail shared by "Voller Durchlauf" and "Prüfungssimulation" — only `shuffle` differs between the two. */
function tailSteps(withAnalyse: boolean, shuffle: boolean): FullrunStep[] {
  const shuffledIds = new Set(['recht', 'wirtschaft', 'geschichte', 'englisch', 'englischv2', 'russisch'])
  const tail: FullrunStep[] = FULLRUN_TAIL_STEPS.map((t) => ({
    moduleId: t.id,
    kind: 'quiz',
    fixedSet: t.fixedSet,
    shuffle: shuffle && shuffledIds.has(t.id)
  }))
  if (withAnalyse) tail.push({ moduleId: 'analyse', kind: 'analyse' })
  tail.push({ moduleId: 'tsu', kind: 'tsu', shuffle })
  return tail
}

export async function startDgpOnly(): Promise<void> {
  const { steps, skipped } = dgpSteps()
  useFullrunStore().start(steps, 'dgpOnly', false, skipped)
  await launchCurrentStep()
}

export async function startFullrunQueue(withAnalyse: boolean): Promise<void> {
  const { steps, skipped } = dgpSteps()
  useFullrunStore().start([...steps, ...tailSteps(withAnalyse, false)], 'fullrun', withAnalyse, skipped)
  await launchCurrentStep()
}

export async function startSimulationQueue(withAnalyse: boolean): Promise<void> {
  const { steps, skipped } = dgpSteps()
  const appStore = useAppStore()
  const simN = (appStore.state.sims?.length || 0) + 1
  useFullrunStore().start([...steps, ...tailSteps(withAnalyse, true)], 'simulation', withAnalyse, skipped, simN)
  await launchCurrentStep()
}

export async function launchCurrentStep(): Promise<void> {
  const fr = useFullrunStore()
  const appStore = useAppStore()
  const step = fr.currentStep
  if (!step) {
    await finalizeQueue()
    return
  }
  if (step.kind === 'tsu') {
    appStore.navigate('tsu', { id: 'tsu', fullrun: true })
    return
  }
  if (step.kind === 'analyse') {
    appStore.navigate('analyse', { id: 'analyse', fullrun: true })
    return
  }
  let setId = step.fixedSet
  if (!setId) {
    const mod = await loadModule(step.moduleId)
    setId = pickRunSetId(step.moduleId, Object.keys(mod.sets || {}), mod.runOrder === 'sequential')
  }
  await startQuiz({ moduleId: step.moduleId, setId, mode: 'pruefung', fullrun: true, shuffle: step.shuffle })
}

/** Called by quiz-engine's finishQuiz() and by TsuView/AnalyseView when running as a queue step. */
export async function recordFullrunStep(moduleId: string, result: FullrunStepResult): Promise<void> {
  const fr = useFullrunStore()
  fr.recordResult(moduleId, result)
  await launchCurrentStep()
}

async function finalizeQueue(): Promise<void> {
  const fr = useFullrunStore()
  const appStore = useAppStore()
  const q = fr.state
  if (!q) return
  fr.finish()
  if (q.kind === 'simulation') {
    const sheet = await computeScoresheet(q.results)
    const n = q.simN || appStore.state.sims.length + 1
    appStore.state.sims.push({ n, ts: Date.now(), sheet })
    appStore.saveState()
    appStore.navigate('scoresheet', { idx: appStore.state.sims.length - 1 })
  } else if (q.kind === 'dgpOnly') {
    appStore.navigate('dgptest')
  } else {
    appStore.navigate('fullrun')
  }
}

/**
 * Official-format Bewertungsblatt. Ported from the original's computeScoresheet(): per-module
 * thresholds for the 20 DGP subcategories come from each module's own JSON (schwellePct);
 * Fachtest/Sprache/TsU/DGP-aggregate thresholds are the original's hardcoded constants.
 */
export async function computeScoresheet(results: Record<string, FullrunStepResult>): Promise<Scoresheet> {
  const g = (k: string): FullrunStepResult => results[k] || { kind: 'quiz', pct: null }
  const num = (x: unknown): x is number => typeof x === 'number'

  const re = g('recht')
  const ge = g('geschichte')
  const wi = g('wirtschaft')
  const eng = g('englisch')
  const eng2 = g('englischv2')
  const ev3 = g('englischv3')
  const rus = g('russisch')
  const tsu = g('tsu')
  const pa = g('analyse')

  const fachE = (re.earned || 0) + (ge.earned || 0) + (wi.earned || 0)
  const fachT = (re.total || 0) + (ge.total || 0) + (wi.total || 0)
  const fachPct = fachT ? Math.round((fachE / fachT) * 100) : 0

  const dgpRows: ScoresheetRow[] = []
  for (const id of DGP_ONLY_MODULE_IDS) {
    const r = g(id)
    const name = MODULE_META.find((m) => m.id === id)?.title || id
    // schwellePct is a property of the module itself, not of the attempt — load it even for
    // categories that were skipped (Docs/PORT_STATUS.md gap #2), so the Scoresheet shows the
    // real threshold instead of falling through to the "(Teil der Fachtests)" placeholder text.
    const mod = await loadModule(id)
    const schwellePct = mod.schwellePct ?? null
    dgpRows.push({
      key: id,
      name,
      earned: r.earned ?? null,
      total: r.total ?? null,
      pct: num(r.pct) ? r.pct : null,
      comp: true,
      schwellePct,
      pass: num(r.pct) && schwellePct != null ? r.pct >= schwellePct : null
    })
  }

  const cogParts = dgpRows.map((r) => r.pct).filter(num)
  const cogPct = cogParts.length ? Math.round(cogParts.reduce((s, x) => s + x, 0) / cogParts.length) : null

  const rows: ScoresheetRow[] = [
    ...dgpRows,
    {
      key: 'dgpcog',
      name: 'DGP – Kognitiver Leistungstest',
      pct: cogPct,
      schwellePct: SCORESHEET_THRESHOLDS.dgpCognitiveSchwellePct,
      pass: (cogPct ?? 0) >= SCORESHEET_THRESHOLDS.dgpCognitiveSchwellePct
    },
    { key: 'recht', name: 'Recht', earned: re.earned ?? null, total: re.total ?? null, pct: num(re.pct) ? re.pct : null, comp: true, pass: null },
    { key: 'wirtschaft', name: 'VWL / Wirtschaft', earned: wi.earned ?? null, total: wi.total ?? null, pct: num(wi.pct) ? wi.pct : null, comp: true, pass: null },
    { key: 'geschichte', name: 'Geschichte / Politik', earned: ge.earned ?? null, total: ge.total ?? null, pct: num(ge.pct) ? ge.pct : null, comp: true, pass: null },
    {
      key: 'fach',
      name: 'Fachtests gesamt',
      earned: fachE,
      total: fachT,
      pct: fachPct,
      max: SCORESHEET_THRESHOLDS.fachMaxPunkte,
      schwelle: SCORESHEET_THRESHOLDS.fachSchwellePunkte,
      pass: fachE >= SCORESHEET_THRESHOLDS.fachSchwellePunkte
    },
    {
      key: 'englisch',
      name: 'Test Englisch v1',
      earned: eng.earned ?? null,
      total: eng.total ?? null,
      pct: num(eng.pct) ? eng.pct : null,
      schwellePct: SCORESHEET_THRESHOLDS.sprachSchwellePct,
      pass: (eng.pct ?? 0) >= SCORESHEET_THRESHOLDS.sprachSchwellePct
    },
    {
      key: 'englischv2',
      name: 'Test Englisch v2',
      earned: eng2.earned ?? null,
      total: eng2.total ?? null,
      pct: num(eng2.pct) ? eng2.pct : null,
      schwellePct: SCORESHEET_THRESHOLDS.sprachSchwellePct,
      pass: (eng2.pct ?? 0) >= SCORESHEET_THRESHOLDS.sprachSchwellePct
    },
    {
      key: 'englischv3',
      name: 'Test Englisch v3',
      earned: ev3.earned ?? null,
      total: ev3.total ?? null,
      pct: num(ev3.pct) ? ev3.pct : null,
      schwellePct: SCORESHEET_THRESHOLDS.sprachSchwellePct,
      pass: (ev3.pct ?? 0) >= SCORESHEET_THRESHOLDS.sprachSchwellePct
    },
    {
      key: 'russisch',
      name: 'Test Zweitsprache',
      earned: rus.earned ?? null,
      total: rus.total ?? null,
      pct: num(rus.pct) ? rus.pct : null,
      schwellePct: SCORESHEET_THRESHOLDS.sprachSchwellePct,
      pass: (rus.pct ?? 0) >= SCORESHEET_THRESHOLDS.sprachSchwellePct
    },
    {
      key: 'tsu',
      name: 'Test situationsbez. Urteilen (TsU)',
      earned: tsu.earned ?? null,
      total: tsu.total ?? null,
      pct: num(tsu.pct) ? tsu.pct : null,
      schwellePct: SCORESHEET_THRESHOLDS.tsuSchwellePct,
      pass: (tsu.pct ?? 0) >= SCORESHEET_THRESHOLDS.tsuSchwellePct
    }
  ]

  const main = [cogPct, fachPct, eng.pct, eng2.pct, ev3.pct, rus.pct, tsu.pct].filter(num)
  const gesamt = main.length ? Math.round(main.reduce((s, x) => s + x, 0) / main.length) : 0
  const paPct = num(pa.pct) ? pa.pct : null
  // No AI feedback in this build (Docs/PORT_STATUS.md gap #3) — the original derives paNote by
  // regex-parsing an AI-generated "x/100" grade out of the essay feedback text, so it's always
  // null here. Politische Analyse never gates `bestanden` (optional leg), only adjusts gesamtNachPA.
  const paNote: number | null = null
  const gesamtNachPA = paPct != null ? Math.round(gesamt * 0.85 + paPct * 0.15) : null
  const bestanden = rows.filter((r) => !r.comp).every((r) => r.pass === true)

  return { rows, fachE, fachT, fachPct, cogPct, gesamt, paPct, paNote, gesamtNachPA, bestanden }
}
