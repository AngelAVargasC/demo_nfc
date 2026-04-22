import { ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme'

export function SectionHeader({
  eyebrow, title, subtitle, right,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div>
        {eyebrow && (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.primary, marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3, color: colors.textStrong, lineHeight: 1.15 }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: '6px 0 0', color: colors.muted, fontSize: 13.5 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export function PanelHeader({
  title, hint, right, icon,
}: {
  title: ReactNode
  hint?: ReactNode
  right?: ReactNode
  icon?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && <span style={{ color: colors.muted, display: 'flex' }}>{icon}</span>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 650, letterSpacing: -0.1, color: colors.textStrong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {hint && <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>{hint}</div>}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}
