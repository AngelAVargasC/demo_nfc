import { CSSProperties } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/shared/theme/theme'
import './ReportsPage.css'

const asistenciaData = [
  { mes: 'Ene', asistencias: 42, invitados: 10 },
  { mes: 'Feb', asistencias: 38, invitados: 8 },
  { mes: 'Mar', asistencias: 55, invitados: 14 },
  { mes: 'Abr', asistencias: 47, invitados: 9 },
  { mes: 'May', asistencias: 52, invitados: 11 },
  { mes: 'Jun', asistencias: 58, invitados: 13 },
]

const ingresosData = [
  { mes: 'Ene', ingresos: 8500, egresos: 4200 },
  { mes: 'Feb', ingresos: 12000, egresos: 5100 },
  { mes: 'Mar', ingresos: 9800, egresos: 4600 },
  { mes: 'Abr', ingresos: 14700, egresos: 5900 },
  { mes: 'May', ingresos: 13400, egresos: 5500 },
  { mes: 'Jun', ingresos: 16200, egresos: 6200 },
]

const paymentStatusData = [
  { name: 'Pagado', value: 68 },
  { name: 'Pendiente', value: 22 },
  { name: 'Parcial', value: 10 },
]

const chargeTypeData = [
  { name: 'Cuotas', value: 42 },
  { name: 'Iniciacion', value: 25 },
  { name: 'Aumento', value: 18 },
  { name: 'Exaltacion', value: 15 },
]

const COLORS_PAYMENTS = ['#00a88e', '#ef4444', '#f59e0b']
const COLORS_CHARGES = ['#00a88e', '#3b82f6', '#a855f7', '#f59e0b']

export default function ReportsPage() {
  // recharts se configura por props (stroke, fill, contentStyle), no por CSS:
  // por eso esta vista conserva los colores del tema solo para las graficas.
  const { colors } = useTheme()
  const tooltipStyle = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }

  const totalIncome = ingresosData.reduce((acc, curr) => acc + curr.ingresos, 0)
  const totalExpense = ingresosData.reduce((acc, curr) => acc + curr.egresos, 0)
  const net = totalIncome - totalExpense

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="reports_head">
        <div>
          <h1 className="reports_title">Reportes</h1>
          <p className="reports_subtitle">Inteligencia de negocio por Logia</p>
        </div>
        <div className="reports_actions">
          <button className="reports_btn"><Download size={14} /> PDF</button>
          <button className="reports_btn"><Download size={14} /> CSV</button>
        </div>
      </div>

      <div className="reports_stats">
        {[
          { label: 'Ingreso total', value: `$${totalIncome.toLocaleString()}`, color: '#00a88e' },
          { label: 'Egreso total', value: `$${totalExpense.toLocaleString()}`, color: '#ef4444' },
          { label: 'Balance neto', value: `$${net.toLocaleString()}`, color: '#3b82f6' },
          { label: 'Morosidad', value: '18.8%', color: '#f59e0b' },
        ].map((item) => (
          <div key={item.label} className="reports_stat">
            <div className="reports_stat_label">{item.label}</div>
            <div className="reports_stat_value" style={{ '--rep-accent': item.color } as CSSProperties}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="reports_grid">
        <div className="reports_panel">
          <h3 className="reports_panel_title">Asistencia mensual (miembros vs invitados)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={asistenciaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="mes" stroke={colors.muted} fontSize={12} />
              <YAxis stroke={colors.muted} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="asistencias" name="Miembros" fill="#00a88e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="invitados" name="Invitados" fill="#7ed9ca" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="reports_panel">
          <h3 className="reports_panel_title">Ingresos vs egresos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={ingresosData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="mes" stroke={colors.muted} fontSize={12} />
              <YAxis stroke={colors.muted} fontSize={12} />
              <Tooltip formatter={(v: any) => `$${v.toLocaleString()}`} contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#00a88e" fill="#00a88e33" strokeWidth={2} />
              <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" fill="#ef444422" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="reports_panel">
          <h3 className="reports_panel_title">Estado de pagos</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={paymentStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {paymentStatusData.map((_, index) => (
                  <Cell key={`pay-${index}`} fill={COLORS_PAYMENTS[index % COLORS_PAYMENTS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="reports_panel">
          <h3 className="reports_panel_title">Distribucion de cargos</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={chargeTypeData} dataKey="value" nameKey="name" outerRadius={88} paddingAngle={2}>
                {chargeTypeData.map((_, index) => (
                  <Cell key={`charge-${index}`} fill={COLORS_CHARGES[index % COLORS_CHARGES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="reports_panel reports_panel_full">
          <h3 className="reports_panel_title_tight">Métricas clave</h3>
          <div className="reports_metrics">
            {[
              { label: 'Total miembros', value: '127', change: '+3 este mes' },
              { label: 'Tasa asistencia', value: '78%', change: '+5% vs mes ant.' },
              { label: 'Morosidad', value: '18.8%', change: '-2% vs mes ant.' },
              { label: 'Ingresos YTD', value: '$45,000', change: '+12% vs 2025' },
            ].map((m) => (
              <div key={m.label} className="reports_metric">
                <div className="reports_metric_value">{m.value}</div>
                <div className="reports_metric_label">{m.label}</div>
                <div className="reports_metric_change">{m.change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
