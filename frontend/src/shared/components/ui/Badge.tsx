import { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'
type Variant = 'soft' | 'outline' | 'solid'

export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  icon,
  size = 'sm',
  style,
}: {
  children: ReactNode
  tone?: Tone
  variant?: Variant
  icon?: ReactNode
  size?: 'xs' | 'sm' | 'md'
  style?: CSSProperties
}) {
  const { colors } = useTheme()
  const toneMap: Record<Tone, { base: string; soft: string; text: string }> = {
    neutral: { base: colors.borderStrong, soft: colors.surfaceAlt, text: colors.muted },
    primary: { base: colors.primary, soft: colors.primarySoft, text: colors.primary },
    success: { base: colors.success, soft: colors.successSoft, text: colors.success },
    warning: { base: colors.warning, soft: colors.warningSoft, text: colors.warning },
    danger:  { base: colors.danger,  soft: colors.dangerSoft,  text: colors.danger  },
    accent:  { base: colors.accent,  soft: colors.accentSoft,  text: colors.accent  },
  }
  const t = toneMap[tone]

  const base: CSSProperties =
    variant === 'soft'
      ? { background: t.soft, color: t.text, border: `1px solid transparent` }
      : variant === 'outline'
      ? { background: 'transparent', color: t.text, border: `1px solid ${t.base}` }
      : { background: t.base, color: '#ffffff', border: `1px solid ${t.base}` }

  const fs = size === 'xs' ? 10 : size === 'md' ? 12 : 11
  const py = size === 'xs' ? 2 : size === 'md' ? 5 : 3
  const px = size === 'xs' ? 7 : size === 'md' ? 11 : 9

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: `${py}px ${px}px`,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: 0.2,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...base,
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  )
}
