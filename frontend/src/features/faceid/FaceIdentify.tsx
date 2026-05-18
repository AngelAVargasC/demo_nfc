import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ScanFace, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/shared/services/api'
import { useCamera } from '@/shared/hooks/useCamera'
import { useFaceGuide, type GuideStatus } from '@/shared/hooks/useFaceGuide'

const KIOSK_KEY = import.meta.env.VITE_KIOSK_API_KEY || ''
const DEGREE_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }

const HOLD_MS = 700      // rostro estable antes de identificar
const RESULT_MS = 4500   // tiempo que se muestra el resultado antes de volver a escanear

type Phase = 'idle' | 'scanning' | 'identifying' | 'result'

type IdentifyResult = {
  result: 'granted' | 'denied'
  user?: { full_name?: string; degree?: number; email?: string } | null
  reason?: string | null
  message?: string | null
  confidence?: number | null
}

const STATUS_MSG: Record<GuideStatus, string> = {
  loading: 'Iniciando lector…',
  no_face: 'Acerca tu rostro al óvalo',
  multiple: 'Solo una persona a la vez',
  too_far: 'Acércate un poco',
  too_close: 'Aléjate un poco',
  off_center: 'Centra tu rostro en el óvalo',
  ok: 'Te veo — identificando…',
}

export default function FaceIdentify() {
  const camera = useCamera()
  const guide = useFaceGuide(camera.videoRef, camera.active)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<IdentifyResult | null>(null)

  const start = async () => {
    await camera.start()
    setPhase('scanning')
  }
  const stop = () => {
    camera.stop()
    setPhase('idle')
    setResult(null)
  }

  // Identificación. Ref para que el temporizador use siempre la versión fresca.
  const doIdentifyRef = useRef<() => void>(() => {})
  doIdentifyRef.current = async () => {
    if (phase !== 'scanning') return
    setPhase('identifying')
    try {
      const blob = await camera.capture()
      if (!blob) { setPhase('scanning'); return }
      const fd = new FormData()
      fd.append('file', blob, 'face.jpg')
      const { data } = await api.post('/access/face/identify', fd, {
        headers: KIOSK_KEY ? { 'X-Kiosk-Key': KIOSK_KEY } : undefined,
      })
      if (data.success) {
        setResult(data.data)
        setPhase('result')
      } else {
        toast.error(data.error || 'Error de reconocimiento')
        setPhase('scanning')
      }
    } catch {
      toast.error('Error de conexión con el servidor')
      setPhase('scanning')
    }
  }

  // Auto-identificación: el rostro lleva "ok" sostenido HOLD_MS.
  useEffect(() => {
    if (phase !== 'scanning' || guide.status !== 'ok') return
    const t = window.setTimeout(() => doIdentifyRef.current(), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, guide.status])

  // Tras mostrar el resultado, vuelve a escanear (listo para la siguiente persona).
  useEffect(() => {
    if (phase !== 'result') return
    const t = window.setTimeout(() => { setResult(null); setPhase('scanning') }, RESULT_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const ovalClass =
    !camera.active ? ''
      : guide.status === 'ok' ? ' faceid_oval_ok'
        : guide.status === 'no_face' || guide.status === 'multiple' ? ' faceid_oval_bad'
          : ' faceid_oval_warn'

  const scanning = phase === 'scanning' || phase === 'identifying'

  return (
    <div className="faceid_grid">
      <div className="faceid_card">
        <h3 className="faceid_h3">Lector de acceso</h3>

        <div className="faceid_video_wrap">
          <video className="faceid_video" ref={camera.videoRef} autoPlay playsInline muted />
          {!camera.active && <div className="faceid_video_off">Lector apagado</div>}
          {camera.active && scanning && (
            <>
              <div className={`faceid_oval${ovalClass}`} />
              <div className="faceid_guide_msg">
                {phase === 'identifying' ? 'Identificando…'
                  : guide.modelError ? 'Detector no disponible — usa el botón'
                    : STATUS_MSG[guide.status]}
              </div>
            </>
          )}
        </div>

        {phase === 'idle' && (
          <button className="faceid_btn" onClick={start}>
            <Camera size={16} /> Activar lector
          </button>
        )}
        {phase !== 'idle' && (
          <>
            <button
              className="faceid_btn"
              onClick={() => doIdentifyRef.current()}
              disabled={phase !== 'scanning'}
            >
              <ScanFace size={16} /> Identificar ahora
            </button>
            <button className="faceid_btn faceid_btn_secondary" onClick={stop}>
              <CameraOff size={16} /> Apagar lector
            </button>
          </>
        )}
        <div className="faceid_hint">{camera.error ?? ''}</div>
      </div>

      <div className={`faceid_result${
        phase === 'result' && result?.result === 'granted' ? ' faceid_result_granted'
          : phase === 'result' && result?.result === 'denied' ? ' faceid_result_denied' : ''
      }`}>
        {phase === 'idle' && <div className="faceid_result_idle">Activa el lector para comenzar</div>}
        {scanning && <div className="faceid_result_idle">Esperando rostro…</div>}

        {phase === 'result' && result?.result === 'granted' && (
          <>
            <CheckCircle size={56} color="#00a88e" />
            <div className="faceid_result_title faceid_result_title_ok">ACCESO PERMITIDO</div>
            <div className="faceid_result_name">{result.user?.full_name ?? 'Miembro'}</div>
            <div className="faceid_result_meta">
              {DEGREE_LABELS[result.user?.degree ?? 0] ?? '—'}
              {result.confidence != null && ` · ${(result.confidence * 100).toFixed(1)}% similitud`}
            </div>
          </>
        )}
        {phase === 'result' && result?.result === 'denied' && (
          <>
            <XCircle size={56} color="#ef4444" />
            <div className="faceid_result_title faceid_result_title_no">ACCESO DENEGADO</div>
            {result.user?.full_name && <div className="faceid_result_name">{result.user.full_name}</div>}
            <div className="faceid_result_reason">{result.message ?? 'No autorizado'}</div>
            {result.confidence != null && (
              <div className="faceid_result_meta">
                Mejor coincidencia: {(result.confidence * 100).toFixed(1)}% similitud
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
