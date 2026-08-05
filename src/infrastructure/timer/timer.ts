// Timer Service
// Manages countdown timers for quizzes and analyses

export interface TimerConfig {
  durationSeconds: number
  warningThreshold?: number
  onTick?: (remaining: number) => void
  onWarning?: () => void
  onZero?: () => void
}

export class Timer {
  private intervalId: number | null = null
  private remaining: number
  private readonly config: TimerConfig
  private isPaused = false

  constructor(config: TimerConfig) {
    this.config = config
    this.remaining = config.durationSeconds
  }

  /**
   * Start the timer
   */
  start(): void {
    if (this.intervalId !== null) return

    this.intervalId = window.setInterval(() => {
      if (this.isPaused) return

      this.remaining--

      // Call tick callback
      if (this.config.onTick) {
        this.config.onTick(this.remaining)
      }

      // Check for warning threshold
      if (
        this.config.warningThreshold &&
        this.remaining === this.config.warningThreshold &&
        this.config.onWarning
      ) {
        this.config.onWarning()
      }

      // Check if time is up
      if (this.remaining <= 0) {
        this.remaining = 0
        this.stop()
        if (this.config.onZero) {
          this.config.onZero()
        }
      }
    }, 1000)
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Pause the timer
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * Resume the timer
   */
  resume(): void {
    this.isPaused = false
  }

  /**
   * Reset the timer to initial duration
   */
  reset(): void {
    this.stop()
    this.remaining = this.config.durationSeconds
    this.isPaused = false
  }

  /**
   * Get remaining time in seconds
   */
  getRemaining(): number {
    return this.remaining
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.intervalId !== null
  }

  /**
   * Add time to the timer
   */
  addTime(seconds: number): void {
    this.remaining += seconds
  }

  /**
   * Set remaining time
   */
  setRemaining(seconds: number): void {
    this.remaining = seconds
  }
}

// Global timer instance (for backward compatibility with monolithic code)
let globalTimer: Timer | null = null

export function createGlobalTimer(config: TimerConfig): Timer {
  if (globalTimer) {
    globalTimer.stop()
  }
  globalTimer = new Timer(config)
  return globalTimer
}

export function getGlobalTimer(): Timer | null {
  return globalTimer
}

export function clearGlobalTimer(): void {
  if (globalTimer) {
    globalTimer.stop()
    globalTimer = null
  }
}
