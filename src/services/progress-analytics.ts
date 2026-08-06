// Progress analytics — pure functions over attempts/errorLog/subtypeStats.
// Ported from the original app's categoryStat()/categoryTrend()/weakestSubtypes()/
// repeatedMistakes() (jaschaderdiplomat.html ~line 2790), plus new functions for the
// dashboard trend chart, category heatmap, pace analysis and weekly digest.
import { MODULE_META } from '@/domain/models/constants'
import type {
  Attempt,
  ErrorEntry,
  SubtypeStat,
  CategoryStat,
  CategoryTrend,
  SubtypeWeakness,
  RepeatedMistake,
  DailyPoint,
  CategoryHeatmapRow,
  PaceInsight,
  WeeklyDigest,
  ModuleData
} from '@/domain/models/types'

const DAY = 86400000

export function modName(id: string): string {
  return MODULE_META.find((m) => m.id === id)?.title || id
}

function avgPct(list: Attempt[]): number | null {
  return list.length ? Math.round(list.reduce((s, a) => s + a.pct, 0) / list.length) : null
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function categoryStat(attempts: Attempt[], id: string): CategoryStat {
  const all = attempts.filter((a) => a.module === id)
  const ue = all.filter((a) => a.mode === 'uebung')
  const pr = all.filter((a) => a.mode === 'pruefung')
  const lastTs = all.length ? Math.max(...all.map((a) => a.ts)) : null
  return {
    id,
    name: modName(id),
    n: all.length,
    avg: avgPct(all),
    best: all.length ? Math.round(Math.max(...all.map((a) => a.pct))) : null,
    ueN: ue.length,
    ueAvg: avgPct(ue),
    prN: pr.length,
    prAvg: avgPct(pr),
    lastTs,
    daysSince: lastTs != null ? Math.floor((Date.now() - lastTs) / DAY) : null
  }
}

/** Standard deviation of a category's scores — a category oscillating between 90% and 40% needs a different fix than one steady at 55%. */
export function categoryVariance(attempts: Attempt[], id: string): number | null {
  const all = attempts.filter((a) => a.module === id)
  if (all.length < 3) return null
  const mean = all.reduce((s, a) => s + a.pct, 0) / all.length
  const variance = all.reduce((s, a) => s + (a.pct - mean) ** 2, 0) / all.length
  return Math.round(Math.sqrt(variance))
}

export function categoryTrend(attempts: Attempt[], id: string): CategoryTrend {
  const all = attempts.filter((a) => a.module === id).sort((a, b) => a.ts - b.ts)
  const n = all.length
  if (n < 4) return { n, firstAvg: null, secondAvg: null, delta: null, dir: null }
  const half = Math.floor(n / 2)
  const firstAvg = avgPct(all.slice(0, half))
  const secondAvg = avgPct(all.slice(n - half))
  const delta = secondAvg! - firstAvg!
  const dir = delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat'
  return { n, firstAvg, secondAvg, delta, dir }
}

export function weakestSubtypes(subtypeStats: Record<string, SubtypeStat>, errorLog: ErrorEntry[], minSeen: number): SubtypeWeakness[] {
  const out: SubtypeWeakness[] = []
  for (const key of Object.keys(subtypeStats)) {
    const sep = key.lastIndexOf('::')
    const mod = key.slice(0, sep)
    const cat = key.slice(sep + 2)
    const s = subtypeStats[key]
    if (s.seen < minSeen) continue
    const errs = errorLog.filter((e) => e.module === mod && (e.cat || '(allgemein)') === cat && e.chosen)
    const counts: Record<string, number> = {}
    errs.forEach((e) => { counts[e.chosen!] = (counts[e.chosen!] || 0) + 1 })
    let topChoice: string | null = null
    let topCount = 0
    for (const c of Object.keys(counts)) {
      if (counts[c] > topCount) { topCount = counts[c]; topChoice = c }
    }
    out.push({
      module: mod,
      moduleName: modName(mod),
      cat,
      seen: s.seen,
      wrong: s.wrong,
      rate: Math.round((s.wrong / s.seen) * 100),
      topChoice: topCount >= 2 ? topChoice : null,
      topCount
    })
  }
  out.sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
  return out
}

/** Same question wrong more than once — the strongest signal of an unresolved misunderstanding, as opposed to a one-off slip. */
export function repeatedMistakes(errorLog: ErrorEntry[]): RepeatedMistake[] {
  const byKey: Record<string, RepeatedMistake> = {}
  for (const e of errorLog) {
    const key = `${e.module}::${e.cat || ''}::${e.q}`
    if (!byKey[key]) {
      byKey[key] = { module: e.module, moduleName: modName(e.module), cat: e.cat || '', q: e.q, correct: e.correct, n: 0, lastTs: 0, lastChosen: null }
    }
    const r = byKey[key]
    r.n++
    if (e.ts >= r.lastTs) { r.lastTs = e.ts; r.lastChosen = e.chosen }
  }
  return Object.values(byKey)
    .filter((r) => r.n >= 2)
    .sort((a, b) => b.n - a.n || b.lastTs - a.lastTs)
}

/** Daily aggregate accuracy across all attempts, for the dashboard trend line. */
export function dailyTrend(attempts: Attempt[], days: number): DailyPoint[] {
  const byDay: Record<string, Attempt[]> = {}
  for (const a of attempts) {
    const k = dayKey(a.ts)
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(a)
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const points: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY)
    const k = d.toISOString().slice(0, 10)
    const list = byDay[k] || []
    points.push({ day: k, avg: list.length ? avgPct(list) : null, n: list.length })
  }
  return points
}

/** Per-category-per-day accuracy grid for the dashboard heatmap. Only categories with at least one attempt are included, capped at `maxRows` (most recently practiced first). */
export function categoryDayHeatmap(attempts: Attempt[], days: number, maxRows: number): CategoryHeatmapRow[] {
  const touched = Array.from(new Set(attempts.map((a) => a.module)))
  const withLast = touched.map((id) => ({
    id,
    lastTs: Math.max(...attempts.filter((a) => a.module === id).map((a) => a.ts))
  }))
  withLast.sort((a, b) => b.lastTs - a.lastTs)
  const ids = withLast.slice(0, maxRows).map((x) => x.id)
  // Keep canonical MODULE_META order for readability once selected, rather than recency order.
  const ordered = MODULE_META.filter((m) => ids.includes(m.id)).map((m) => m.id)
  return ordered.map((id) => ({
    id,
    name: modName(id),
    cells: dailyTrend(attempts.filter((a) => a.module === id), days)
  }))
}

/** Flags whether a category's biggest blocker looks like time pressure (pace) or actual knowledge gaps, using each attempt's recorded secAvg against the module's own time budget. */
export function paceInsights(attempts: Attempt[], moduleData: Record<string, ModuleData>, statModIds: readonly string[]): PaceInsight[] {
  const out: PaceInsight[] = []
  for (const id of statModIds) {
    const all = attempts.filter((a) => a.module === id)
    if (all.length < 2) continue
    const d = moduleData[id]
    if (!d) continue
    const secBudget = d.secPerItem ?? (d.totalSec && d.count ? d.totalSec / d.count : null)
    if (!secBudget) continue
    const avgPctVal = avgPct(all)!
    const secAvg = all.reduce((s, a) => s + a.secAvg, 0) / all.length
    const paceRatio = secAvg / secBudget
    // Slow AND not scoring well -> likely running out of time before finishing; fast AND not
    // scoring well -> likely a genuine knowledge gap rather than a pace problem.
    if (avgPctVal < 60 && paceRatio >= 0.85) {
      out.push({ id, name: modName(id), avgPct: avgPctVal, secAvg: Math.round(secAvg * 10) / 10, secBudget, paceRatio: Math.round(paceRatio * 100) / 100, kind: 'tempo' })
    } else if (avgPctVal < 60 && paceRatio < 0.5) {
      out.push({ id, name: modName(id), avgPct: avgPctVal, secAvg: Math.round(secAvg * 10) / 10, secBudget, paceRatio: Math.round(paceRatio * 100) / 100, kind: 'wissen' })
    }
  }
  return out.sort((a, b) => a.avgPct - b.avgPct)
}

/** Rule-based "what changed this week" summary — no AI call needed, reuses the same aggregation as the trend chart/line. */
export function weeklyDigest(attempts: Attempt[], statModIds: readonly string[]): WeeklyDigest {
  const now = Date.now()
  const thisWeek = attempts.filter((a) => now - a.ts < 7 * DAY)
  const lastWeek = attempts.filter((a) => now - a.ts >= 7 * DAY && now - a.ts < 14 * DAY)

  const idsThisWeek = new Set(thisWeek.map((a) => a.module))
  const idsBefore = new Set(attempts.filter((a) => now - a.ts >= 7 * DAY).map((a) => a.module))
  const newlyPracticed = Array.from(idsThisWeek).filter((id) => !idsBefore.has(id)).map(modName)

  let mostImproved: { name: string; delta: number } | null = null
  let mostDeclined: { name: string; delta: number } | null = null
  for (const id of statModIds) {
    const thisAvg = avgPct(thisWeek.filter((a) => a.module === id))
    const lastAvg = avgPct(lastWeek.filter((a) => a.module === id))
    if (thisAvg == null || lastAvg == null) continue
    const delta = thisAvg - lastAvg
    if (delta > 0 && (!mostImproved || delta > mostImproved.delta)) mostImproved = { name: modName(id), delta }
    if (delta < 0 && (!mostDeclined || delta < mostDeclined.delta)) mostDeclined = { name: modName(id), delta }
  }

  return {
    attemptsThisWeek: thisWeek.length,
    attemptsLastWeek: lastWeek.length,
    avgThisWeek: avgPct(thisWeek),
    avgLastWeek: avgPct(lastWeek),
    newlyPracticed,
    mostImproved,
    mostDeclined
  }
}
