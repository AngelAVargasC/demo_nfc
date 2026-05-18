import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, CameraOff, ScanFace, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/shared/services/api'
import { useCamera } from '@/shared/hooks/useCamera'
import './FaceIDPage.css'

const KIOSK_KEY = import.meta.env.VITE_KIOSK_API_KEY || ''
const DEGREE_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }

type IdentifyResult = {
  result: 'granted' | 'denied'
  user?: { full_name?: string; degree?: number; email?: string } | null
  reason?: string | null
  message?: string | null
  confidence?: number | null
}

type UserRow = { id: string; full_name: string; email: string }

export default function FaceIDPage() {
  const [tab, setTab] = useState<'access' | 'enroll'>('access')
  const camera = useCamera()

  // --- Acceso ---
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<IdentifyResult | null>(null)

  // --- Enrolamiento ---
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [replace, setReplace] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null)
  const [enrollErr, setEnrollErr] = useState<string | null>(null)

  // Al cambiar de pestaña: apaga la cámara y limpia el estado.
  useEffect(() => {
    camera.stop()
    setResult(null)
    setEnrollMsg(null)
    setEnrollErr(null)
  }, [tab, camera.stop])

  useEffect(() => {
    if (tab !== 'enroll') return
    setUsersLoading(true)
    setUsersError(null)
    api.get('/users')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => setUsersError('No fue posible cargar usuarios (revisa permisos).'))
      .finally(() => setUsersLoading(false))
  }, [tab])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

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

  const handleEnroll = async () => {
    if (!selectedUserId) { setEnrollErr('Selecciona un usuario primero'); return }
    setEnrolling(true)
    setEnrollMsg(null)
    setEnrollErr(null)
    try {
      const blob = await camera.capture()
      if (!blob) { setEnrollErr('No se pudo capturar la imagen'); return }
      const fd = new FormData()
      fd.append('user_id', selectedUserId)
      fd.append('file', blob, 'face.jpg')
      fd.append('replace', String(replace))
      const { data } = await api.post('/access/face/enroll', fd)
      if (data.success) setEnrollMsg('Rostro enrolado correctamente.')
      else setEnrollErr(data.error || 'No fue posible enrolar el rostro')
    } catch {
      setEnrollErr('Error de conexión con el servidor')
    } finally {
      setEnrolling(false)
    }
  }

  const camButton = (
    <button
      className="faceid_btn faceid_btn_secondary"
      onClick={() => (camera.active ? camera.stop() : camera.start())}
    >
      {camera.active ? <CameraOff size={16} /> : <Camera size={16} />}
      {camera.active ? 'Apagar cámara' : 'Activar cámara'}
    </button>
  )

  const cameraView = (
    <>
      <div className="faceid_video_wrap">
        {/* El <video> permanece siempre montado para poder adjuntarle el stream. */}
        <video className="faceid_video" ref={camera.videoRef} autoPlay playsInline muted />
        {!camera.active && <div className="faceid_video_off">Cámara apagada</div>}
      </div>
      {camButton}
      <div className="faceid_hint">{camera.error ?? ''}</div>
    </>
  )

  return (
    <div className="faceid">
      <div className="faceid_tabs">
        <button
          className={`faceid_tab${tab === 'access' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('access')}
        >
          Acceso facial
        </button>
        <button
          className={`faceid_tab${tab === 'enroll' ? ' faceid_tab_active' : ''}`}
          onClick={() => setTab('enroll')}
        >
          Enrolar rostro
        </button>
      </div>

      {/* ── Acceso facial ── */}
      {tab === 'access' && (
        <motion.div className="faceid_grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="faceid_card">
            <h3 className="faceid_h3">Identificación en la puerta</h3>
            {cameraView}
            <button
              className="faceid_btn"
              onClick={handleIdentify}
              disabled={!camera.active || busy}
            >
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
        </motion.div>
      )}

      {/* ── Enrolar rostro ── */}
      {tab === 'enroll' && (
        <motion.div className="faceid_grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="faceid_card">
            <h3 className="faceid_h3">Capturar rostro</h3>
            {cameraView}
            <button
              className="faceid_btn"
              onClick={handleEnroll}
              disabled={!camera.active || enrolling || !selectedUserId}
            >
              <UserPlus size={16} />
              {enrolling ? 'Enrolando...' : 'Capturar y enrolar'}
            </button>
            {enrollMsg && <div className="faceid_msg_ok">{enrollMsg}</div>}
            {enrollErr && <div className="faceid_msg_err">{enrollErr}</div>}
          </div>

          <div className="faceid_card">
            <h3 className="faceid_h3">Selecciona el usuario</h3>
            <div className="faceid_field">
              <input
                className="faceid_search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o correo"
              />
            </div>
            {usersLoading && <div className="faceid_loading">Cargando usuarios...</div>}
            {usersError && <div className="faceid_msg_err">{usersError}</div>}
            {!usersLoading && !usersError && (
              <div className="faceid_user_list">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`faceid_user_btn${selectedUserId === u.id ? ' faceid_user_btn_selected' : ''}`}
                  >
                    <div className="faceid_user_name">{u.full_name}</div>
                    <div className="faceid_user_mail">{u.email}</div>
                  </button>
                ))}
                {filteredUsers.length === 0 && <div className="faceid_user_empty">Sin usuarios</div>}
              </div>
            )}
            <label className="faceid_check_row">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Reemplazar los perfiles faciales existentes de este usuario
            </label>
          </div>
        </motion.div>
      )}
    </div>
  )
}
