let audioCtx: AudioContext | null = null

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  try {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!Ctor) return null
    audioCtx = new Ctor()
  } catch {
    audioCtx = null
  }
  return audioCtx
}

function beep(freq: number, durationMs: number, when = 0, volume = 0.2) {
  const ctx = ensureCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    const t = ctx.currentTime + when
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000)
    osc.start(t)
    osc.stop(t + durationMs / 1000 + 0.02)
  } catch {}
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return
  if (!('vibrate' in navigator)) return
  try { navigator.vibrate(pattern) } catch {}
}

export function feedbackRead() {
  vibrate(25)
  beep(1200, 50, 0, 0.18)
}

export function feedbackGranted() {
  vibrate([40, 30, 40])
  beep(880, 110, 0, 0.22)
  beep(1320, 160, 0.12, 0.22)
}

export function feedbackDenied() {
  vibrate([90, 50, 120])
  beep(320, 180, 0, 0.25)
  beep(220, 240, 0.18, 0.25)
}

export function primeAudioContext() {
  const ctx = ensureCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}
