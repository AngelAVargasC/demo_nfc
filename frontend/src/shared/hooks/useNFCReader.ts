import { useCallback, useEffect, useRef, useState } from 'react'

export function normalizeUid(raw: string): string {
  const clean = (raw || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  if (!clean) return ''
  return clean.match(/.{1,2}/g)?.join(':') ?? clean
}

type ReadCallback = (uid: string) => void

interface UseNFCReaderReturn {
  active: boolean
  error: string | null
  isSupported: boolean
  start: (onRead: ReadCallback, onDetect?: () => void) => Promise<boolean>
  stop: () => void
  setCallback: (onRead: ReadCallback | null) => void
  checkPermission: () => Promise<'granted' | 'prompt' | 'denied' | 'unknown'>
}

export function useNFCReader(options: { cooldownMs?: number; autoKeepAlive?: boolean } = {}): UseNFCReaderReturn {
  const { cooldownMs = 1500, autoKeepAlive = true } = options
  const detectListenerRef = useRef<(() => void) | null>(null)
  const readerRef = useRef<NDEFReader | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const listenerRef = useRef<ReadCallback | null>(null)
  const lastReadRef = useRef<{ uid: string; at: number } | null>(null)
  const desiredActiveRef = useRef(false)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startingRef = useRef(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported = typeof window !== 'undefined' && 'NDEFReader' in window

  const cleanupReader = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    readerRef.current = null
    setActive(false)
  }, [])

  const stop = useCallback(() => {
    desiredActiveRef.current = false
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
    listenerRef.current = null
    detectListenerRef.current = null
    lastReadRef.current = null
    cleanupReader()
  }, [cleanupReader])

  const setCallback = useCallback((cb: ReadCallback | null) => {
    listenerRef.current = cb
  }, [])

  const internalStart = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Este dispositivo/navegador no soporta Web NFC. Usa Android + Chrome.')
      return false
    }
    if (startingRef.current) return false
    if (readerRef.current) return true

    startingRef.current = true
    try {
      const reader = new NDEFReader()
      const controller = new AbortController()

      reader.addEventListener('reading', (ev: NDEFReadingEvent) => {
        detectListenerRef.current?.()
        const raw = ev.serialNumber?.trim()
        if (!raw) return
        const uid = normalizeUid(raw)
        if (!uid) return
        const now = Date.now()
        const last = lastReadRef.current
        if (last && last.uid === uid && now - last.at < cooldownMs) return
        lastReadRef.current = { uid, at: now }
        listenerRef.current?.(uid)
      })

      await reader.scan({ signal: controller.signal })
      readerRef.current = reader
      controllerRef.current = controller
      setActive(true)
      setError(null)
      return true
    } catch (e: any) {
      setError(e?.message ?? 'No fue posible iniciar NFC')
      setActive(false)
      return false
    } finally {
      startingRef.current = false
    }
  }, [cooldownMs, isSupported])

  const scheduleRestart = useCallback((delayMs = 1500) => {
    if (!autoKeepAlive) return
    if (!desiredActiveRef.current) return
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
    restartTimeoutRef.current = setTimeout(async () => {
      restartTimeoutRef.current = null
      if (!desiredActiveRef.current) return
      if (document.visibilityState !== 'visible') return
      if (readerRef.current) return
      const ok = await internalStart()
      if (!ok) scheduleRestart(Math.min(delayMs * 2, 8000))
    }, delayMs)
  }, [autoKeepAlive, internalStart])

  const start = useCallback(async (onRead: ReadCallback, onDetect?: () => void) => {
    listenerRef.current = onRead
    detectListenerRef.current = onDetect ?? null
    desiredActiveRef.current = true
    const ok = await internalStart()
    if (!ok && autoKeepAlive) scheduleRestart(2000)
    return ok
  }, [autoKeepAlive, internalStart, scheduleRestart])

  const checkPermission = useCallback(async () => {
    try {
      const perm: any = await (navigator as any).permissions?.query?.({ name: 'nfc' as any })
      if (!perm) return 'unknown' as const
      return (perm.state as 'granted' | 'prompt' | 'denied') ?? 'unknown'
    } catch {
      return 'unknown' as const
    }
  }, [])

  // Auto-recover on visibility change (background -> foreground).
  useEffect(() => {
    if (!autoKeepAlive) return
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!desiredActiveRef.current) return
      if (readerRef.current) return
      scheduleRestart(300)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [autoKeepAlive, scheduleRestart])

  useEffect(() => () => { stop() }, [stop])

  return { active, error, isSupported, start, stop, setCallback, checkPermission }
}
