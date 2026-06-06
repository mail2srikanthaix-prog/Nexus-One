import { create } from 'zustand'

interface AuthUser {
  name: string
  email: string
  role: string
}

interface AuthState {
  appState: 'landing' | 'login' | 'app'
  user: AuthUser | null
  isAuthenticated: boolean
  setAppState: (state: 'landing' | 'login' | 'app') => void
  login: (user: AuthUser) => void
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  appState: 'landing',
  user: null,
  isAuthenticated: false,

  setAppState: (state) => set({ appState: state }),

  login: (user) => set({ user, isAuthenticated: true, appState: 'app' }),

  logout: () => {
    fetch('/api/auth/signout', { method: 'POST' }).catch(() => {})
    set({ user: null, isAuthenticated: false, appState: 'landing' })
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/session-check')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) {
          set({ user: data.user, isAuthenticated: true, appState: 'app' })
        }
      }
    } catch {
      // Not authenticated
    }
  },
}))
