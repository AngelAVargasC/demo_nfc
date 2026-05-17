import { useMemo, CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle, Activity, Clock3, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/shared/services/api'
import './DashboardPage.css'

function StatCard({
  icon: Icon, label, value, accent,
}: {
  icon: any
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="dashboard_stat">
      <div className="dashboard_stat_icon" style={{ '--sc-accent': accent } as CSSProperties}>
        <Icon size={24} />
      </div>
      <div>
        <div className="dashboard_stat_value">{value}</div>
        <div className="dashboard_stat_label">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: events } = useQuery({
    queryKey: ['access-events'],
    queryFn: async () => {
      const { data } = await api.get('/access/events?limit=10')
      return data.data || []
    },
    retry: false,
  })

  const granted = events?.filter((e: any) => e.result === 'granted').length ?? 0
  const denied = events?.filter((e: any) => e.result === 'denied').length ?? 0
  const total = events?.length ?? 0
  const successRate = total > 0 ? Math.round((granted / total) * 100) : 0
  const lastEvent = events?.[0]
  const denialByReason = useMemo(() => {
    const reasons: Record<string, number> = {}
    ;(events ?? []).forEach((e: any) => {
      if (e.result === 'denied') reasons[e.denial_reason ?? 'desconocido'] = (reasons[e.denial_reason ?? 'desconocido'] ?? 0) + 1
    })
    return Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [events])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="dashboard_head">
        <h1 className="dashboard_title">Bienvenido, {user?.full_name?.split(' ')[0]}</h1>
        <p className="dashboard_subtitle">
          Panel de control — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="dashboard_stats">
        <StatCard icon={Activity} label="Eventos hoy" value={events?.length ?? 0} accent="#00a88e" />
        <StatCard icon={CheckCircle} label="Accesos permitidos" value={granted} accent="#3b82f6" />
        <StatCard icon={XCircle} label="Accesos denegados" value={denied} accent="#ef4444" />
        <StatCard icon={Shield} label="Tasa de exito" value={`${successRate}%`} accent="#a855f7" />
      </div>

      <div className="dashboard_grid">
        <div className="dashboard_panel">
          <h2 className="dashboard_panel_title">Últimos eventos de acceso</h2>
          {!events && <div className="dashboard_loading">Cargando...</div>}
          {events?.length === 0 && <div className="dashboard_empty">Sin eventos registrados</div>}
          {events?.map((e: any) => (
            <div key={e.id} className="dashboard_event">
              {e.result === 'granted'
                ? <CheckCircle size={18} color="#00a88e" />
                : <XCircle size={18} color="#ef4444" />}
              <div className="dashboard_event_main">
                <div className="dashboard_event_name">
                  {e.user?.full_name ?? 'Desconocido'} — <span className="dashboard_event_uid">{e.nfc_uid}</span>
                </div>
                <div className="dashboard_event_time">{new Date(e.timestamp).toLocaleString('es-MX')}</div>
              </div>
              <span className={`dashboard_pill ${e.result === 'granted' ? 'dashboard_pill_granted' : 'dashboard_pill_denied'}`}>
                {e.result === 'granted' ? 'Permitido' : 'Denegado'}
              </span>
            </div>
          ))}
        </div>

        <div className="dashboard_side">
          <div className="dashboard_side_card">
            <div className="dashboard_side_head">
              <Clock3 size={16} /> Ultimo evento
            </div>
            {lastEvent ? (
              <>
                <div className="dashboard_last_name">{lastEvent.user?.full_name ?? 'Desconocido'}</div>
                <div className="dashboard_last_time">{new Date(lastEvent.timestamp).toLocaleString('es-MX')}</div>
                <div className={`dashboard_last_result ${lastEvent.result === 'granted' ? 'dashboard_last_result_ok' : 'dashboard_last_result_no'}`}>
                  {lastEvent.result === 'granted' ? 'Permitido' : 'Denegado'}
                </div>
              </>
            ) : <div className="dashboard_empty">Sin datos recientes.</div>}
          </div>

          <div className="dashboard_side_card">
            <div className="dashboard_side_head">
              <AlertTriangle size={16} /> Motivos de denegacion
            </div>
            {denialByReason.length > 0 ? denialByReason.map(([reason, count]) => (
              <div key={reason} className="dashboard_reason">
                <span className="dashboard_reason_name">{reason}</span>
                <span className="dashboard_reason_count">{count}</span>
              </div>
            )) : <div className="dashboard_empty">No hay denegaciones.</div>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
