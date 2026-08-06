// AI "Guru" service — ported from the original app's callAI()/buildGuruPrompt()/
// buildSubtypeGuruPrompt()/buildReadinessPrompt()/buildGuruFollowupPrompt()
// (jaschaderdiplomat.html ~line 405 and ~4095). Bring-your-own-key: a free Google Gemini API
// key (from Google AI Studio), stored only in this browser's localStorage, sent only to
// Google's API directly from the client - no backend involved, matching this app's static
// hosting model. See Bewusste Abweichungen & Entscheidungen.md (2026-08-01) for the model
// choice rationale carried over from the original.
import type { AppState, Attempt, CategoryStat } from '@/domain/models/types'
import { CONFIG } from '@/domain/models/constants'
import {
  categoryStat,
  categoryTrend,
  weakestSubtypes,
  repeatedMistakes,
  modName
} from './progress-analytics'

const GEMINI_MODEL = 'gemini-flash-latest'

export type AIErrorCode = 'NO_KEY' | 'NETWORK' | 'AUTH' | 'API'
export class AIError extends Error {
  code: AIErrorCode
  constructor(message: string, code: AIErrorCode) {
    super(message)
    this.code = code
  }
}

export async function callAI(apiKey: string | null, userText: string): Promise<string> {
  if (!apiKey) throw new AIError('Kein API-Schlüssel hinterlegt', 'NO_KEY')

  const body = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { maxOutputTokens: 1500 }
  }

  let res: Response
  try {
    // Key sent as the x-goog-api-key header rather than a ?key= query param - Google's
    // documented safer option, and it keeps the key out of any URL/access logs.
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) }
    )
  } catch {
    throw new AIError('Netzwerkfehler', 'NETWORK')
  }

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.error?.message || ''
    } catch {
      // ignore - detail stays empty
    }
    const looksLikeKeyProblem = /api.?key/i.test(detail) || [400, 401, 403].includes(res.status)
    throw new AIError(`API ${res.status}${detail ? `: ${detail}` : ''}`, looksLikeKeyProblem ? 'AUTH' : 'API')
  }

  const data = await res.json()
  const cand = (data.candidates || [])[0]
  const text: string = cand?.content?.parts ? cand.content.parts.map((p: any) => p.text || '').join('\n').trim() : ''
  if (!text) {
    if (cand?.finishReason && cand.finishReason !== 'STOP') {
      throw new AIError(`Von Gemini blockiert: ${cand.finishReason}`, 'API')
    }
    throw new AIError('leer', 'API')
  }
  return text
}

export function aiErrorText(e: unknown): string {
  const err = e as AIError
  if (err?.code === 'NO_KEY') return 'Kein API-Schlüssel hinterlegt – oben auf dem Dashboard unter „KI-Zugang" einrichten.'
  if (err?.code === 'AUTH') return 'Der hinterlegte API-Schlüssel wurde von Google abgelehnt (ungültig/abgelaufen/falscher Dienst) – unter „KI-Zugang" prüfen.'
  if (err?.code === 'NETWORK') return 'Netzwerkfehler – Internetverbindung prüfen und erneut versuchen.'
  return `Die KI-Analyse ist derzeit nicht verfügbar (${err?.message || 'unbekannter Fehler'}).`
}

function fmtErrExamples(errs: AppState['errorLog'], n: number): string {
  return errs.slice(-n).reverse().map((e) =>
    `    · Frage: "${e.q}" — gewählt: ${e.chosen || '(nicht beantwortet)'} — richtig: ${e.correct}`
  ).join('\n')
}

function tsDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE')
}

/** Main Guru analysis prompt - full performance picture across every category. */
export function buildGuruPrompt(state: AppState): string {
  const trends = CONFIG.STAT_MODS
    .map((id) => ({ id, name: modName(id), t: categoryTrend(state.attempts, id) }))
    .filter((x) => x.t.n >= 4)
  const weak = weakestSubtypes(state.subtypeStats, state.errorLog, 3)
  const catStats: CategoryStat[] = CONFIG.STAT_MODS.map((id) => categoryStat(state.attempts, id)).filter((s) => s.n > 0)

  let out = "Du bist ein erfahrener, sehr genauer Prüfungscoach – ein 'Lern-Guru' – für das schriftliche Auswahlverfahren des höheren Auswärtigen Dienstes (DGP-Test, Fachtests, Sprachtests, TSU). "
  out += 'Du bekommst detaillierte, echte Leistungs- und Fehlerdaten eines einzelnen Kandidaten. Deine Aufgabe ist NICHT, generisches Feedback zu geben (\'übe mehr\'), sondern die Daten wie ein Diagnostiker zu lesen: welche konkreten Denkfehler, Verwechslungen und Wissenslücken stecken hinter den falschen Antworten, und was folgt daraus für die Vorbereitung.\n\n'

  out += '=== GESAMTÜBERSICHT ===\n'
  catStats.forEach((s) => {
    out += `${s.name}: ${s.n} Versuche, Schnitt ${s.avg}% (Übung ${s.ueAvg != null ? s.ueAvg + '%' : '–'} / Prüfung ${s.prAvg != null ? s.prAvg + '%' : '–'}), Bestwert ${s.best}%, zuletzt geübt vor ${s.daysSince} Tag(en)\n`
  })

  if (trends.length) {
    out += '\n=== ENTWICKLUNG ÜBER DIE ZEIT (erste vs. zweite Hälfte aller Versuche) ===\n'
    trends.forEach((x) => {
      out += `${x.name}: ${x.t.firstAvg}% → ${x.t.secondAvg}% (${(x.t.delta ?? 0) > 0 ? '+' : ''}${x.t.delta} Prozentpunkte, ${x.t.n} Versuche)\n`
    })
  }

  if (weak.length) {
    out += '\n=== SCHWÄCHSTE AUFGABENTYPEN (Fehlerquote je Unterkategorie, mit Beispielen der tatsächlich falsch beantworteten Aufgaben) ===\n'
    weak.slice(0, 12).forEach((w) => {
      out += `\n${w.moduleName} — "${w.cat}": ${w.wrong}/${w.seen} falsch (${w.rate}%)${w.topChoice ? `, häufigste Fehlwahl: "${w.topChoice}" (${w.topCount}×)` : ''}\n`
      const errs = state.errorLog.filter((e) => e.module === w.module && (e.cat || '(allgemein)') === w.cat)
      out += fmtErrExamples(errs, 3) + '\n'
    })
  }

  const modeGaps = catStats.filter((s) => s.ueAvg != null && s.prAvg != null && Math.abs(s.ueAvg - s.prAvg) >= 15)
  if (modeGaps.length) {
    out += '\n=== AUFFÄLLIGE LÜCKE ÜBUNG vs. PRÜFUNG (kann auf Zeitdruck/Nervosität statt Wissenslücke hindeuten) ===\n'
    modeGaps.forEach((s) => { out += `${s.name}: Übung ${s.ueAvg}% vs. Prüfung ${s.prAvg}%\n` })
  }

  const repeats = repeatedMistakes(state.errorLog)
  if (repeats.length) {
    out += '\n=== WIEDERHOLTE FEHLER (dieselbe Frage mehrfach falsch beantwortet — stärkstes Signal für eine noch NICHT behobene Wissenslücke, nicht nur einen Ausrutscher) ===\n'
    repeats.slice(0, 10).forEach((r) => {
      out += `${r.moduleName}${r.cat ? ` — "${r.cat}"` : ''}: "${r.q}" — ${r.n}× falsch, zuletzt gewählt: ${r.lastChosen || '(nicht beantwortet)'} — richtig wäre: ${r.correct}\n`
    })
  }

  const neverTried = CONFIG.STAT_MODS.filter((id) => !state.attempts.some((a: Attempt) => a.module === id))
  if (neverTried.length) out += `\n=== NOCH NIE GEÜBT ===\n${neverTried.map(modName).join(', ')}\n`

  if (state.guruAnalysis && state.guruMeta) {
    out += `\n=== VORHERIGE ANALYSE (erstellt am ${tsDate(state.guruMeta.ts)}, auf Basis von ${state.guruMeta.errorCount} erfassten Fehlern) ===\n${state.guruAnalysis.slice(0, 1200)}\n(Gehe kurz darauf ein, was sich seitdem verändert hat.)\n`
  }

  out += '\nGib strukturiert und konkret auf Deutsch aus:\n'
    + '1. ÜBERGREIFENDE FEHLERMUSTER — wiederkehrende Denkfehler/Verwechslungstypen, die sich über mehrere Kategorien ziehen (nicht nur eine Liste schwacher Kategorien).\n'
    + "2. THEMATISCHE WISSENSLÜCKEN — benenne konkret, WAS inhaltlich noch fehlt oder verwechselt wird (mit Bezug auf die Beispiele oben), nicht 'mehr üben'.\n"
    + '3. WIEDERHOLTE FEHLER — falls vorhanden: warum genau scheitert der Kandidat an GENAU DENSELBEN Fragen erneut, obwohl er sie schon einmal falsch hatte? Das ist wichtiger als einmalige Fehler.\n'
    + '4. ÜBUNG VS. PRÜFUNG — falls es eine auffällige Lücke gibt: ist das eher ein Zeitdruck-/Nervositätsproblem oder ein echtes Wissensproblem?\n'
    + '5. ENTWICKLUNG — was hat sich verbessert, wo stagniert oder verschlechtert es sich, und (falls vorhanden) Bezug zur vorherigen Analyse.\n'
    + '6. PRIORISIERTER LERNPLAN — die 5 konkret wichtigsten nächsten Schritte, in Reihenfolge.\n'
    + 'Ehrlich, konkret, mit Datenbezug. Keine Höflichkeitsfloskeln, kein Blabla.'
  return out
}

/** Focused mini-analysis for one specific weak subtype. */
export function buildSubtypeGuruPrompt(state: AppState, mod: string, cat: string): string {
  const errs = state.errorLog.filter((e) => e.module === mod && (e.cat || '(allgemein)') === cat)
  const s = state.subtypeStats[`${mod}::${cat}`] || { seen: errs.length, wrong: errs.length }
  let out = 'Du bist Prüfungscoach für das schriftliche Auswahlverfahren des höheren Auswärtigen Dienstes. Analysiere fokussiert NUR den folgenden Aufgabentyp.\n\n'
  out += `Kategorie: ${modName(mod)}, Aufgabentyp: "${cat}"\n`
  if (mod === 'dgpserie') out += 'Wichtig: Bei Buchstabenreihen stehen die Buchstaben ausschließlich für ihre Position im Alphabet (A=1, B=2, … Z=26, Wraparound). NICHT als Wörter/Abkürzungen/Himmelsrichtungen interpretieren.\n'
  out += `Fehlerquote: ${s.wrong}/${s.seen} (${Math.round((s.wrong / s.seen) * 100)}%)\n\n`
  out += `Tatsächlich falsch beantwortete Aufgaben (neueste zuerst):\n${fmtErrExamples(errs, 8)}\n\n`
  out += 'Gib auf Deutsch, in maximal 6 Sätzen: (1) welches konkrete Muster/Missverständnis hinter diesen Fehlern steckt, (2) eine knappe, konkrete Eselsbrücke oder Faustregel, um es künftig richtig zu machen. Kein Blabla, direkt zur Sache.'
  return out
}

/** Honest exam-readiness verdict against each category's real passing threshold. */
export function buildReadinessPrompt(state: AppState, schwellePctFor: (id: string) => number | null): string {
  const catStats = CONFIG.STAT_MODS.map((id) => categoryStat(state.attempts, id))
  let out = 'Du bist Prüfungscoach für das schriftliche Auswahlverfahren des höheren Auswärtigen Dienstes. Beurteile ehrlich und differenziert, wie prüfungsreif dieser Kandidat aktuell ist – kein pauschales Schulterklopfen, aber auch keine unnötige Panikmache.\n\n'
  out += '=== LEISTUNGSDATEN JE KATEGORIE (mit Bestehensschwelle, sofern bekannt) ===\n'
  CONFIG.STAT_MODS.forEach((id) => {
    const s = catStats.find((x) => x.id === id)!
    const schwelle = schwellePctFor(id)
    if (s.n === 0) { out += `${modName(id)}: noch nicht geübt${schwelle != null ? ` (Schwelle ${schwelle}%)` : ''}\n`; return }
    const status = schwelle != null ? (s.avg! >= schwelle ? 'ÜBER Schwelle' : 'UNTER Schwelle') : ''
    out += `${modName(id)}: Schnitt ${s.avg}%, Bestwert ${s.best}%, ${s.n} Versuche${schwelle != null ? `, Schwelle ${schwelle}% (${status})` : ''}, zuletzt vor ${s.daysSince} Tag(en)\n`
  })
  if (state.sims?.length) {
    const sg = state.sims.map((s) => s.sheet.gesamt)
    out += `\nVollständige Prüfungssimulationen: ${state.sims.length}, Gesamt-Schnitt ${Math.round(sg.reduce((a, b) => a + b, 0) / sg.length)}%, letztes Ergebnis ${sg[sg.length - 1]}%\n`
  } else {
    out += '\nNoch keine vollständige Prüfungssimulation absolviert.\n'
  }
  const weak = weakestSubtypes(state.subtypeStats, state.errorLog, 3).slice(0, 8)
  if (weak.length) {
    out += `\nGrößte bekannte Schwachstellen nach Aufgabentyp:\n${weak.map((w) => `${w.moduleName} — ${w.cat}: ${w.rate}% Fehlerquote (${w.wrong}/${w.seen})`).join('\n')}\n`
  }
  out += '\nGib auf Deutsch aus:\n'
    + '1. GESAMTEINSCHÄTZUNG — in einem Satz: prüfungsreif, bedingt prüfungsreif, oder noch nicht.\n'
    + '2. WO ES SCHON REICHT — Kategorien, die zuverlässig über der Schwelle liegen.\n'
    + '3. GRÖSSTES RISIKO — die 2-3 Kategorien/Aufgabentypen, die im Ernstfall am ehesten zum Nichtbestehen führen würden, und warum.\n'
    + '4. WAS VOR DER PRÜFUNG NOCH PASSIEREN MUSS — konkret und priorisiert, realistisch für die verbleibende Zeit.\n'
    + 'Direkt, ehrlich, mit Datenbezug.'
  return out
}

/** Day-by-day / week-by-week study plan for the remaining time until the exam. */
export function buildStudyPlanPrompt(state: AppState, daysLeft: number, schwellePctFor: (id: string) => number | null): string {
  const catStats = CONFIG.STAT_MODS.map((id) => categoryStat(state.attempts, id))
  let out = 'Du bist Prüfungscoach für das schriftliche Auswahlverfahren des höheren Auswärtigen Dienstes. Erstelle einen konkreten, realistischen Lernplan für die verbleibende Zeit bis zur Prüfung.\n\n'
  out += `Verbleibende Zeit bis zur Prüfung: ${daysLeft} Tage.\n\n`
  out += '=== AKTUELLER STAND JE KATEGORIE ===\n'
  CONFIG.STAT_MODS.forEach((id) => {
    const s = catStats.find((x) => x.id === id)!
    const schwelle = schwellePctFor(id)
    if (s.n === 0) { out += `${modName(id)}: noch nicht geübt${schwelle != null ? ` (Schwelle ${schwelle}%)` : ''}\n`; return }
    out += `${modName(id)}: Schnitt ${s.avg}%${schwelle != null ? ` (Schwelle ${schwelle}%, ${s.avg! >= schwelle ? 'erreicht' : 'noch nicht erreicht'})` : ''}, zuletzt vor ${s.daysSince} Tag(en) geübt\n`
  })
  const weak = weakestSubtypes(state.subtypeStats, state.errorLog, 3).slice(0, 8)
  if (weak.length) {
    out += `\nBekannte Schwachstellen nach Aufgabentyp:\n${weak.map((w) => `${w.moduleName} — ${w.cat}: ${w.rate}% Fehlerquote`).join('\n')}\n`
  }
  out += `\nErstelle auf Deutsch einen Tag-für-Tag- bzw. wochenweise gegliederten Lernplan für die verbleibenden ${daysLeft} Tage (wähle die sinnvollste Granularität: einzelne Tage für die letzte Woche vor der Prüfung, Wochenblöcke für alles davor). Berücksichtige: `
    + 'Kategorien unter der Schwelle zuerst, aber keine Kategorie komplett vernachlässigen; realistisches Arbeitspensum neben einem normalen Alltag; die letzten 2-3 Tage vor der Prüfung nur noch Wiederholung/Auffrischung, keine neuen Themen mehr; mindestens eine vollständige Prüfungssimulation rechtzeitig vor dem Termin einplanen. '
    + 'Konkret und priorisiert, keine generischen Ratschläge.'
  return out
}

export function buildGuruFollowupPrompt(state: AppState, question: string): string {
  let ctx = `Du bist derselbe Lern-Guru wie zuvor und kennst die vollständigen Leistungsdaten dieses Kandidaten für das Auswahlverfahren des höheren Auswärtigen Dienstes. Deine vorherige Analyse:\n\n${state.guruAnalysis || '(noch keine Analyse erstellt)'}\n\n`
  if (state.guruChat?.length) {
    ctx += 'Bisheriger Gesprächsverlauf mit dem Kandidaten:\n'
    state.guruChat.forEach((m) => { ctx += `${m.role === 'user' ? 'Kandidat' : 'Guru'}: ${m.text}\n` })
  }
  ctx += `\nNeue Frage des Kandidaten: ${question}\n\nAntworte konkret und mit Bezug auf die Analyse/Daten, in maximal 5 Sätzen. Kein Blabla, keine Wiederholung der ganzen Analyse.`
  return ctx
}
