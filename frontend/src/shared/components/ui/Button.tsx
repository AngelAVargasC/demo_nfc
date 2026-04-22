import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, full, style, children, disabled, ...rest },
  ref,
) {
  const { colors } = useTheme()

  const height = size === 'sm' ? 32 : size === 'lg' ? 46 : 38
  const px = size === 'sm' ? 12 : size === 'lg' ? 20 : 14
  const fontSize = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13.5

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primary, bgHover: colors.primaryHover, fg: '#ffffff', border: colors.primary }
      case 'secondary':
        return { bg: colors.surfaceAlt, bgHover: colors.surfaceHover, fg: colors.text, border: colors.border }
      case 'outline':
        return { bg: 'transparent', bgHover: colors.surfaceHover, fg: colors.text, border: colors.border }
      case 'ghost':
        return { bg: 'transparent', bgHover: colors.surfaceHover, fg: colors.text, border: 'transparent' }
      case 'danger':
        return { bg: colors.danger, bgHover: '#b91c1c', fg: '#ffffff', border: colors.danger }
    }
  })()

  return (
    <button
      ref={ref}
      disabled={disabled}
      style={{
        height,
        padding: `0 ${px}px`,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: radius.md,
        fontSize,
        fontWeight: 600,
        letterSpacing: 0.1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.55 : 1,
        width: full ? '100%' : undefined,
        transition: 'background 140ms ease, transform 140ms ease, box-shadow 140ms ease',
        outline: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = palette.bgHover
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = palette.bg
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = colors.focusRing
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
      }}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})
