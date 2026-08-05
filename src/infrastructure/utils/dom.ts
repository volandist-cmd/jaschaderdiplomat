// DOM Utility Functions

/**
 * Create a DOM element with optional class name
 */
export function createElement(tag: string, className?: string, text?: string): HTMLElement {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (text) el.textContent = text
  return el
}

/**
 * Safely query selector
 */
export function querySelector<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector)
}

/**
 * Safely query selector all
 */
export function querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
  return document.querySelectorAll<T>(selector)
}

/**
 * Scroll to top of page
 */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Show toast notification (simple implementation)
 */
export function showToast(message: string, duration = 3000): void {
  // Create toast element
  const toast = createElement('div', 'toast')
  toast.textContent = message
  document.body.appendChild(toast)

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10)

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback method
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}

/**
 * Download text as file
 */
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Download JSON as file
 */
export function downloadJson(data: any, filename: string): void {
  const text = JSON.stringify(data, null, 2)
  downloadText(text, filename)
}
