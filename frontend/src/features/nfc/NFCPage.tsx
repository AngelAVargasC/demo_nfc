import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, CheckCircle, XCircle, Clock, User, Shield } from 'lucide-react'
import api from '@/shared/services/api'
import { useNFCStore } from '@/store/nfcStore'
import { useNFCReader, normalizeUid } from '@/shared/hooks/useNFCReader'
import { feedbackRead, feedbackGranted, feedbackDenied, primeAudioContext } from '@/shared/hooks/nfcFeedback'
import { useWakeLock } from '@/shared/hooks/useWakeLock'
import './NFCPage.css'

const AUTO_RESUME_KEY = 'sigam_nfc_auto_resume'

const DEMO_TAGS = [
  { uid: '04:A1:B2:C3', label: 'Alejandro Mendoza', sub: 'Maestro · Paz y Salvo' },
  { uid: '04:D4:E5:F6', label: 'Carlos Ramírez', sub: 'Compañero · Paz y Salvo' },
  { uid: '04:G7:H8:I9', label: 'Roberto Gómez', sub: 'Aprendiz · ¡CON ADEUDO!' },
]

const CHAMBERS = [
  { value: '', label: 'Sin restricción de grado' },
  { value: '1', label: 'Cámara de Aprendiz (1°)' },
  { value: '2', label: 'Cámara de Compañero (2°)' },
  { value: '3', label: 'Cámara de Maestro (3°)' },
]

const DEGREE_LABELS: Record<number, string> = { 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }
type UserRow = {
  id: string
  full_name: string
  email: string
  degree: number
  role: string
  status: string
}

export default function NFCPage() {
  const [activeTab, setActiveTab] = useState<'access' | 'enroll'>('access')
  const [uid, setUid] = useState('')
  const [chamber, setChamber] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [enrollUid, setEnrollUid] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null)
  const [enrollErr, setEnrollErr] = useState<string | null>(null)
  const [detectFlash, setDetectFlash] = useState(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const { lastResult, history, setResult, clearResult, setScanning } = useNFCStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const chamberRef = useRef<string>('')
  const loadingRef = useRef(false)
  const pendingUidRef = useRef<string | null>(null)
  useEffect(() => { chamberRef.current = chamber }, [chamber])
  useEffect(() => { loadingRef.current = loading }, [loading])

  const nfc = useNFCReader({ cooldownMs: 900 })
  useWakeLock(nfc.active)

  const processUid = useCallback(async (normalized: string) => {
    loadingRef.current = true
    setLoading(true)
    setScanning(true)
    clearResult()
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined }

    try {
      const { data } = await api.post('/access/scan', {
        uid: normalized,
        chamber_degree: chamberRef.current ? parseInt(chamberRef.current) : null,
      })
      const resultData = {
        result: data.data.result,
        user: data.data.user,
        reason: data.data.reason ?? null,
        message: data.data.message ?? null,
      }
      setResult(resultData)
      if (resultData.result === 'granted') feedbackGranted()
      else feedbackDenied()
    } catch {
      setResult({ result: 'denied', user: null, reason: 'error', message: 'Error de conexión con el servidor' })
      feedbackDenied()
    } finally {
      loadingRef.current = false
      setLoading(false)
      setScanning(false)
    }

    const queued = pendingUidRef.current
    if (queued) {
      pendingUidRef.current = null
      void processUid(queued)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { clearResult() }, 3500)
  }, [clearResult, setResult, setScanning])

  const scan = useCallback((scanUid: string) => {
    const normalized = normalizeUid(scanUid) || scanUid.trim()
    if (!normalized) return
    setUid(normalized)
    if (loadingRef.current) {
      pendingUidRef.current = normalized
      return
    }
    clearResult()
    setScanning(true)
    setLoading(true)
    loadingRef.current = true
    void processUid(normalized)
  }, [clearResult, processUid, setScanning])

  useEffect(() => () => clearTimeout(timerRef.current), [])
  useEffect(() => {
    if (activeTab !== 'enroll') return
    void loadUsers()
  }, [activeTab])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  const isGranted = lastResult.result === 'granted'
  const isDenied = lastResult.result === 'denied'
  const panelClass = isGranted
    ? 'nfc_panel nfc_panel_granted'
    : isDenied
      ? 'nfc_panel nfc_panel_denied'
      : 'nfc_panel'

  const onChipDetect = useCallback(() => {
    feedbackRead()
    setDetectFlash((n) => n + 1)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setDetectFlash((n) => Math.max(0, n - 1)), 350)
  }, [])

  const toggleAccessReader = async () => {
    if (nfc.active) {
      nfc.stop()
      try { localStorage.setItem(AUTO_RESUME_KEY, 'paused') } catch {}
      return
    }
    primeAudioContext()
    const ok = await nfc.start((readUid) => {
      setUid(readUid)
      void scan(readUid)
    }, onChipDetect)
    if (ok) { try { localStorage.setItem(AUTO_RESUME_KEY, 'active') } catch {} }
  }

  useEffect(() => {
    if (activeTab !== 'access') return
    if (!nfc.isSupported) return
    let paused = '0'
    try { paused = localStorage.getItem(AUTO_RESUME_KEY) ?? '0' } catch {}
    if (paused === 'paused') return
    const tryAutoStart = async () => {
      const state = await nfc.checkPermission()
      if (state !== 'granted') return
      await nfc.start((readUid) => {
        setUid(readUid)
        void scan(readUid)
      }, onChipDetect)
    }
    void tryAutoStart()
  }, [activeTab, nfc.isSupported, nfc.checkPermission, nfc.start, scan, onChipDetect])

  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current) }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const { data } = await api.get('/users')
      setUsers(data.data ?? [])
    } catch (e: any) {
      setUsersError(e?.response?.data?.message ?? 'No fue posible cargar usuarios. Verifica permisos (secretaria/admin).')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleReadEnrollUid = async () => {
    setEnrollErr(null)
    setEnrollMsg(null)
    primeAudioContext()
    const ok = await nfc.start((readUid) => {
      feedbackRead()
      setEnrollUid(readUid)
      setEnrollMsg('UID leído correctamente. Ahora asígnalo al usuario.')
      nfc.stop()
    })
    if (!ok && nfc.error) setEnrollErr(nfc.error)
  }

  const handleEnroll = async () => {
    if (!selectedUserId || !enrollUid.trim() || enrolling) return
    setEnrollErr(null)
    setEnrollMsg(null)
    setEnrolling(true)
    try {
      const normalized = normalizeUid(enrollUid) || enrollUid.trim()
      await api.post('/access/tags', {
        uid: normalized,
        user_id: selectedUserId,
      })
      feedbackGranted()
      setEnrollMsg(`Chip ${normalized} asignado correctamente`)
      setEnrollUid('')
    } catch (e: any) {
      feedbackDenied()
      setEnrollErr(e?.response?.data?.message ?? 'No fue posible asignar el chip')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="nfc">
      <div className="nfc_tabs">
        <button
          onClick={() => setActiveTab('access')}
          className={`nfc_tab${activeTab === 'access' ? ' nfc_tab_active' : ''}`}
        >
          Lector de acceso
        </button>
        <button
          onClick={() => setActiveTab('enroll')}
          className={`nfc_tab${activeTab === 'enroll' ? ' nfc_tab_active' : ''}`}
        >
          Enrolamiento de chip
        </button>
      </div>

      {activeTab === 'access' && (
        <div className="nfc_access">

          {/* Panel principal de resultado */}
          <div className={panelClass}>
            {detectFlash > 0 && <div key={detectFlash} className="nfc_flash" />}
            <AnimatePresence mode="wait">

              {/* Estado idle */}
              {lastResult.result === null && !loading && (
                <motion.div key="idle" className="nfc_state" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                    <Wifi size={80} color="#00a88e" className="nfc_idle_icon" />
                  </motion.div>
                  <h2 className="nfc_idle_title">
                    {nfc.active ? 'Control de accesos activo' : 'Lector en espera'}
                  </h2>
                  <p className="nfc_idle_text">
                    {nfc.active
                      ? 'Acerque un chip al celular. Validación automática, sin tocar pantalla.'
                      : 'Presione "Iniciar control de accesos" una sola vez para habilitarlo.'}
                  </p>
                  {nfc.active && (
                    <div className="nfc_live_badge">
                      <span className="nfc_live_dot" />
                      EN VIVO
                    </div>
                  )}
                </motion.div>
              )}

              {/* Escaneando */}
              {loading && (
                <motion.div key="scanning" className="nfc_state" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
                    <Wifi size={80} color="#00a88e" />
                  </motion.div>
                  <p className="nfc_scan_text">Validando acceso...</p>
                  <p className="nfc_scan_sub">Verificando estatus financiero y masónico</p>
                </motion.div>
              )}

              {/* Acceso PERMITIDO */}
              {isGranted && lastResult.user && (
                <motion.div key="granted" className="nfc_state nfc_state_wide" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <CheckCircle size={72} color="#00a88e" className="nfc_result_icon" />
                  <h1 className="nfc_result_title_ok">ACCESO PERMITIDO</h1>

                  <div className="nfc_card">
                    <div className="nfc_card_head">
                      <div className="nfc_avatar">
                        {lastResult.user.photo_url
                          ? <img src={lastResult.user.photo_url} alt="" className="nfc_avatar_img" />
                          : <User size={36} color="#00a88e" />}
                      </div>
                      <div>
                        <div className="nfc_id_name">{lastResult.user.full_name}</div>
                        <div className="nfc_id_degree">
                          {DEGREE_LABELS[lastResult.user.degree] ?? 'Desconocido'}
                        </div>
                      </div>
                    </div>

                    <div className="nfc_info_grid">
                      <InfoRow label="Logia" value={(lastResult.user as any).logia?.name ?? '—'} />
                      <InfoRow label="Correo" value={lastResult.user.email} />
                      <InfoRow label="Rol" value={lastResult.user.role} />
                    </div>

                    <div className="nfc_paz">Al Corriente — Paz y Salvo</div>
                  </div>
                </motion.div>
              )}

              {/* Acceso DENEGADO */}
              {isDenied && (
                <motion.div key="denied" className="nfc_state nfc_state_wide_sm" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <XCircle size={72} color="#ef4444" className="nfc_result_icon" />
                  <h1 className="nfc_result_title_no">ACCESO DENEGADO</h1>

                  {lastResult.user && (
                    <div className="nfc_card_denied">
                      <div className="nfc_card_head_denied">
                        <div className="nfc_avatar_denied">
                          <User size={28} color="#ef4444" />
                        </div>
                        <div>
                          <div className="nfc_id_name_sm">{lastResult.user.full_name}</div>
                          <div className="nfc_id_degree_muted">{DEGREE_LABELS[lastResult.user.degree]}</div>
                        </div>
                      </div>
                      <InfoRow label="Correo" value={lastResult.user.email} />
                      <InfoRow label="Logia" value={(lastResult.user as any).logia?.name ?? '—'} />
                    </div>
                  )}

                  <div className="nfc_reason">
                    <span className="nfc_reason_text">
                      {lastResult.reason === 'financial_debt'
                        ? 'Adeudo Pendiente — No está Paz y Salvo'
                        : lastResult.reason === 'wrong_degree'
                          ? 'Grado insuficiente para esta cámara'
                          : lastResult.reason === 'tag_not_found'
                            ? 'Tag NFC no registrado en el sistema'
                            : lastResult.message || 'Acceso no autorizado'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Panel lateral de control */}
          <div className="nfc_side">

            {/* Control de escaneo */}
            <div className="nfc_control">
              <div className="nfc_block_head">
                <Shield size={16} color="#00a88e" />
                <h3 className="nfc_h3">Control de Acceso</h3>
              </div>

              <div className="nfc_field">
                <label className="nfc_label">Cámara activa</label>
                <select className="nfc_select" value={chamber} onChange={e => setChamber(e.target.value)}>
                  {CHAMBERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="nfc_field">
                <label className="nfc_label">UID Manual</label>
                <button
                  onClick={toggleAccessReader}
                  className={`nfc_reader_btn${nfc.active ? ' nfc_reader_btn_active' : ''}`}
                >
                  {nfc.active && <span className="nfc_reader_dot" />}
                  {nfc.active ? 'Control de accesos ACTIVO — Pausar' : 'Iniciar control de accesos'}
                </button>
                <div className={`nfc_reader_hint${nfc.active ? ' nfc_reader_hint_active' : ''}`}>
                  {nfc.error
                    ? nfc.error
                    : nfc.active
                      ? 'Acerca cualquier chip. Se validan automáticamente sin tocar nada.'
                      : nfc.isSupported
                        ? 'Toca una sola vez para habilitar el lector. Queda activo permanentemente.'
                        : 'Web NFC no disponible en este navegador.'}
                </div>
                <div className="nfc_uid_row">
                  <input
                    className="nfc_input"
                    value={uid}
                    onChange={e => setUid(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && scan(uid)}
                    placeholder="04:XX:XX:XX"
                  />
                  <button onClick={() => scan(uid)} disabled={loading || !uid.trim()} className="nfc_scan_btn">▶</button>
                </div>
              </div>

              <div className="nfc_demo_label">Miembros demo</div>
              {DEMO_TAGS.map(({ uid: tagUid, label, sub }) => (
                <button key={tagUid} onClick={() => { setUid(tagUid); scan(tagUid) }} disabled={loading} className="nfc_demo_btn">
                  <div className="nfc_demo_name">{label}</div>
                  <div className="nfc_demo_sub">{sub}</div>
                  <div className="nfc_demo_uid">{tagUid}</div>
                </button>
              ))}
            </div>

            {/* Historial */}
            <div className="nfc_history">
              <div className="nfc_block_head">
                <Clock size={14} />
                <h3 className="nfc_h3">Historial de sesión</h3>
              </div>
              <div className="nfc_history_list">
                {history.length === 0 && (
                  <p className="nfc_history_empty">Sin eventos aún</p>
                )}
                {history.map((h, i) => (
                  <div key={i} className="nfc_history_row">
                    {h.result === 'granted'
                      ? <CheckCircle size={14} color="#00a88e" style={{ flexShrink: 0, marginTop: 1 }} />
                      : <XCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
                    <div className="nfc_history_main">
                      <div className="nfc_history_name">
                        {h.user?.full_name ?? 'Tag desconocido'}
                      </div>
                      <div className="nfc_history_time">
                        {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('es-MX') : ''}
                      </div>
                    </div>
                    <span className={`nfc_history_badge ${h.result === 'granted' ? 'nfc_history_badge_ok' : 'nfc_history_badge_no'}`}>
                      {h.result === 'granted' ? 'OK' : 'NO'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'enroll' && (
        <div className="nfc_enroll">
          <div className="nfc_enroll_card">
            <h3 className="nfc_enroll_title">1) Selecciona usuario</h3>
            <input
              className="nfc_input nfc_enroll_input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo"
            />
            {usersLoading && <div className="nfc_loading">Cargando usuarios...</div>}
            {usersError && <div className="nfc_msg_err">{usersError}</div>}
            {!usersLoading && !usersError && (
              <div className="nfc_user_list">
                {filteredUsers.map((u) => {
                  const selected = selectedUserId === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`nfc_user_btn${selected ? ' nfc_user_btn_selected' : ''}`}
                    >
                      <div className="nfc_user_name">{u.full_name}</div>
                      <div className="nfc_user_mail">{u.email}</div>
                    </button>
                  )
                })}
                {filteredUsers.length === 0 && <div className="nfc_user_empty">Sin usuarios</div>}
              </div>
            )}
          </div>

          <div className="nfc_enroll_card">
            <h3 className="nfc_enroll_title">2) Leer y asignar chip</h3>
            <button
              onClick={nfc.active ? nfc.stop : handleReadEnrollUid}
              className={`nfc_reader_btn${nfc.active ? ' nfc_reader_btn_active' : ''}`}
            >
              {nfc.active ? 'Esperando chip... Cancelar' : 'Leer UID desde NFC del celular'}
            </button>
            <div className="nfc_enroll_hint">
              {nfc.error ? nfc.error : nfc.active ? 'Acerca el chip al celular.' : 'Se leerá un chip y se detendrá.'}
            </div>
            <label className="nfc_label">UID del chip</label>
            <input
              className="nfc_input nfc_enroll_input"
              value={enrollUid}
              onChange={(e) => setEnrollUid(e.target.value)}
              placeholder="UID leído o capturado manual"
            />
            <button
              onClick={handleEnroll}
              disabled={!selectedUserId || !enrollUid.trim() || enrolling}
              className="nfc_enroll_btn"
            >
              {enrolling ? 'Asignando chip...' : 'Asignar chip al usuario'}
            </button>
            {enrollMsg && <div className="nfc_msg_ok">{enrollMsg}</div>}
            {enrollErr && <div className="nfc_msg_err">{enrollErr}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="nfc_info_row">
      <span className="nfc_info_label">{label}</span>
      <span className="nfc_info_value">{value}</span>
    </div>
  )
}
