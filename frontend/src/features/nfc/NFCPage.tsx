import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, CheckCircle, XCircle, Clock, User, Shield } from 'lucide-react'
import api from '@/shared/services/api'
import { useNFCStore } from '@/store/nfcStore'
import { useTheme } from '@/shared/theme/theme'
import { useResponsive } from '@/shared/hooks/useResponsive'
import { useNFCReader, normalizeUid } from '@/shared/hooks/useNFCReader'
import { feedbackRead, feedbackGranted, feedbackDenied, primeAudioContext } from '@/shared/hooks/nfcFeedback'
import { useWakeLock } from '@/shared/hooks/useWakeLock'

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
  const { colors, mode } = useTheme()
  const { isMobile, isTablet } = useResponsive()
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

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { clearResult() }, 8000)

    const queued = pendingUidRef.current
    if (queued) {
      pendingUidRef.current = null
      void processUid(queued)
    }
  }, [clearResult, setResult, setScanning])

  const scan = useCallback((scanUid: string) => {
    const normalized = normalizeUid(scanUid) || scanUid.trim()
    if (!normalized) return
    feedbackRead()
    if (loadingRef.current) {
      pendingUidRef.current = normalized
      return
    }
    void processUid(normalized)
  }, [processUid])

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
  const panelBg = isGranted
    ? (mode === 'dark' ? '#052e16' : '#e6f6f3')
    : isDenied
      ? (mode === 'dark' ? '#450a0a' : '#fef2f2')
      : colors.surface

  const panelBorder = isGranted ? '#00a88e' : isDenied ? '#ef4444' : colors.border

  const inputStyle = {
    flex: 1, padding: '8px 12px', background: colors.inputBg,
    border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text,
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }

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
    })
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
      })
    }
    void tryAutoStart()
  }, [activeTab, nfc.isSupported, nfc.checkPermission, nfc.start, scan])

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
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('access')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: `1px solid ${activeTab === 'access' ? '#00a88e' : colors.border}`,
            background: activeTab === 'access' ? (mode === 'dark' ? '#0d3b34' : '#e6f6f3') : colors.surface,
            color: activeTab === 'access' ? '#00a88e' : colors.text,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Lector de acceso
        </button>
        <button
          onClick={() => setActiveTab('enroll')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: `1px solid ${activeTab === 'enroll' ? '#00a88e' : colors.border}`,
            background: activeTab === 'enroll' ? (mode === 'dark' ? '#0d3b34' : '#e6f6f3') : colors.surface,
            color: activeTab === 'enroll' ? '#00a88e' : colors.text,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Enrolamiento de chip
        </button>
      </div>

      {activeTab === 'access' && (
        <div style={{ display: 'flex', gap: 20, minHeight: isMobile ? 'auto' : 'calc(100dvh - 160px)', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* Panel principal de resultado */}
      <div style={{
        flex: 1, background: panelBg, border: `2px solid ${panelBorder}`,
        borderRadius: 20, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 350ms ease', position: 'relative', overflow: 'hidden', minHeight: isMobile ? 420 : 0,
      }}>
        <AnimatePresence mode="wait">

          {/* Estado idle */}
          {lastResult.result === null && !loading && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: 32 }}>
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                <Wifi size={80} color="#00a88e" style={{ marginBottom: 20 }} />
              </motion.div>
              <h2 style={{ color: colors.text, fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0 }}>
                {nfc.active ? 'Control de accesos activo' : 'Lector en espera'}
              </h2>
              <p style={{ color: colors.muted, marginTop: 10, fontSize: 15 }}>
                {nfc.active
                  ? 'Acerque un chip al celular. Validación automática, sin tocar pantalla.'
                  : 'Presione "Iniciar control de accesos" una sola vez para habilitarlo.'}
              </p>
              {nfc.active && (
                <div style={{
                  marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 999,
                  background: mode === 'dark' ? '#0d3b34' : '#e6f6f3',
                  border: '1px solid #00a88e', color: '#00a88e', fontSize: 12, fontWeight: 700,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#00a88e',
                    animation: 'nfcPulse 1.4s infinite',
                  }} />
                  EN VIVO
                </div>
              )}
            </motion.div>
          )}

          {/* Escaneando */}
          {loading && (
            <motion.div key="scanning" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', padding: 32 }}>
              <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
                <Wifi size={80} color="#00a88e" />
              </motion.div>
              <p style={{ color: '#00a88e', marginTop: 20, fontSize: 20, fontWeight: 700 }}>Validando acceso...</p>
              <p style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Verificando estatus financiero y masónico</p>
            </motion.div>
          )}

          {/* Acceso PERMITIDO */}
          {isGranted && lastResult.user && (
            <motion.div key="granted" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', padding: 32, width: '100%', maxWidth: 480 }}>
              <CheckCircle size={72} color="#00a88e" style={{ marginBottom: 12 }} />
              <h1 style={{ color: '#00a88e', fontSize: 30, fontWeight: 800, margin: '0 0 24px' }}>ACCESO PERMITIDO</h1>

              {/* Tarjeta de identidad del miembro */}
              <div style={{
                background: colors.surface, borderRadius: 16, padding: '24px 28px',
                border: `1px solid #00a88e`, textAlign: 'left', boxShadow: '0 4px 24px rgba(0,168,142,0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                    background: mode === 'dark' ? '#0d3b34' : '#e6f6f3',
                    border: '2px solid #00a88e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {lastResult.user.photo_url
                      ? <img src={lastResult.user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <User size={36} color="#00a88e" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>
                      {lastResult.user.full_name}
                    </div>
                    <div style={{ fontSize: 13, color: '#00a88e', marginTop: 3, fontWeight: 600 }}>
                      {DEGREE_LABELS[lastResult.user.degree] ?? 'Desconocido'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <InfoRow label="Logia" value={(lastResult.user as any).logia?.name ?? '—'} />
                  <InfoRow label="Correo" value={lastResult.user.email} />
                  <InfoRow label="Rol" value={lastResult.user.role} />
                </div>

                <div style={{
                  marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: mode === 'dark' ? '#0d3b34' : '#e6f6f3',
                  border: '1px solid #00a88e', borderRadius: 24, padding: '6px 18px',
                  fontSize: 13, fontWeight: 700, color: '#00a88e',
                }}>
                  Al Corriente — Paz y Salvo
                </div>
              </div>
            </motion.div>
          )}

          {/* Acceso DENEGADO */}
          {isDenied && (
            <motion.div key="denied" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', padding: 32, width: '100%', maxWidth: 460 }}>
              <XCircle size={72} color="#ef4444" style={{ marginBottom: 12 }} />
              <h1 style={{ color: '#ef4444', fontSize: 30, fontWeight: 800, margin: '0 0 16px' }}>ACCESO DENEGADO</h1>

              {lastResult.user && (
                <div style={{
                  background: colors.surface, borderRadius: 16, padding: '20px 24px',
                  border: '1px solid #ef4444', marginBottom: 16, textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                      background: mode === 'dark' ? '#450a0a' : '#fef2f2',
                      border: '2px solid #ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={28} color="#ef4444" />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{lastResult.user.full_name}</div>
                      <div style={{ fontSize: 13, color: colors.muted }}>{DEGREE_LABELS[lastResult.user.degree]}</div>
                    </div>
                  </div>
                  <InfoRow label="Correo" value={lastResult.user.email} />
                  <InfoRow label="Logia" value={(lastResult.user as any).logia?.name ?? '—'} />
                </div>
              )}

              <div style={{
                background: mode === 'dark' ? '#450a0a' : '#fef2f2',
                border: '1px solid #ef4444', borderRadius: 12, padding: '12px 20px',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
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
      <div style={{ width: isMobile ? '100%' : isTablet ? 280 : 300, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

        {/* Control de escaneo */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Shield size={16} color="#00a88e" />
            <h3 style={{ color: colors.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Control de Acceso</h3>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: colors.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Cámara activa
            </label>
            <select
              value={chamber}
              onChange={e => setChamber(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {CHAMBERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: colors.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              UID Manual
            </label>
            <button
              onClick={toggleAccessReader}
              style={{
                width: '100%', marginBottom: 6, padding: '10px 12px',
                background: nfc.active ? '#ef4444' : '#00a88e', border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {nfc.active && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 0 0 0 rgba(255,255,255,0.8)',
                  animation: 'nfcPulse 1.2s infinite',
                }} />
              )}
              {nfc.active ? 'Control de accesos ACTIVO — Pausar' : 'Iniciar control de accesos'}
            </button>
            <div style={{ fontSize: 11, color: nfc.active ? '#00a88e' : colors.muted, marginBottom: 8, minHeight: 16 }}>
              {nfc.error
                ? nfc.error
                : nfc.active
                  ? 'Acerca cualquier chip. Se validan automáticamente sin tocar nada.'
                  : nfc.isSupported
                    ? 'Toca una sola vez para habilitar el lector. Queda activo permanentemente.'
                    : 'Web NFC no disponible en este navegador.'}
            </div>
            <style>{`@keyframes nfcPulse {0%{box-shadow:0 0 0 0 rgba(255,255,255,0.8)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}`}</style>
            <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                value={uid}
                onChange={e => setUid(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scan(uid)}
                placeholder="04:XX:XX:XX"
                style={inputStyle}
              />
              <button onClick={() => scan(uid)} disabled={loading || !uid.trim()} style={{
                padding: '8px 14px', background: loading ? '#00a88e66' : '#00a88e', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0,
              }}>▶</button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: colors.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Miembros demo
          </div>
          {DEMO_TAGS.map(({ uid: tagUid, label, sub }) => (
            <button key={tagUid} onClick={() => { setUid(tagUid); scan(tagUid) }} disabled={loading}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', background: colors.inputBg,
                border: `1px solid ${colors.border}`, borderRadius: 10, cursor: 'pointer',
                marginBottom: 6, transition: 'border-color 150ms',
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{label}</div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{sub}</div>
              <div style={{ fontSize: 10, color: '#00a88e', fontFamily: 'monospace', marginTop: 2 }}>{tagUid}</div>
            </button>
          ))}
        </div>

        {/* Historial */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={14} color={colors.muted} />
            <h3 style={{ color: colors.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Historial de sesión</h3>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {history.length === 0 && (
              <p style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 16 }}>Sin eventos aún</p>
            )}
            {history.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
                borderBottom: `1px solid ${colors.border}`,
              }}>
                {h.result === 'granted'
                  ? <CheckCircle size={14} color="#00a88e" style={{ marginTop: 1, flexShrink: 0 }} />
                  : <XCircle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: colors.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.user?.full_name ?? 'Tag desconocido'}
                  </div>
                  <div style={{ fontSize: 10, color: colors.muted, marginTop: 1 }}>
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('es-MX') : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                  background: h.result === 'granted' ? (mode === 'dark' ? '#0d3b34' : '#e6f6f3') : (mode === 'dark' ? '#450a0a' : '#fef2f2'),
                  color: h.result === 'granted' ? '#00a88e' : '#ef4444',
                  fontWeight: 700,
                }}>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gap: 16,
        }}>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16 }}>
            <h3 style={{ margin: 0, marginBottom: 10, color: colors.text, fontSize: 15 }}>1) Selecciona usuario</h3>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            {usersLoading && <div style={{ color: colors.muted, fontSize: 12 }}>Cargando usuarios...</div>}
            {usersError && <div style={{ color: '#ef4444', fontSize: 12 }}>{usersError}</div>}
            {!usersLoading && !usersError && (
              <div style={{ maxHeight: isMobile ? 220 : 360, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                {filteredUsers.map((u) => {
                  const selected = selectedUserId === u.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px',
                        border: 'none', borderBottom: `1px solid ${colors.border}`,
                        background: selected ? (mode === 'dark' ? '#0d3b34' : '#e6f6f3') : 'transparent',
                        color: selected ? '#00a88e' : colors.text,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: colors.muted }}>{u.email}</div>
                    </button>
                  )
                })}
                {filteredUsers.length === 0 && <div style={{ padding: 12, fontSize: 12, color: colors.muted }}>Sin usuarios</div>}
              </div>
            )}
          </div>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16 }}>
            <h3 style={{ margin: 0, marginBottom: 10, color: colors.text, fontSize: 15 }}>2) Leer y asignar chip</h3>
            <button
              onClick={nfc.active ? nfc.stop : handleReadEnrollUid}
              style={{
                width: '100%', marginBottom: 8, padding: '10px 12px',
                background: nfc.active ? '#ef4444' : '#00a88e', border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {nfc.active ? 'Esperando chip... Cancelar' : 'Leer UID desde NFC del celular'}
            </button>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8, minHeight: 16 }}>
              {nfc.error ? nfc.error : nfc.active ? 'Acerca el chip al celular.' : 'Se leerá un chip y se detendrá.'}
            </div>
            <label style={{ fontSize: 11, color: colors.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              UID del chip
            </label>
            <input
              value={enrollUid}
              onChange={(e) => setEnrollUid(e.target.value)}
              placeholder="UID leído o capturado manual"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <button
              onClick={handleEnroll}
              disabled={!selectedUserId || !enrollUid.trim() || enrolling}
              style={{
                width: '100%', padding: '9px 12px', border: 'none', borderRadius: 8,
                background: '#00a88e', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: !selectedUserId || !enrollUid.trim() || enrolling ? 'not-allowed' : 'pointer',
                opacity: !selectedUserId || !enrollUid.trim() || enrolling ? 0.7 : 1,
              }}
            >
              {enrolling ? 'Asignando chip...' : 'Asignar chip al usuario'}
            </button>
            {enrollMsg && <div style={{ marginTop: 10, fontSize: 12, color: '#00a88e' }}>{enrollMsg}</div>}
            {enrollErr && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>{enrollErr}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
