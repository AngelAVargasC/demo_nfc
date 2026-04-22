import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'

type Option<T extends string> = { value: T; label: string; icon?: ReactNode }

export function Segmented<T extends string>({
  options, value, onChange, size = 'md',
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const { colors } = useTheme()
  const h = size === 'sm' ? 30 : 36
  const px = size === 'sm' ? 10 : 14
  const fs = size === 'sm' ? 12 : 13

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        position: 'relative',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              height: h,
              padding: `0 ${px}px`,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? colors.textStrong : colors.muted,
              fontSize: fs,
              fontWeight: active ? 650 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: radius.sm,
              transition: 'color 140ms ease',
              zIndex: 1,
            }}
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                style={{
                  position: 'absolute', inset: 0,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  boxShadow: colors.elev1,
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
