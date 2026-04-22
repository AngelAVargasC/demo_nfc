import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightSlot, size = 'md', style, ...rest },
  ref,
) {
  const { colors } = useTheme()
  const h = size === 'sm' ? 32 : size === 'lg' ? 46 : 38
  const fs = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13.5
  const px = leftIcon ? 34 : 12

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {leftIcon && (
        <span style={{
          position: 'absolute', left: 10, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center', color: colors.subtle, pointerEvents: 'none',
        }}>{leftIcon}</span>
      )}
      <input
        ref={ref}
        style={{
          height: h,
          width: '100%',
          padding: `0 ${rightSlot ? 40 : 12}px 0 ${px}px`,
          background: colors.inputBg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          fontSize: fs,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 140ms ease, box-shadow 140ms ease',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.borderFocus
          e.currentTarget.style.boxShadow = colors.focusRing
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = colors.border
          e.currentTarget.style.boxShadow = 'none'
          rest.onBlur?.(e)
        }}
        {...rest}
      />
      {rightSlot && (
        <span style={{ position: 'absolute', right: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
          {rightSlot}
        </span>
      )}
    </div>
  )
})
