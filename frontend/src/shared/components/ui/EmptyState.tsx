import { ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme'

export function EmptyState({
  icon, title, description, action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '36px 20px', color: colors.muted,
    }}>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: colors.surfaceAlt,
          color: colors.subtle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>{icon}</div>
      )}
      <div style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>{title}</div>
      {description && <div style={{ marginTop: 4, fontSize: 12.5, maxWidth: 320 }}>{description}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
