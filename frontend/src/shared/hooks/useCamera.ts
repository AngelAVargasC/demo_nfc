import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Acceso a la cámara web (getUserMedia) para capturar fotogramas.
 * Devuelve un ref para el <video>, controles start/stop y capture().
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      setActive(true)
      // El <video> está siempre montado: adjuntamos el stream directamente.
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try { await videoRef.current.play() } catch { /* play interrumpido */ }
      }
    } catch {
      setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      setActive(false)
    }
  }, [])

  // Red de seguridad: si el <video> aún no tenía el stream, lo adjunta.
  useEffect(() => {
    const video = videoRef.current
    if (active && streamRef.current && video && !video.srcObject) {
      video.srcObject = streamRef.current
      video.play().catch(() => {})
    }
  })

  /** Captura el fotograma actual del video como Blob JPEG. */
  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      if (!video || !video.videoWidth) return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    })
  }, [])

  // Apaga la cámara al desmontar.
  useEffect(() => () => stop(), [stop])

  return { videoRef, active, error, start, stop, capture }
}
