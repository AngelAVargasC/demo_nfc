import { useEffect, useRef } from 'react'

type Sentinel = { release: () => Promise<void>; addEventListener?: (t: string, cb: () => void) => void }

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<Sentinel | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock
        if (!wl?.request) return
        const sentinel: Sentinel = await wl.request('screen')
        if (cancelled) {
          try { await sentinel.release() } catch {}
          return
        }
        sentinelRef.current = sentinel
      } catch {
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      const s = sentinelRef.current
      sentinelRef.current = null
      if (s) { s.release().catch(() => {}) }
    }
  }, [active])
}
