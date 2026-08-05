// Format utilities
// Time, date, and number formatting

/**
 * Format seconds as MM:SS
 */
export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${pad2(m)}:${pad2(s)}`
}

/**
 * Pad number to 2 digits
 */
export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/**
 * Format number with thousands separator (German style: 1.234 or 1.234.567)
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('de-DE')
}

/**
 * K4-style number formatting (thousands separator)
 */
export function k4n(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString('de-DE')
  }
  return String(n)
}

/**
 * Format date as German locale
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString + 'T00:00:00')
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * Calculate days until a target date
 */
export function daysUntil(dateString: string): number {
  try {
    const target = new Date(dateString + 'T00:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / 86400000)
  } catch {
    return -1
  }
}

/**
 * Format duration in seconds as human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} Std.`)
  if (minutes > 0) parts.push(`${minutes} Min.`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} Sek.`)

  return parts.join(' ')
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Get performance band label and color based on percentage
 */
export function getBand(pct: number): { t: string; c: string } {
  if (pct >= 80) return { t: 'sehr stark', c: 'green' }
  if (pct >= 60) return { t: 'solide', c: 'navy' }
  if (pct >= 40) return { t: 'ausbaufähig', c: 'gold' }
  return { t: 'viel Übung nötig', c: 'red' }
}
