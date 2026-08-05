// Simple client-side router
// Manages view navigation without full Vue Router for now

export type RouteParams = Record<string, any>

export interface Route {
  view: string
  params?: RouteParams
}

class Router {
  private currentRoute: Route = { view: 'dashboard', params: {} }
  private listeners: Array<(route: Route) => void> = []

  /**
   * Navigate to a new route
   */
  navigate(view: string, params: RouteParams = {}): void {
    this.currentRoute = { view, params }
    this.notifyListeners()
    
    // Scroll to top on navigation
    window.scrollTo({ top: 0 })
  }

  /**
   * Get current route
   */
  getCurrentRoute(): Route {
    return { ...this.currentRoute }
  }

  /**
   * Subscribe to route changes
   */
  onRouteChange(callback: (route: Route) => void): () => void {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of route change
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.currentRoute))
  }

  /**
   * Get parameter from current route
   */
  getParam(key: string): any {
    return this.currentRoute.params?.[key]
  }

  /**
   * Check if current view matches
   */
  isView(view: string): boolean {
    return this.currentRoute.view === view
  }
}

// Singleton instance
export const router = new Router()
