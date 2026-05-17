import { useMemo, useState } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import './FinancePage.css'

const PILL_CLASS: Record<string, string> = {
  paid: 'finance_pill_paid',
  partial: 'finance_pill_partial',
  pending: 'finance_pill_pending',
}
const PILL_LABEL: Record<string, string> = {
  paid: 'Pagado',
  partial: 'Parcial',
  pending: 'Pendiente',
}

export default function FinancePage() {
  const [statusFilter, setStatusFilter] = useState('all')

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
      <div className="finance_head">
        <h1 className="finance_title">Finanzas</h1>
        <p className="finance_subtitle">Gestión financiera por Logia</p>
      </div>

      <div className="finance_stats">
        {[
          { icon: DollarSign, label: 'Total cobrado', value: `$${mockSummary.ingresos.toLocaleString()}`, color: '#00a88e' },
          { icon: CheckCircle, label: 'Pagado', value: `$${mockSummary.pagados.toLocaleString()}`, color: '#3b82f6' },
          { icon: AlertTriangle, label: 'Pendiente', value: `$${mockSummary.pendiente.toLocaleString()}`, color: '#f59e0b' },
          { icon: TrendingUp, label: 'Morosidad', value: mockSummary.morosidad, color: '#ef4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="finance_stat">
            <div className="finance_stat_row">
              <div>
                <div className="finance_stat_value">{value}</div>
                <div className="finance_stat_label">{label}</div>
              </div>
              <Icon size={22} color={color} />
            </div>
          </div>
        ))}
      </div>

      <div className="finance_panel">
        <div className="finance_panel_head">
          <h2 className="finance_panel_title">Cobros recientes</h2>
          <select className="finance_select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="partial">Parcial</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        {filteredPayments.map((p, i) => (
          <div key={i} className="finance_row">
            <div className="finance_row_main">
              <div className="finance_row_name">{p.name}</div>
              <div className="finance_row_type">{p.type}</div>
            </div>
            <div className="finance_row_amount">${p.amount.toLocaleString()}</div>
            <span className={`finance_pill ${PILL_CLASS[p.status]}`}>{PILL_LABEL[p.status]}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
