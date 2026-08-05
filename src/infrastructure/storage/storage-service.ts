// Storage Service
// LocalStorage wrapper with JSON serialization

export class StorageService {
  private readonly prefix: string

  constructor(prefix = 'prufungstrainer') {
    this.prefix = prefix
  }

  /**
   * Save a value to localStorage
   */
  set<T>(key: string, value: T): void {
    try {
      const fullKey = `${this.prefix}-${key}`
      const serialized = JSON.stringify(value)
      localStorage.setItem(fullKey, serialized)
    } catch (error) {
      console.error(`Failed to save ${key}:`, error)
    }
  }

  /**
   * Retrieve a value from localStorage
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = `${this.prefix}-${key}`
      const serialized = localStorage.getItem(fullKey)
      if (serialized === null) return null
      return JSON.parse(serialized) as T
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error)
      return null
    }
  }

  /**
   * Remove a value from localStorage
   */
  remove(key: string): void {
    try {
      const fullKey = `${this.prefix}-${key}`
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error)
    }
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const fullKey = `${this.prefix}-${key}`
    return localStorage.getItem(fullKey) !== null
  }

  /**
   * Clear all keys with this prefix
   */
  clear(): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${this.prefix}-`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  /**
   * Check if persistent storage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if we have durable storage (not incognito/private mode)
   */
  async hasDurableStorage(): Promise<boolean> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return estimate.usage !== undefined && estimate.quota !== undefined
      } catch {
        return false
      }
    }
    return false
  }
}

// Singleton instance
export const storage = new StorageService()
