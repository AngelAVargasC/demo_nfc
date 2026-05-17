import { CSSProperties, ReactNode } from 'react'

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
  return (
    <span className={`ui_badge ui_badge_${size} ui_badge_${tone} ui_badge_${variant}`} style={style}>
      {icon}
      {children}
    </span>
  )
}
