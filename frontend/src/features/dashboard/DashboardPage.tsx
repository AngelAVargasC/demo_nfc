import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Users,
  Radio, ScanFace, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/shared/services/api'
import './DashboardPage.css'

/* ─── Tipos del payload /access/dashboard ──────────────────────────────── */
type HourBucket = { hour: number; granted: number; denied: number }
type Dash = {
  today: {
    total: number; granted: number; denied: number; success_rate: number
    delta_pct: number | null; methods: { nfc: number; face: number }
  }
  hourly: HourBucket[]
  denial_reasons: { reason: string; count: number }[]
  denied_24h: number
  members: { total: number; by_status: Record<string, number>; by_degree: Record<string, number> }
  enrollment: { face_users: number; nfc_active: number }
  recent: {
    id: string; result: string; denial_reason: string | null; timestamp: string
    location: string | null; method: string; nfc_uid: string | null
    user: { full_name: string } | null
  }[]
  generated_at: string
}

/* ─── Etiquetas ────────────────────────────────────────────────────────── */
const REASON_LABEL: Record<string, string> = {
  financial_debt: 'Adeudo financiero',
  inactive: 'Miembro inactivo',
  wrong_degree: 'Grado no autorizado',
  tag_not_found: 'Credencial no reconocida',
  replay_attack: 'Repetición de credencial',
  no_face: 'Rostro no detectado',
  face_no_match: 'Rostro sin coincidencia',
  face_ambiguous: 'Coincidencia ambigua',
  desconocido: 'Sin clasificar',
}
const DEGREE_LABEL: Record<string, string> = {
  '1': 'Aprendiz', '2': 'Compañero', '3': 'Maestro',
}

/* ─── Utilidades ───────────────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0')

function initials(name?: string | null) {
  if (!name) return '··'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '··'
}

function timeOf(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* ─── Sparkline (tendencia horaria de hoy) ─────────────────────────────── */
function Sparkline({ data }: { data: number[] }) {
  const w = 200, h = 44
  const max = Math.max(1, ...data)
  const step = data.length > 1 ? w / (data.length - 1) : w
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 6) - 3] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg className="dashboard_spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} className="dashboard_spark_fill" />
      <polyline points={line} className="dashboard_spark_line" />
    </svg>
  )
}

/* ─── Gráfica de actividad por hora ────────────────────────────────────── */
function ActivityChart({ hourly }: { hourly: HourBucket[] }) {
  const max = Math.max(1, ...hourly.map(h => h.granted + h.denied))
  const nowHour = new Date().getHours()
  return (
    <div className="dashboard_chart">
      {hourly.map(h => {
        const isNow = h.hour === nowHour
        return (
          <div className={`dashboard_col${isNow ? ' dashboard_col_now' : ''}`} key={h.hour}>
            <div className="dashboard_col_track">
              <div
                className="dashboard_col_denied"
                style={{ height: `${(h.denied / max) * 100}%` }}
              />
              <div
                className="dashboard_col_granted"
                style={{ height: `${(h.granted / max) * 100}%` }}
              />
            </div>
            <span className="dashboard_col_hour">
              {h.hour % 6 === 0 ? `${pad(h.hour)}:00` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data, isLoading, isError } = useQuery<Dash>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/access/dashboard')
      return data.data
    },
    retry: false,
    refetchInterval: 60_000,
  })

  const today = useMemo(
    () => new Date().toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long',
    }),
    [],
  )

  if (isLoading) {
    return <div className="dashboard_state">Cargando panel…</div>
  }
  if (isError || !data) {
    return <div className="dashboard_state">No se pudo cargar la información del panel.</div>
  }

  const { today: t, hourly, denial_reasons, denied_24h, members, enrollment, recent } = data
  const active = members.by_status['active'] ?? 0
  const sparkData = hourly.map(h => h.granted + h.denied)
  const maxDegree = Math.max(1, ...Object.values(members.by_degree))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/* ── Encabezado ── */}
      <div className="dashboard_head">
        <div>
          <h1 className="dashboard_title">Panel principal</h1>
          <p className="dashboard_subtitle">
            Vista general en tiempo real · Bienvenido, {user?.full_name?.split(' ')[0] ?? 'hermano'}
            <span className="dashboard_subtitle_dot"> · </span>
            <span className="dashboard_subtitle_date">{today}</span>
          </p>
        </div>
        <span className="dashboard_live">
          <span className="dashboard_live_dot" /> Sistema operativo
        </span>
      </div>

      {/* ── KPIs ── */}
      <div className="dashboard_kpis">
        <div className="dashboard_kpi dashboard_kpi_feat">
          <div className="dashboard_kpi_top">
            <span className="dashboard_kpi_label">Accesos hoy</span>
            <span className="dashboard_badge dashboard_badge_live">
              <span className="dashboard_badge_dot" /> En vivo
            </span>
          </div>
          <div className="dashboard_kpi_value">{t.total.toLocaleString('es-MX')}</div>
          <div className="dashboard_kpi_meta">
            {t.delta_pct == null ? (
              <span className="dashboard_delta dashboard_delta_flat">Sin referencia previa</span>
            ) : (
              <span className={`dashboard_delta ${t.delta_pct >= 0 ? 'dashboard_delta_up' : 'dashboard_delta_down'}`}>
                {t.delta_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(t.delta_pct)}%
              </span>
            )}
            <span className="dashboard_kpi_meta_text">vs. mismo periodo de ayer</span>
          </div>
          <Sparkline data={sparkData} />
          <div className="dashboard_kpi_foot">
            <span><b>{t.granted}</b> permitidos</span>
            <span><b>{t.denied}</b> denegados</span>
            <span><b>{t.success_rate}%</b> tasa de éxito</span>
          </div>
        </div>

        <div className="dashboard_kpi">
          <div className="dashboard_kpi_icon dashboard_ic_ok"><CheckCircle2 size={18} /></div>
          <span className="dashboard_kpi_label">Permitidos hoy</span>
          <div className="dashboard_kpi_value dashboard_kpi_value_sm">{t.granted}</div>
          <div className="dashboard_kpi_sub">
            NFC {t.methods.nfc} · Facial {t.methods.face}
          </div>
        </div>

        <div className="dashboard_kpi">
          <div className="dashboard_kpi_icon dashboard_ic_no"><XCircle size={18} /></div>
          <span className="dashboard_kpi_label">Denegados hoy</span>
          <div className="dashboard_kpi_value dashboard_kpi_value_sm">{t.denied}</div>
          <div className="dashboard_kpi_sub">{denied_24h} en las últimas 24 h</div>
        </div>

        <div className="dashboard_kpi">
          <div className="dashboard_kpi_icon dashboard_ic_brand"><Users size={18} /></div>
          <span className="dashboard_kpi_label">Miembros activos</span>
          <div className="dashboard_kpi_value dashboard_kpi_value_sm">{active.toLocaleString('es-MX')}</div>
          <div className="dashboard_kpi_sub">de {members.total.toLocaleString('es-MX')} registrados</div>
        </div>
      </div>

      {/* ── Actividad + Composición ── */}
      <div className="dashboard_row dashboard_row_mid">
        <div className="dashboard_panel">
          <div className="dashboard_panel_head">
            <h2 className="dashboard_panel_title">
              <TrendingUp size={15} /> Actividad de accesos
            </h2>
            <div className="dashboard_legend">
              <span><i className="dashboard_dot_granted" /> Permitidos</span>
              <span><i className="dashboard_dot_denied" /> Denegados</span>
            </div>
          </div>
          {t.total > 0
            ? <ActivityChart hourly={hourly} />
            : <div className="dashboard_empty">Aún no se registran accesos hoy.</div>}
        </div>

        <div className="dashboard_panel">
          <div className="dashboard_panel_head">
            <h2 className="dashboard_panel_title">
              <Users size={15} /> Composición de miembros
            </h2>
            <span className="dashboard_panel_tag">{members.total.toLocaleString('es-MX')} total</span>
          </div>
          <div className="dashboard_degrees">
            {['1', '2', '3'].map(deg => {
              const count = members.by_degree[deg] ?? 0
              return (
                <div className="dashboard_degree" key={deg}>
                  <div className="dashboard_degree_row">
                    <span className="dashboard_degree_name">{DEGREE_LABEL[deg]}</span>
                    <span className="dashboard_degree_count">{count.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="dashboard_degree_track">
                    <div
                      className="dashboard_degree_fill"
                      style={{ width: `${(count / maxDegree) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="dashboard_enroll">
            <div className="dashboard_enroll_item">
              <ScanFace size={14} />
              <span>{enrollment.face_users.toLocaleString('es-MX')} con rostro</span>
            </div>
            <div className="dashboard_enroll_item">
              <Radio size={14} />
              <span>{enrollment.nfc_active.toLocaleString('es-MX')} con credencial NFC</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Últimos accesos + Motivos de denegación ── */}
      <div className="dashboard_row dashboard_row_bottom">
        <div className="dashboard_panel">
          <div className="dashboard_panel_head">
            <h2 className="dashboard_panel_title">Últimos accesos</h2>
            <span className="dashboard_panel_tag">{recent.length} eventos</span>
          </div>
          {recent.length === 0 && <div className="dashboard_empty">Sin eventos registrados.</div>}
          {recent.map(e => {
            const ok = e.result === 'granted'
            return (
              <div className="dashboard_event" key={e.id}>
                <span className="dashboard_event_time">{timeOf(e.timestamp)}</span>
                <span className="dashboard_event_avatar">{initials(e.user?.full_name)}</span>
                <div className="dashboard_event_main">
                  <div className="dashboard_event_name">
                    {e.user?.full_name ?? '— Desconocido —'}
                  </div>
                  <div className="dashboard_event_sub">
                    {e.location ?? 'Ubicación no registrada'} · {e.method === 'face' ? 'Facial' : 'NFC'}
                  </div>
                </div>
                <span className={`dashboard_pill ${ok ? 'dashboard_pill_ok' : 'dashboard_pill_no'}`}>
                  <span className="dashboard_pill_dot" />
                  {ok ? 'Concedido' : 'Denegado'}
                </span>
              </div>
            )
          })}
        </div>

        <div className="dashboard_panel">
          <div className="dashboard_panel_head">
            <h2 className="dashboard_panel_title">
              <AlertTriangle size={15} /> Motivos de denegación
            </h2>
            <span className="dashboard_panel_tag">24 h</span>
          </div>
          {denial_reasons.length === 0 && (
            <div className="dashboard_empty">Sin denegaciones en las últimas 24 h.</div>
          )}
          {denial_reasons.map(r => {
            const pct = denied_24h > 0 ? (r.count / denied_24h) * 100 : 0
            return (
              <div className="dashboard_reason" key={r.reason}>
                <div className="dashboard_reason_row">
                  <span className="dashboard_reason_name">
                    {REASON_LABEL[r.reason] ?? r.reason}
                  </span>
                  <span className="dashboard_reason_count">{r.count}</span>
                </div>
                <div className="dashboard_reason_track">
                  <div className="dashboard_reason_fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
