import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'

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
  const { colors } = useTheme()
  const accentColor =
    accent === 'warning' ? colors.warning :
    accent === 'danger' ? colors.danger :
    accent === 'accent' ? colors.accent :
    colors.primary

  const deltaPositive = typeof delta === 'number' && delta >= 0
  const deltaColor = delta === undefined || delta === null ? colors.muted : deltaPositive ? colors.success : colors.danger

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: colors.elev1,
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: accentColor, opacity: 0.9 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.muted }}>
          {label}
        </div>
        {icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: colors.surfaceAlt,
            color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{icon}</span>
        )}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: colors.textStrong,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.05,
      }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: colors.muted }}>
        {typeof delta === 'number' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            color: deltaColor, fontWeight: 600,
          }}>
            {deltaPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {deltaLabel && <span>{deltaLabel}</span>}
        {footer && <span>{footer}</span>}
      </div>
    </motion.div>
  )
}
