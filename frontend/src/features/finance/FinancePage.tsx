import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/shared/theme/theme'
import { useResponsive } from '@/shared/hooks/useResponsive'

export default function FinancePage() {
  const { colors, mode } = useTheme()
  const { isMobile } = useResponsive()
  const [statusFilter, setStatusFilter] = useState('all')
  const paymentStatusStyle = {
    paid: {
      background: mode === 'light' ? '#e6f6f3' : '#0d3b34',
      text: '#00a88e',
      border: mode === 'light' ? '#7ed9ca' : '#00a88e',
    },
    partial: {
      background: mode === 'light' ? '#fffbeb' : '#451a03',
      text: '#d97706',
      border: mode === 'light' ? '#fcd34d' : '#f59e0b',
    },
    pending: {
      background: mode === 'light' ? '#fef2f2' : '#450a0a',
      text: '#dc2626',
      border: mode === 'light' ? '#fca5a5' : '#ef4444',
    },
  }
  const mockSummary = { ingresos: 45000, pendiente: 8500, pagados: 36500, morosidad: '18.8%' }
  const payments = [
    { name: 'Juan García López', type: 'Cuota mensual', amount: 500, status: 'paid' },
    { name: 'Carlos Rodríguez', type: 'Cuota mensual', amount: 500, status: 'pending' },
    { name: 'Pedro Martínez', type: 'Cuota mensual', amount: 500, status: 'paid' },
    { name: 'Luis Hernández', type: 'Iniciación', amount: 5000, status: 'partial' },
  ]
  const filteredPayments = useMemo(
    () => payments.filter((p) => statusFilter === 'all' || p.status === statusFilter),
    [statusFilter],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: colors.text }}>Finanzas</h1>
        <p style={{ color: colors.muted, fontSize: 13 }}>Gestión financiera por Logia</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { icon: DollarSign, label: 'Total cobrado', value: `$${mockSummary.ingresos.toLocaleString()}`, color: '#00a88e' },
          { icon: CheckCircle, label: 'Pagado', value: `$${mockSummary.pagados.toLocaleString()}`, color: '#3b82f6' },
          { icon: AlertTriangle, label: 'Pendiente', value: `$${mockSummary.pendiente.toLocaleString()}`, color: '#f59e0b' },
          { icon: TrendingUp, label: 'Morosidad', value: mockSummary.morosidad, color: '#ef4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{value}</div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{label}</div>
              </div>
              <Icon size={22} color={color} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? 14 : 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>Cobros recientes</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: '0 10px' }}
          >
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="partial">Parcial</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        {filteredPayments.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${colors.border}`, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
              <div style={{ fontSize: 14, color: colors.text, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: colors.muted }}>{p.type}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>${p.amount.toLocaleString()}</div>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: p.status === 'paid'
                ? paymentStatusStyle.paid.background
                : p.status === 'partial'
                  ? paymentStatusStyle.partial.background
                  : paymentStatusStyle.pending.background,
              color: p.status === 'paid'
                ? paymentStatusStyle.paid.text
                : p.status === 'partial'
                  ? paymentStatusStyle.partial.text
                  : paymentStatusStyle.pending.text,
              border: `1px solid ${p.status === 'paid'
                ? paymentStatusStyle.paid.border
                : p.status === 'partial'
                  ? paymentStatusStyle.partial.border
                  : paymentStatusStyle.pending.border}`,
            }}>
              {p.status === 'paid' ? 'Pagado' : p.status === 'partial' ? 'Parcial' : 'Pendiente'}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
