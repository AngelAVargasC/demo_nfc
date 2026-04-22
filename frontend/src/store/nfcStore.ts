import { create } from 'zustand'

interface NFCUser {
  full_name: string
  degree: number
  photo_url: string | null
  logia_id: string | null
  logia: { name: string; number: string } | null
  email: string
  role: string
  whatsapp?: string | null
}

interface AccessResult {
  result: 'granted' | 'denied' | null
  user: NFCUser | null
  reason: string | null
  message: string | null
  timestamp: string | null
}

interface NFCState {
  lastResult: AccessResult
  history: AccessResult[]
  isScanning: boolean
  setScanning: (v: boolean) => void
  setResult: (r: Omit<AccessResult, 'timestamp'>) => void
  clearResult: () => void
}

const EMPTY: AccessResult = { result: null, user: null, reason: null, message: null, timestamp: null }

export const useNFCStore = create<NFCState>((set) => ({
  lastResult: EMPTY,
  history: [],
  isScanning: false,
  setScanning: (v) => set({ isScanning: v }),
  setResult: (r) => {
    const full = { ...r, timestamp: new Date().toISOString() }
    set((s) => ({ lastResult: full, history: [full, ...s.history].slice(0, 30) }))
  },
  clearResult: () => set({ lastResult: EMPTY }),
}))
