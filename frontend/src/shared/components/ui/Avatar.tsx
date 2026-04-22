import { useTheme } from '@/shared/theme/theme'

export function Avatar({
  name,
  src,
  size = 36,
  tone = 'primary',
  ring = false,
}: {
  name?: string | null
  src?: string | null
  size?: number
  tone?: 'primary' | 'warning' | 'danger' | 'neutral'
  ring?: boolean
}) {
  const { colors } = useTheme()
  const toneMap = {
    primary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
    neutral: { bg: colors.surfaceAlt, fg: colors.muted, border: colors.border },
  }[tone]
  const initials = (name?.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('') || '·').toUpperCase()

  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0,
        borderRadius: '50%',
        background: toneMap.bg,
        color: toneMap.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.38), fontWeight: 700,
        overflow: 'hidden',
        border: ring ? `2px solid ${toneMap.border}` : `1px solid ${colors.border}`,
      }}
    >
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}
