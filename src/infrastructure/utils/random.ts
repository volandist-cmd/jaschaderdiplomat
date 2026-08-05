// Random utilities
// Extracted from monolithic application

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Pick random element from array
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Pick element weighted by tier
 */
export function pickByTier<T extends { tier: number }>(
  pool: T[],
  targetTier: number
): T {
  // Weight calculation: closer to target tier = higher weight
  const weighted = pool.map((item) => ({
    item,
    weight: Math.max(1, 5 - Math.abs(item.tier - targetTier))
  }))

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  let rand = Math.random() * totalWeight

  for (const w of weighted) {
    rand -= w.weight
    if (rand <= 0) return w.item
  }

  return weighted[weighted.length - 1].item
}

/**
 * Calculate tier for question index in a quiz
 * Earlier questions are easier (tier 1-2), later questions are harder (tier 4-5)
 */
export function tierForIndex(index: number, total: number): number {
  const progress = index / total
  if (progress < 0.2) return 1
  if (progress < 0.4) return 2
  if (progress < 0.6) return 3
  if (progress < 0.8) return 4
  return 5
}
