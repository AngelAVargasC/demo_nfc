import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function KPI({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  footer,
  accent,
  index = 0,
}: {
  label: string
  value: ReactNode
  delta?: number | null
  deltaLabel?: string
  icon?: ReactNode
  footer?: ReactNode
  accent?: 'primary' | 'warning' | 'danger' | 'accent'
  index?: number
}) {
  const hasDelta = typeof delta === 'number'
  const deltaPositive = hasDelta && (delta as number) >= 0

  return (
    <motion.div
      className={`ui_kpi ui_kpi_${accent ?? 'primary'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <span className="ui_kpi_bar" />
      <div className="ui_kpi_head">
        <div className="ui_kpi_label">{label}</div>
        {icon && <span className="ui_kpi_icon">{icon}</span>}
      </div>
      <div className="ui_kpi_value">{value}</div>
      <div className="ui_kpi_foot">
        {hasDelta && (
          <span className={`ui_kpi_delta ${deltaPositive ? 'ui_kpi_delta_up' : 'ui_kpi_delta_down'}`}>
            {deltaPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta as number).toFixed(1)}%
          </span>
        )}
        {deltaLabel && <span>{deltaLabel}</span>}
        {footer && <span>{footer}</span>}
      </div>
    </motion.div>
  )
}
