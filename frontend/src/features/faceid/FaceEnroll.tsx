import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, Search, Sun, Glasses, Smile,
  Camera, RotateCcw, ScanFace,
} from 'lucide-react'
import api from '@/shared/services/api'
import { useCamera } from '@/shared/hooks/useCamera'
import { useFaceGuide, type GuideStatus } from '@/shared/hooks/useFaceGuide'

type UserRow = { id: string; full_name: string; email: string }
type Phase = 'guiding' | 'sending' | 'pause'

const TARGET = 3        // capturas por enrolamiento
const HOLD_MS = 900     // el rostro debe sostenerse "ok" este tiempo
const PAUSE_MS = 1400   // pausa entre capturas
const TOTAL_STEPS = 4

const POSES = ['Mira de frente', 'Gira lentamente a la derecha', 'Gira lentamente a la izquierda']

const STATUS_MSG: Record<GuideStatus, string> = {
  loading: 'Cargando detector facial',
  no_face: 'Coloca tu rostro dentro del marco',
  multiple: 'Solo una persona frente a la cámara',
  too_far: 'Acércate un poco',
  too_close: 'Aléjate un poco',
  off_center: 'Centra tu rostro en el marco',
  ok: 'Perfecto, no te muevas',
}

/* ─── Análisis de fotograma: luz y nitidez reales del video ─────────────── */
let scratch: HTMLCanvasElement | null = null

function analyzeFrame(video: HTMLVideoElement | null): { luz: number; nitidez: number } | null {
  if (!video || !video.videoWidth) return null
  const w = 96, h = 72
  if (!scratch) scratch = document.createElement('canvas')
  scratch.width = w
  scratch.height = h
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const lum = new Float32Array(w * h)
  let sum = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    lum[p] = l
    sum += l
  }
  const mean = sum / (w * h)

  // Nitidez: gradiente horizontal medio (proxy de enfoque).
  let grad = 0, n = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      grad += Math.abs(lum[y * w + x] - lum[y * w + x + 1])
      n++
    }
  }
  const sharp = grad / n

  const luz = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(mean - 125) / 1.15)))
  const nitidez = Math.round(Math.max(0, Math.min(100, (sharp / 14) * 100)))
  return { luz, nitidez }
}

/* ─── Metadatos por paso del asistente ──────────────────────────────────── */
const STEP_META: Record<number, { eyebrow: string; title: string; desc: string }> = {
  1: {
    eyebrow: 'Identificación · Paso 1',
    title: 'Selecciona al miembro a enrolar',
    desc: 'Busca por nombre o correo institucional para vincular el rostro.',
  },
  2: {
    eyebrow: 'Preparación · Paso 2',
    title: 'Prepara la toma facial',
    desc: 'Verifica estas condiciones antes de iniciar la captura.',
  },
  3: {
    eyebrow: 'Captura facial · Activa',
    title: 'Mantén tu rostro centrado en el marco',
    desc: 'Gira lentamente la cabeza siguiendo la guía en pantalla.',
  },
  4: {
    eyebrow: 'Enrolamiento · Completado',
    title: 'Rostro registrado con éxito',
    desc: 'El miembro ya puede acceder mediante reconocimiento facial.',
  },
}

const PREP_ITEMS = [
  { icon: Sun, title: 'Buena iluminación', text: 'Luz frontal y uniforme, sin contraluz ni sombras fuertes.' },
  { icon: Glasses, title: 'Rostro despejado', text: 'Retira lentes oscuros, gorra o cubrebocas durante la toma.' },
  { icon: Smile, title: 'Expresión neutra', text: 'Mira de frente a la cámara con una expresión natural.' },
]

export default function FaceEnroll() {
  const camera = useCamera()
  const guide = useFaceGuide(camera.videoRef, camera.active)

  const [step, setStep] = useState(1)

  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const [phase, setPhase] = useState<Phase>('guiding')
  const [captured, setCaptured] = useState(0)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [quality, setQuality] = useState({ luz: 0, nitidez: 0 })

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => setUsersError('No fue posible cargar los miembros (revisa permisos).'))
      .finally(() => setUsersLoading(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  const selectedUser = users.find(u => u.id === selectedUserId)

  /* ── Análisis de luz/nitidez en vivo durante la captura ── */
  useEffect(() => {
    if (step !== 3 || !camera.active) return
    const id = window.setInterval(() => {
      const m = analyzeFrame(camera.videoRef.current)
      if (m) setQuality(m)
    }, 380)
    return () => window.clearInterval(id)
  }, [step, camera.active, camera.videoRef])

  /* ── Captura + envío al backend ── */
  const doCaptureRef = useRef<() => void>(() => {})
  doCaptureRef.current = async () => {
    if (step !== 3 || phase !== 'guiding') return
    setPhase('sending')
    setErrMsg(null)
    try {
      const blob = await camera.capture()
      if (!blob) { setPhase('guiding'); return }
      const fd = new FormData()
      fd.append('user_id', selectedUserId)
      fd.append('file', blob, 'face.jpg')
      fd.append('replace', String(captured === 0)) // la 1ª captura reemplaza las previas
      const { data } = await api.post('/access/face/enroll', fd)
      if (data.success) {
        const n = captured + 1
        setCaptured(n)
        if (n >= TARGET) {
          camera.stop()
          setStep(4)
        } else {
          setPhase('pause')
          window.setTimeout(() => setPhase('guiding'), PAUSE_MS)
        }
      } else {
        setErrMsg(data.error || 'No se pudo enrolar esta captura, intenta de nuevo.')
        setPhase('guiding')
      }
    } catch {
      setErrMsg('Error de conexión con el servidor.')
      setPhase('guiding')
    }
  }

  /* ── Auto-captura: rostro "ok" sostenido HOLD_MS ── */
  useEffect(() => {
    if (step !== 3 || phase !== 'guiding' || guide.status !== 'ok') return
    const t = window.setTimeout(() => doCaptureRef.current(), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [step, phase, guide.status])

  /* ── Navegación ── */
  const beginCapture = async () => {
    setErrMsg(null)
    setCaptured(0)
    setPhase('guiding')
    setQuality({ luz: 0, nitidez: 0 })
    await camera.start()
    setStep(3)
  }

  const restart = () => {
    camera.stop()
    setSelectedUserId('')
    setQuery('')
    setCaptured(0)
    setErrMsg(null)
    setPhase('guiding')
    setStep(1)
  }

  const goBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) { camera.stop(); setCaptured(0); setPhase('guiding'); setStep(2) }
    else if (step === 4) restart()
  }

  const progressPct = Math.round((captured / TARGET) * 100)
  const inFlow = phase === 'guiding' || phase === 'pause' || phase === 'sending'

  const reticleTone =
    !camera.active || guide.status === 'loading' ? ''
      : guide.status === 'ok' ? ' enr_lens_ok'
        : guide.status === 'no_face' || guide.status === 'multiple' ? ' enr_lens_bad'
          : ' enr_lens_warn'

  const statusText =
    phase === 'sending' ? 'Capturando rostro'
      : phase === 'pause' ? `Captura ${captured} de ${TARGET} guardada`
        : guide.modelError ? 'Detector no disponible · usa captura manual'
          : STATUS_MSG[guide.status]

  return (
    <div className="enr">
      <div className="enr_panel">
        <div className="enr_stage">
        {/* ── Barra superior ── */}
        <header className="enr_topbar">
          <button
            className="enr_top_btn"
            onClick={goBack}
            disabled={step === 1}
            aria-label="Atrás"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="enr_step_count">
            Paso {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
          </span>
          <span className="enr_logo">GL<br />VM</span>
        </header>

        {/* ── Progreso por segmentos ── */}
        <div className="enr_segments">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`enr_segment${i < step ? ' enr_segment_done' : ''}${i === step - 1 ? ' enr_segment_active' : ''}`}
            />
          ))}
        </div>

        {/* ── Encabezado del paso ── */}
        <div className="enr_head">
          <span className="enr_eyebrow">
            <span className="enr_eyebrow_dot">◆</span> {STEP_META[step].eyebrow}
          </span>
          <h2 className="enr_title">{STEP_META[step].title}</h2>
          <p className="enr_desc">{STEP_META[step].desc}</p>
        </div>

        {/* ════════ PASO 1 · Identidad ════════ */}
        {step === 1 && (
          <div className="enr_body">
            <div className="enr_search">
              <Search size={15} />
              <input
                className="enr_search_input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre o correo"
              />
            </div>
            {usersLoading && <div className="enr_note">Cargando miembros…</div>}
            {usersError && <div className="enr_note enr_note_err">{usersError}</div>}
            {!usersLoading && !usersError && (
              <div className="enr_user_list">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`enr_user${selectedUserId === u.id ? ' enr_user_active' : ''}`}
                  >
                    <span className="enr_user_avatar">
                      {u.full_name.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="enr_user_text">
                      <span className="enr_user_name">{u.full_name}</span>
                      <span className="enr_user_mail">{u.email}</span>
                    </span>
                    {selectedUserId === u.id && <Check size={16} className="enr_user_check" />}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="enr_note">Sin coincidencias.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════ PASO 2 · Preparación ════════ */}
        {step === 2 && (
          <div className="enr_body">
            <div className="enr_prep">
              {PREP_ITEMS.map(({ icon: Icon, title, text }) => (
                <div className="enr_prep_item" key={title}>
                  <span className="enr_prep_icon"><Icon size={17} /></span>
                  <span className="enr_prep_text">
                    <span className="enr_prep_title">{title}</span>
                    <span className="enr_prep_sub">{text}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="enr_selected">
              Miembro seleccionado:&nbsp;
              <strong>{selectedUser?.full_name ?? '—'}</strong>
            </div>
          </div>
        )}

        {/* ════════ PASO 3 · Captura facial ════════ */}
        {step === 3 && (
          <div className="enr_body">
            <div className="enr_scanner">
              <svg className="enr_ring" viewBox="0 0 120 120">
                <circle className="enr_ring_track" cx="60" cy="60" r="56" />
                <circle className="enr_ring_dash" cx="60" cy="60" r="48" />
                <circle
                  className="enr_ring_progress"
                  cx="60" cy="60" r="56"
                  pathLength={100}
                  strokeDasharray={`${progressPct} 100`}
                />
              </svg>
              <div className={`enr_lens${reticleTone}`}>
                <video
                  className="enr_video"
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                />
                <span className="enr_bracket enr_bracket_tl" />
                <span className="enr_bracket enr_bracket_tr" />
                <span className="enr_bracket enr_bracket_bl" />
                <span className="enr_bracket enr_bracket_br" />
                <span className="enr_reticle" />
                {inFlow && (
                  <span className="enr_pose">{POSES[Math.min(captured, TARGET - 1)]}</span>
                )}
              </div>
            </div>

            <div className="enr_metrics">
              <div className="enr_metric">
                <span className="enr_metric_label">Luz</span>
                <span className="enr_metric_value">
                  {quality.luz}<small>%</small>
                </span>
              </div>
              <div className="enr_metric">
                <span className="enr_metric_label">Encuadre</span>
                <span className="enr_metric_value">
                  {guide.centering}<small>%</small>
                </span>
              </div>
              <div className="enr_metric">
                <span className="enr_metric_label">Nitidez</span>
                <span className="enr_metric_value">
                  {quality.nitidez}<small>%</small>
                </span>
              </div>
            </div>

            {errMsg && <div className="enr_note enr_note_err">{errMsg}</div>}
            {camera.error && <div className="enr_note enr_note_err">{camera.error}</div>}
          </div>
        )}

        {/* ════════ PASO 4 · Confirmación ════════ */}
        {step === 4 && (
          <div className="enr_body">
            <div className="enr_done">
              <span className="enr_done_icon"><Check size={34} strokeWidth={3} /></span>
              <div className="enr_done_name">{selectedUser?.full_name}</div>
              <div className="enr_done_meta">{TARGET} capturas faciales registradas</div>
            </div>
          </div>
        )}

        {/* ── Pie del asistente ── */}
        <footer className="enr_foot">
          {step === 1 && (
            <button
              className="enr_btn"
              onClick={() => setStep(2)}
              disabled={!selectedUserId}
            >
              Continuar <ArrowRight size={17} />
            </button>
          )}

          {step === 2 && (
            <button className="enr_btn" onClick={beginCapture}>
              <Camera size={17} /> Iniciar captura
            </button>
          )}

          {step === 3 && (
            <div className="enr_status">
              <span className={`enr_status_dot${guide.status === 'ok' ? ' enr_status_dot_ok' : ''}`} />
              <span className="enr_status_text">{statusText}</span>
              <span className="enr_status_pct">· {progressPct}% completado</span>
              {guide.modelError && (
                <button
                  className="enr_status_manual"
                  onClick={() => doCaptureRef.current()}
                  disabled={phase !== 'guiding'}
                >
                  <ScanFace size={14} /> Capturar
                </button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="enr_foot_actions">
              <button className="enr_btn enr_btn_ghost" onClick={restart}>
                <RotateCcw size={16} /> Enrolar a otro
              </button>
              <button className="enr_btn" onClick={restart}>
                Finalizar <Check size={17} />
              </button>
            </div>
          )}
        </footer>
        </div>
      </div>
    </div>
  )
}
