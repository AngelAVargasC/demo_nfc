import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle, Activity, Clock3, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/shared/services/api'
import { useTheme } from '@/shared/theme/theme'
import { useResponsive } from '@/shared/hooks/useResponsive'

function StatCard({ icon: Icon, label, value, color, text, muted, surface, border }: { icon: any; label: string; value: string | number; color: string; text: string; muted: string; surface: string; border: string }) {
  return (
    <div style={{
      background: surface, border: `1px solid ${border}`, borderRadius: 12,
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ background: `${color}15`, borderRadius: 10, padding: 12 }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: text }}>{value}</div>
        <div style={{ fontSize: 13, color: muted }}>{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { colors } = useTheme()
  const { isMobile, isTablet } = useResponsive()
  const statusColors = {
    granted: {
      background: colors.surface === '#ffffff' ? '#e6f6f3' : '#0d3b34',
      text: '#00a88e',
      border: colors.surface === '#ffffff' ? '#7ed9ca' : '#00a88e',
    },
    denied: {
      background: colors.surface === '#ffffff' ? '#fef2f2' : '#450a0a',
      text: '#dc2626',
      border: colors.surface === '#ffffff' ? '#fca5a5' : '#ef4444',
    },
  }

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
      <div style={{ marginBottom: isMobile ? 18 : 32 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: colors.text }}>
          Bienvenido, {user?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ color: colors.muted, marginTop: 4, fontSize: isMobile ? 12 : 14 }}>Panel de control — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(170px, 1fr))' : 'repeat(4, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
        <StatCard icon={Activity} label="Eventos hoy" value={events?.length ?? 0} color="#00a88e" text={colors.text} muted={colors.muted} surface={colors.surface} border={colors.border} />
        <StatCard icon={CheckCircle} label="Accesos permitidos" value={granted} color="#3b82f6" text={colors.text} muted={colors.muted} surface={colors.surface} border={colors.border} />
        <StatCard icon={XCircle} label="Accesos denegados" value={denied} color="#ef4444" text={colors.text} muted={colors.muted} surface={colors.surface} border={colors.border} />
        <StatCard icon={Shield} label="Tasa de exito" value={`${successRate}%`} color="#a855f7" text={colors.text} muted={colors.muted} surface={colors.surface} border={colors.border} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 12 }}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? 14 : 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 16 }}>Últimos eventos de acceso</h2>
        {!events && <div style={{ color: colors.muted, fontSize: 14 }}>Cargando...</div>}
        {events?.length === 0 && <div style={{ color: colors.muted, fontSize: 14 }}>Sin eventos registrados</div>}
        {events?.map((e: any) => (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: `1px solid ${colors.border}`,
          }}>
            {e.result === 'granted'
              ? <CheckCircle size={18} color="#00a88e" />
              : <XCircle size={18} color="#ef4444" />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: colors.text, fontWeight: 500 }}>
                {e.user?.full_name ?? 'Desconocido'} — <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.nfc_uid}</span>
              </div>
              <div style={{ fontSize: 12, color: colors.muted }}>{new Date(e.timestamp).toLocaleString('es-MX')}</div>
            </div>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: e.result === 'granted' ? statusColors.granted.background : statusColors.denied.background,
              color: e.result === 'granted' ? statusColors.granted.text : statusColors.denied.text,
              border: `1px solid ${e.result === 'granted' ? statusColors.granted.border : statusColors.denied.border}`,
            }}>
              {e.result === 'granted' ? 'Permitido' : 'Denegado'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? 14 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: colors.text, fontWeight: 700 }}>
            <Clock3 size={16} /> Ultimo evento
          </div>
          {lastEvent ? (
            <>
              <div style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>{lastEvent.user?.full_name ?? 'Desconocido'}</div>
              <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{new Date(lastEvent.timestamp).toLocaleString('es-MX')}</div>
              <div style={{ marginTop: 10, fontSize: 12, color: lastEvent.result === 'granted' ? '#00a88e' : '#dc2626', fontWeight: 700 }}>
                {lastEvent.result === 'granted' ? 'Permitido' : 'Denegado'}
              </div>
            </>
          ) : <div style={{ color: colors.muted, fontSize: 13 }}>Sin datos recientes.</div>}
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? 14 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: colors.text, fontWeight: 700 }}>
            <AlertTriangle size={16} /> Motivos de denegacion
          </div>
          {denialByReason.length > 0 ? denialByReason.map(([reason, count]) => (
            <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, padding: '7px 0', fontSize: 12 }}>
              <span style={{ color: colors.muted }}>{reason}</span>
              <span style={{ color: colors.text, fontWeight: 700 }}>{count}</span>
            </div>
          )) : <div style={{ color: colors.muted, fontSize: 13 }}>No hay denegaciones.</div>}
        </div>
      </div>
      </div>
    </motion.div>
  )
}
