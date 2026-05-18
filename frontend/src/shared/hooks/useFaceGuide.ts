import { useEffect, useRef, useState, type RefObject } from 'react'
import * as faceapi from '@vladmandic/face-api'

/** Estado de la guía de rostro en vivo (para el flujo de enrolamiento). */
export type GuideStatus =
  | 'loading'
  | 'no_face'
  | 'multiple'
  | 'too_far'
  | 'too_close'
  | 'off_center'
  | 'ok'

// El modelo se carga una sola vez para toda la app.
let modelReady = false
let modelLoading: Promise<void> | null = null

function loadModel(): Promise<void> {
  if (modelReady) return Promise.resolve()
  if (!modelLoading) {
    modelLoading = faceapi.nets.tinyFaceDetector
      .loadFromUri('/models')
      .then(() => { modelReady = true })
  }
  return modelLoading
}

const DETECT_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

function evaluate(boxes: { x: number; y: number; width: number; height: number }[], vw: number, vh: number): GuideStatus {
  if (boxes.length === 0) return 'no_face'
  if (boxes.length > 1) return 'multiple'
  const b = boxes[0]
  const sizeFrac = b.width / vw
  if (sizeFrac < 0.32) return 'too_far'
  if (sizeFrac > 0.66) return 'too_close'
  const cx = (b.x + b.width / 2) / vw
  const cy = (b.y + b.height / 2) / vh
  if (Math.hypot(cx - 0.5, cy - 0.5) > 0.16) return 'off_center'
  return 'ok'
}

/**
 * Detecta el rostro en vivo sobre el <video> y devuelve un estado de guía
 * (centrado, distancia, etc.) para dar retroalimentación durante el enrolamiento.
 */
export function useFaceGuide(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<GuideStatus>('loading')
  const [ready, setReady] = useState(false)
  const [modelError, setModelError] = useState(false)
  const runningRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadModel()
      .then(() => { if (!cancelled) setReady(true) })
      .catch(() => { if (!cancelled) setModelError(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!enabled || !ready || modelError) {
      runningRef.current = false
      return
    }
    runningRef.current = true
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      if (!runningRef.current) return
      const video = videoRef.current
      if (video && video.videoWidth > 0) {
        try {
          const dets = await faceapi.detectAllFaces(video, DETECT_OPTS)
          setStatus(evaluate(dets.map((d) => d.box), video.videoWidth, video.videoHeight))
        } catch {
          /* ignora un fotograma fallido */
        }
      }
      if (runningRef.current) timer = setTimeout(tick, 220)
    }
    void tick()

    return () => {
      runningRef.current = false
      clearTimeout(timer)
    }
  }, [enabled, ready, modelError, videoRef])

  return { status, ready, modelError }
}
