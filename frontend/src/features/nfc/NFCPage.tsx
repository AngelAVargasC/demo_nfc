import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, CheckCircle, XCircle, Clock, User, Shield } from 'lucide-react'
import api from '@/shared/services/api'
import { useNFCStore } from '@/store/nfcStore'
import { useTheme } from '@/shared/theme/theme'

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

export default function NFCPage() {
  const { colors, mode } = useTheme()
  const [uid, setUid] = useState('')
  const [chamber, setChamber] = useState('')
  const [loading, setLoading] = useState(false)
  const { lastResult, history, setResult, clearResult, setScanning } = useNFCStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const scan = async (scanUid: string) => {
    if (!scanUid.trim() || loading) return
    setLoading(true)
    setScanning(true)
    clearResult()

    try {
      const { data } = await api.post('/access/scan', {
        uid: scanUid,
        chamber_degree: chamber ? parseInt(chamber) : null,
      })
      setResult({
        result: data.data.result,
        user: data.data.user,
        reason: data.data.reason ?? null,
        message: data.data.message ?? null,
      })
    } catch {
      setResult({ result: 'denied', user: null, reason: 'error', message: 'Error de conexión con el servidor' })
    } finally {
      setLoading(false)
      setScanning(false)
    }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(clearResult, 10000)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

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

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 96px)' }}>

      {/* Panel principal de resultado */}
      <div style={{
        flex: 1, background: panelBg, border: `2px solid ${panelBorder}`,
        borderRadius: 20, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 350ms ease', position: 'relative', overflow: 'hidden', minHeight: 0,
      }}>
        <AnimatePresence mode="wait">

          {/* Estado idle */}
          {lastResult.result === null && !loading && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: 32 }}>
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                <Wifi size={80} color="#00a88e" style={{ marginBottom: 20 }} />
              </motion.div>
              <h2 style={{ color: colors.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Lector NFC Activo</h2>
              <p style={{ color: colors.muted, marginTop: 10, fontSize: 15 }}>
                Acerque el pin o pulsera NFC al dispositivo<br />o seleccione un miembro de la lista demo
              </p>
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
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

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
            <div style={{ display: 'flex', gap: 8 }}>
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
