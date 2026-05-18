import { useState } from 'react'
import { Camera, CameraOff, ScanFace, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/shared/services/api'
import { useCamera } from '@/shared/hooks/useCamera'

const KIOSK_KEY = import.meta.env.VITE_KIOSK_API_KEY || ''
const DEGREE_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }

type IdentifyResult = {
  result: 'granted' | 'denied'
  user?: { full_name?: string; degree?: number; email?: string } | null
  reason?: string | null
  message?: string | null
  confidence?: number | null
}

export default function FaceIdentify() {
  const camera = useCamera()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<IdentifyResult | null>(null)

  const handleIdentify = async () => {
    setBusy(true)
    setResult(null)
    try {
      const blob = await camera.capture()
      if (!blob) { toast.error('No se pudo capturar la imagen'); return }
      const fd = new FormData()
      fd.append('file', blob, 'face.jpg')
      const { data } = await api.post('/access/face/identify', fd, {
        headers: KIOSK_KEY ? { 'X-Kiosk-Key': KIOSK_KEY } : undefined,
      })
      if (data.success) setResult(data.data)
      else toast.error(data.error || 'Error de reconocimiento')
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="faceid_grid">
      <div className="faceid_card">
        <h3 className="faceid_h3">Identificación en la puerta</h3>
        <div className="faceid_video_wrap">
          <video className="faceid_video" ref={camera.videoRef} autoPlay playsInline muted />
          {!camera.active && <div className="faceid_video_off">Cámara apagada</div>}
        </div>
        <button
          className="faceid_btn faceid_btn_secondary"
          onClick={() => (camera.active ? camera.stop() : camera.start())}
        >
          {camera.active ? <CameraOff size={16} /> : <Camera size={16} />}
          {camera.active ? 'Apagar cámara' : 'Activar cámara'}
        </button>
        <div className="faceid_hint">{camera.error ?? ''}</div>
        <button className="faceid_btn" onClick={handleIdentify} disabled={!camera.active || busy}>
          <ScanFace size={16} />
          {busy ? 'Identificando...' : 'Identificar'}
        </button>
      </div>

      <div className={`faceid_result${
        result?.result === 'granted' ? ' faceid_result_granted'
          : result?.result === 'denied' ? ' faceid_result_denied' : ''
      }`}>
        {!result && <div className="faceid_result_idle">Esperando identificación…</div>}
        {result?.result === 'granted' && (
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
        {result?.result === 'denied' && (
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
