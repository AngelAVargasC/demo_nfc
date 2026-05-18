import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Camera, Check, X, Settings, Maximize, ShieldAlert, ScanLine } from 'lucide-react'
import { useCamera } from '@/shared/hooks/useCamera'
import { useFaceGuide, type GuideStatus } from '@/shared/hooks/useFaceGuide'
import './AccessReader.css'

/* Instancia aislada: el lector NO depende de la sesión de login, solo del
   token de kiosco (X-Kiosk-Key). Sin interceptores de auth. */
const kioskApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1' })

const HOLD_MS = 700        // rostro estable antes de identificar
const GRANTED_MS = 5000    // duración del resultado concedido
const DENIED_MS = 7000     // duración del resultado denegado

const LS = {
  token: 'sigam_kiosk_token',
  reader: 'sigam_kiosk_reader',
  point: 'sigam_kiosk_point',
}

const DEGREE: Record<number, string> = { 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }

const REASON_LABEL: Record<string, string> = {
  financial_debt: 'Adeudo financiero pendiente',
  inactive: 'Membresía inactiva',
  wrong_degree: 'Grado no autorizado para esta sala',
  tag_not_found: 'Credencial no reconocida',
  replay_attack: 'Credencial repetida',
  no_face: 'No se detectó un rostro',
  face_no_match: 'Rostro sin coincidencia registrada',
  face_ambiguous: 'Coincidencia ambigua',
}

const GUIDE_HINT: Record<GuideStatus, string> = {
  loading: 'Iniciando lector facial…',
  no_face: 'Coloca tu rostro frente a la cámara para iniciar el reconocimiento.',
  multiple: 'Acércate de uno en uno al lector.',
  too_far: 'Acércate un poco más al lector.',
  too_close: 'Aléjate un poco del lector.',
  off_center: 'Centra tu rostro dentro del marco.',
  ok: 'Perfecto, no te muevas.',
}

type Phase = 'locked' | 'waiting' | 'recognizing' | 'granted' | 'denied'

type IdResult = {
  result: 'granted' | 'denied'
  user?: {
    full_name?: string; degree?: number; email?: string
    logia?: { name?: string } | null
  } | null
  reason?: string | null
  message?: string | null
  confidence?: number | null
}

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function AccessReader() {
  const camera = useCamera()

  const [phase, setPhase] = useState<Phase>('locked')
  const [token, setToken] = useState('')
  const [readerId, setReaderId] = useState('LR-001')
  const [accessPoint, setAccessPoint] = useState('Acceso principal')

  const [result, setResult] = useState<IdResult | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  // Tras procesar a una persona, el lector se "rearma" solo cuando el marco
  // queda vacío — evita re-escanear al mismo hermano.
  const [armed, setArmed] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  // Formulario de configuración (pantalla bloqueada).
  const [formToken, setFormToken] = useState('')
  const [formReader, setFormReader] = useState('LR-001')
  const [formPoint, setFormPoint] = useState('Acceso principal')

  const scanning = phase === 'waiting' || phase === 'recognizing'
  const guide = useFaceGuide(camera.videoRef, camera.active && scanning)

  /* ── Reloj ── */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  /* ── Carga inicial: token de URL (?token=) o de almacenamiento ── */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const urlToken = sp.get('token')
    const urlReader = sp.get('reader')
    const urlPoint = sp.get('point')
    if (urlToken) localStorage.setItem(LS.token, urlToken)
    if (urlReader) localStorage.setItem(LS.reader, urlReader)
    if (urlPoint) localStorage.setItem(LS.point, urlPoint)
    if (urlToken || urlReader || urlPoint) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const tk = localStorage.getItem(LS.token) ?? ''
    const rd = localStorage.getItem(LS.reader) ?? 'LR-001'
    const pt = localStorage.getItem(LS.point) ?? 'Acceso principal'
    setReaderId(rd); setAccessPoint(pt)
    setFormReader(rd); setFormPoint(pt); setFormToken(tk)
    if (tk) {
      setToken(tk)
      setPhase('waiting')
      camera.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Activar lector desde la pantalla de configuración ── */
  const activate = () => {
    const tk = formToken.trim()
    if (!tk) { setTokenError('Ingresa el token del lector.'); return }
    localStorage.setItem(LS.token, tk)
    localStorage.setItem(LS.reader, formReader.trim() || 'LR-001')
    localStorage.setItem(LS.point, formPoint.trim() || 'Acceso principal')
    setToken(tk)
    setReaderId(formReader.trim() || 'LR-001')
    setAccessPoint(formPoint.trim() || 'Acceso principal')
    setTokenError(null)
    setResult(null)
    setPhase('waiting')
    camera.start()
    requestFullscreen()
  }

  const openConfig = () => {
    camera.stop()
    setPhase('locked')
  }

  const requestFullscreen = () => {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
  }

  /* ── waiting → recognizing cuando hay un rostro encuadrado ── */
  useEffect(() => {
    if (phase === 'waiting' && armed && guide.status === 'ok') setPhase('recognizing')
    if (phase === 'recognizing' && guide.status === 'no_face') setPhase('waiting')
  }, [phase, armed, guide.status])

  /* ── Rearme: el marco quedó vacío, listo para el siguiente hermano ── */
  useEffect(() => {
    if (guide.status === 'no_face' && !armed) setArmed(true)
  }, [guide.status, armed])

  /* ── Identificación contra el backend ── */
  const doIdentifyRef = useRef<() => void>(() => {})
  doIdentifyRef.current = async () => {
    if (phase !== 'recognizing' || busy) return
    setBusy(true)
    const started = performance.now()
    try {
      const blob = await camera.capture()
      if (!blob) { setBusy(false); return }
      const fd = new FormData()
      fd.append('file', blob, 'face.jpg')
      fd.append('location', accessPoint)
      const { data } = await kioskApi.post('/access/face/identify', fd, {
        headers: { 'X-Kiosk-Key': token },
      })
      setLatency(Math.round(performance.now() - started))
      if (data.success) {
        setResult(data.data)
        setArmed(false)
        setPhase(data.data.result === 'granted' ? 'granted' : 'denied')
        if (data.data.result === 'granted') setCountdown(Math.round(GRANTED_MS / 1000))
      } else {
        setPhase('waiting')
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        camera.stop()
        setTokenError('Token del lector inválido o caducado.')
        setPhase('locked')
      } else {
        setPhase('waiting')
      }
    } finally {
      setBusy(false)
    }
  }

  /* ── Auto-captura: rostro "ok" sostenido HOLD_MS ── */
  useEffect(() => {
    if (phase !== 'recognizing' || guide.status !== 'ok' || busy) return
    const t = window.setTimeout(() => doIdentifyRef.current(), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, guide.status, busy])

  /* ── Resultado: cuenta regresiva y regreso a espera ── */
  useEffect(() => {
    if (phase !== 'granted' && phase !== 'denied') return
    const ms = phase === 'granted' ? GRANTED_MS : DENIED_MS
    const back = window.setTimeout(() => {
      setResult(null)
      setPhase('waiting')
    }, ms)
    let tick: number | undefined
    if (phase === 'granted') {
      tick = window.setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    }
    return () => {
      window.clearTimeout(back)
      if (tick) window.clearInterval(tick)
    }
  }, [phase])

  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const longDate = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

  /* ════════════════ Pantalla de configuración (token) ════════════════ */
  if (phase === 'locked') {
    return (
      <div className="reader reader_lockwrap">
        <div className="reader_lock">
          <div className="reader_lock_badge"><ScanLine size={20} /></div>
          <h1 className="reader_lock_title">Modo lector de acceso</h1>
          <p className="reader_lock_desc">
            Esta terminal funciona como lector autónomo. Se protege con el token
            del kiosco — no requiere iniciar sesión.
          </p>
          {tokenError && <div className="reader_lock_err">{tokenError}</div>}
          <label className="reader_lock_label">Token del lector</label>
          <input
            className="reader_lock_input"
            value={formToken}
            onChange={e => setFormToken(e.target.value)}
            placeholder="X-Kiosk-Key"
            autoFocus
          />
          <div className="reader_lock_row">
            <div>
              <label className="reader_lock_label">Identificador</label>
              <input
                className="reader_lock_input"
                value={formReader}
                onChange={e => setFormReader(e.target.value)}
                placeholder="LR-001"
              />
            </div>
            <div>
              <label className="reader_lock_label">Punto de acceso</label>
              <input
                className="reader_lock_input"
                value={formPoint}
                onChange={e => setFormPoint(e.target.value)}
                placeholder="Templo Mayor"
              />
            </div>
          </div>
          <button className="reader_lock_btn" onClick={activate}>
            Activar lector
          </button>
        </div>
      </div>
    )
  }

  const statusLabel =
    phase === 'recognizing' ? 'Reconociendo'
      : phase === 'granted' ? 'Acceso concedido'
        : phase === 'denied' ? 'Acceso denegado'
          : 'Listo'
  const statusTone = phase === 'denied' ? ' reader_badge_no' : ' reader_badge_ok'

  const scanTone =
    guide.status === 'ok' ? ' reader_scanner_ok'
      : guide.status === 'no_face' || guide.status === 'multiple' || guide.status === 'loading' ? ''
        : ' reader_scanner_warn'

  return (
    <div className={`reader${phase === 'denied' ? ' reader_denied' : ''}`}>
      {/* ── Barra superior ── */}
      <header className="reader_top">
        <div className="reader_org">
          <span className="reader_org_logo">GL<br />VM</span>
          <div className="reader_org_text">
            <span className="reader_org_name">Gran Logia · Valle de México</span>
            <span className="reader_org_sub">{accessPoint} · Lector {readerId}</span>
          </div>
        </div>
        <span className={`reader_badge${statusTone}`}>
          <span className="reader_badge_dot" /> {statusLabel}
        </span>
      </header>

      {/* ── Escenario ── */}
      <main className="reader_stage">
        {/* IDLE / RECONOCIENDO */}
        {scanning && (
          <>
            <div className={`reader_scanner${phase === 'recognizing' ? ' reader_scanner_live' : ''}${scanTone}`}>
              <svg className="reader_ring" viewBox="0 0 120 120">
                <circle className="reader_ring_track" cx="60" cy="60" r="57" />
                <circle className="reader_ring_dash" cx="60" cy="60" r="49" />
                {phase === 'recognizing' && (
                  <circle className="reader_ring_spin" cx="60" cy="60" r="57"
                    pathLength={100} strokeDasharray="26 100" />
                )}
              </svg>
              <div className="reader_lens">
                <video
                  className="reader_video"
                  ref={camera.videoRef}
                  autoPlay playsInline muted
                />
                {phase === 'recognizing' && <div className="reader_mesh" />}
                {phase === 'waiting' && (
                  <span className="reader_lens_icon"><Camera size={30} /></span>
                )}
              </div>
              <span className="reader_bracket reader_bracket_tl" />
              <span className="reader_bracket reader_bracket_tr" />
              <span className="reader_bracket reader_bracket_bl" />
              <span className="reader_bracket reader_bracket_br" />
            </div>

            {phase === 'waiting' ? (
              <>
                <span className="reader_eyebrow">
                  <span className="reader_eyebrow_dot">●</span> Acércate al lector
                </span>
                <h1 className="reader_headline">
                  {greetingFor(now)},<br />
                  <span className="reader_headline_dim">hermano.</span>
                </h1>
                <p className="reader_lead">{GUIDE_HINT[guide.status]}</p>
                <div className="reader_actions">
                  <button className="reader_ghost" onClick={openConfig}>
                    <Settings size={15} /> Configuración
                  </button>
                  <button className="reader_ghost" onClick={requestFullscreen}>
                    <Maximize size={15} /> Pantalla completa
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="reader_headline">Reconociendo…</h1>
                <p className="reader_lead">
                  {busy ? 'Verificando identidad…' : 'Por favor mantén la mirada al frente.'}
                </p>
                <div className="reader_metrics">
                  <div className="reader_metric">
                    <span className="reader_metric_label">Lector</span>
                    <span className="reader_metric_value">{readerId}</span>
                  </div>
                  <div className="reader_metric">
                    <span className="reader_metric_label">Encuadre</span>
                    <span className="reader_metric_value">
                      {guide.centering}<small>%</small>
                    </span>
                  </div>
                  <div className="reader_metric">
                    <span className="reader_metric_label">Latencia</span>
                    <span className="reader_metric_value">
                      {latency != null ? latency : '—'}<small>ms</small>
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ACCESO CONCEDIDO */}
        {phase === 'granted' && (
          <>
            <div className="reader_seal reader_seal_ok">
              <Check size={56} strokeWidth={3.5} />
            </div>
            <span className="reader_eyebrow">
              <span className="reader_eyebrow_dot">●</span> Bienvenido
            </span>
            <h1 className="reader_name">{result?.user?.full_name ?? 'Hermano'}</h1>
            <p className="reader_lead">
              {result?.confidence != null && `Coincidencia ${(result.confidence * 100).toFixed(1)}%`}
              {result?.user?.logia?.name && ` · ${result.user.logia.name}`}
              {result?.user?.degree && ` · Grado ${result.user.degree}°`}
            </p>
            <div className="reader_cards">
              <div className="reader_card">
                <span className="reader_card_label">Ingreso</span>
                <span className="reader_card_value">{accessPoint}</span>
              </div>
              <div className="reader_card">
                <span className="reader_card_label">Hora</span>
                <span className="reader_card_value">{clock.slice(0, 5)}</span>
              </div>
              <div className="reader_card">
                <span className="reader_card_label">Grado</span>
                <span className="reader_card_value">
                  {DEGREE[result?.user?.degree ?? 0] ?? '—'}
                </span>
              </div>
            </div>
            <div className="reader_gate">
              Puerta abierta · cierre automático en {pad(countdown)}s
            </div>
          </>
        )}

        {/* ACCESO DENEGADO */}
        {phase === 'denied' && (
          <>
            <div className="reader_seal reader_seal_no">
              <X size={56} strokeWidth={3.5} />
            </div>
            <span className="reader_eyebrow reader_eyebrow_no">
              <span className="reader_eyebrow_dot">●</span> Acceso no autorizado
            </span>
            <h1 className="reader_headline">No es posible<br />conceder el paso.</h1>
            <p className="reader_lead">
              {result?.message ?? 'El rostro no coincide con un perfil autorizado para este acceso.'}
            </p>
            <div className="reader_reason">
              <div className="reader_reason_head">
                <ShieldAlert size={15} /> Motivo del rechazo
              </div>
              <div className="reader_reason_body">
                {result?.reason ? (REASON_LABEL[result.reason] ?? result.reason) : 'No autorizado'}
                {result?.confidence != null && (
                  <span className="reader_reason_meta">
                    Mejor coincidencia {(result.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <button
              className="reader_retry"
              onClick={() => { setResult(null); setPhase('waiting') }}
            >
              Solicitar verificación a guardia
            </button>
          </>
        )}
      </main>

      {/* ── Pie / telemetría ── */}
      <footer className="reader_foot">
        <span>SIGAM · Modo lector autónomo</span>
        <span>{accessPoint} · {readerId}</span>
        <span className="reader_foot_clock">{longDate} · {clock}</span>
      </footer>
    </div>
  )
}
