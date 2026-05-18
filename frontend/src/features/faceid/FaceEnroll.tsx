import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, UserPlus, CheckCircle2 } from 'lucide-react'
import api from '@/shared/services/api'
import { useCamera } from '@/shared/hooks/useCamera'
import { useFaceGuide, type GuideStatus } from '@/shared/hooks/useFaceGuide'

type UserRow = { id: string; full_name: string; email: string }
type Phase = 'idle' | 'guiding' | 'sending' | 'pause' | 'done'

const TARGET = 3       // capturas por enrolamiento
const HOLD_MS = 900    // el rostro debe mantenerse "ok" este tiempo antes de capturar
const PAUSE_MS = 1400  // pausa entre capturas

const POSES = ['Mira de frente', 'Gira lentamente a la derecha', 'Gira lentamente a la izquierda']

const STATUS_MSG: Record<GuideStatus, string> = {
  loading: 'Cargando detector facial…',
  no_face: 'Coloca tu rostro dentro del óvalo',
  multiple: 'Debe haber una sola persona frente a la cámara',
  too_far: 'Acércate un poco',
  too_close: 'Aléjate un poco',
  off_center: 'Centra tu rostro en el óvalo',
  ok: 'Perfecto, no te muevas…',
}

export default function FaceEnroll() {
  const camera = useCamera()
  const guide = useFaceGuide(camera.videoRef, camera.active)

  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const [phase, setPhase] = useState<Phase>('idle')
  const [captured, setCaptured] = useState(0)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => setUsersError('No fue posible cargar usuarios (revisa permisos).'))
      .finally(() => setUsersLoading(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  const selectedUser = users.find((u) => u.id === selectedUserId)

  const start = async () => {
    setErrMsg(null)
    setCaptured(0)
    await camera.start()
    setPhase('guiding')
  }

  const reset = () => {
    camera.stop()
    setPhase('idle')
    setCaptured(0)
    setErrMsg(null)
  }

  // Captura + envío. Se guarda en un ref para que el temporizador use siempre
  // la versión más reciente (con el `captured`/`phase` actuales).
  const doCaptureRef = useRef<() => void>(() => {})
  doCaptureRef.current = async () => {
    if (phase !== 'guiding') return
    setPhase('sending')
    setErrMsg(null)
    try {
      const blob = await camera.capture()
      if (!blob) { setPhase('guiding'); return }
      const fd = new FormData()
      fd.append('user_id', selectedUserId)
      fd.append('file', blob, 'face.jpg')
      fd.append('replace', String(captured === 0)) // la 1ra captura reemplaza las anteriores
      const { data } = await api.post('/access/face/enroll', fd)
      if (data.success) {
        const n = captured + 1
        setCaptured(n)
        if (n >= TARGET) {
          setPhase('done')
          camera.stop()
        } else {
          setPhase('pause')
          window.setTimeout(() => setPhase('guiding'), PAUSE_MS)
        }
      } else {
        setErrMsg(data.error || 'No se pudo enrolar esta captura, intenta de nuevo')
        setPhase('guiding')
      }
    } catch {
      setErrMsg('Error de conexión con el servidor')
      setPhase('guiding')
    }
  }

  // Auto-captura: cuando el rostro lleva "ok" sostenido HOLD_MS.
  useEffect(() => {
    if (phase !== 'guiding' || guide.status !== 'ok') return
    const t = window.setTimeout(() => doCaptureRef.current(), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, guide.status])

  const ovalClass =
    !camera.active ? ''
      : guide.status === 'ok' ? ' faceid_oval_ok'
        : guide.status === 'no_face' || guide.status === 'multiple' ? ' faceid_oval_bad'
          : ' faceid_oval_warn'

  const inFlow = phase === 'guiding' || phase === 'pause' || phase === 'sending'

  return (
    <div className="faceid_grid">
      {/* 1. Selección de usuario */}
      <div className="faceid_card">
        <h3 className="faceid_h3">1. Selecciona el usuario</h3>
        <input
          className="faceid_search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo"
          disabled={phase !== 'idle'}
        />
        {usersLoading && <div className="faceid_loading">Cargando usuarios...</div>}
        {usersError && <div className="faceid_msg_err">{usersError}</div>}
        {!usersLoading && !usersError && (
          <div className="faceid_user_list">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                disabled={phase !== 'idle'}
                className={`faceid_user_btn${selectedUserId === u.id ? ' faceid_user_btn_selected' : ''}`}
              >
                <div className="faceid_user_name">{u.full_name}</div>
                <div className="faceid_user_mail">{u.email}</div>
              </button>
            ))}
            {filteredUsers.length === 0 && <div className="faceid_user_empty">Sin usuarios</div>}
          </div>
        )}
      </div>

      {/* 2. Captura guiada */}
      <div className="faceid_card">
        <h3 className="faceid_h3">2. Captura guiada</h3>

        <div className="faceid_video_wrap">
          <video className="faceid_video" ref={camera.videoRef} autoPlay playsInline muted />
          {!camera.active && <div className="faceid_video_off">Cámara apagada</div>}
          {camera.active && phase !== 'done' && (
            <>
              <div className={`faceid_oval${ovalClass}`} />
              {inFlow && <div className="faceid_pose">{POSES[Math.min(captured, TARGET - 1)]}</div>}
              <div className="faceid_guide_msg">
                {phase === 'sending' ? 'Capturando…'
                  : phase === 'pause' ? `✓ Captura ${captured} de ${TARGET}`
                    : guide.modelError ? 'Detector no disponible — usa captura manual'
                      : STATUS_MSG[guide.status]}
              </div>
            </>
          )}
        </div>

        <div className="faceid_progress">
          {Array.from({ length: TARGET }).map((_, i) => (
            <span key={i} className={`faceid_dot${i < captured ? ' faceid_dot_done' : ''}`} />
          ))}
        </div>

        {phase === 'idle' && (
          <button className="faceid_btn" onClick={start} disabled={!selectedUserId}>
            <Camera size={16} />
            {selectedUserId
              ? `Iniciar enrolamiento de ${selectedUser?.full_name?.split(' ')[0] ?? ''}`
              : 'Selecciona un usuario primero'}
          </button>
        )}

        {inFlow && guide.modelError && (
          <button
            className="faceid_btn"
            onClick={() => doCaptureRef.current()}
            disabled={phase === 'sending'}
          >
            <UserPlus size={16} /> Capturar manualmente
          </button>
        )}

        {inFlow && (
          <button className="faceid_btn faceid_btn_secondary" onClick={reset}>Cancelar</button>
        )}

        {phase === 'done' && (
          <div className="faceid_done">
            <CheckCircle2 size={48} color="#22c55e" />
            <div className="faceid_done_title">Enrolamiento completado</div>
            <div className="faceid_done_sub">
              {selectedUser?.full_name} — {TARGET} capturas guardadas
            </div>
            <button className="faceid_btn faceid_btn_secondary" onClick={reset}>
              Enrolar a otra persona
            </button>
          </div>
        )}

        {errMsg && <div className="faceid_msg_err">{errMsg}</div>}
        {camera.error && <div className="faceid_msg_err">{camera.error}</div>}
      </div>
    </div>
  )
}
