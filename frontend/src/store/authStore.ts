import { create } from 'zustand'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  status: string
  degree: number
  logia_id: string | null
  photo_url: string | null
}

interface AuthState {
  accessToken: string | null
  user: User | null
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  logout: () => set({ accessToken: null, user: null }),
  isAuthenticated: () => !!get().accessToken,
}))
