import { CSSProperties, ReactNode, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'

type CardProps = Omit<HTMLMotionProps<'div'>, 'ref'> & {
  padding?: number | string
  interactive?: boolean
  elevated?: boolean
  accent?: 'primary' | 'danger' | 'warning' | 'none'
  children?: ReactNode
  style?: CSSProperties
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 20, interactive = false, elevated = false, accent = 'none', style, children, ...rest },
  ref,
) {
  const { colors } = useTheme()
  const accentBar =
    accent === 'primary' ? colors.primary :
    accent === 'danger' ? colors.danger :
    accent === 'warning' ? colors.warning : null

  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -1 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding,
        boxShadow: elevated ? colors.elev2 : colors.elev1,
        position: 'relative',
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'border-color 180ms ease, background 180ms ease',
        ...style,
      }}
      {...rest}
    >
      {accentBar && (
        <span
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 3, background: accentBar,
          }}
        />
      )}
      {children}
    </motion.div>
  )
})
