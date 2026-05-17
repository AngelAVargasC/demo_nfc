import { CSSProperties, ReactNode, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

type CardProps = Omit<HTMLMotionProps<'div'>, 'ref'> & {
  padding?: number | string
  interactive?: boolean
  elevated?: boolean
  accent?: 'primary' | 'danger' | 'warning' | 'none'
  children?: ReactNode
  style?: CSSProperties
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 20, interactive = false, elevated = false, accent = 'none', className, style, children, ...rest },
  ref,
) {
  const cls = [
    'ui_card',
    elevated ? 'ui_card_elevated' : '',
    interactive ? 'ui_card_interactive' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div
      ref={ref}
      className={cls}
      whileHover={interactive ? { y: -1 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      style={{ padding, ...style }}
      {...rest}
    >
      {accent !== 'none' && <span className={`ui_card_bar ui_card_bar_${accent}`} />}
      {children}
    </motion.div>
  )
})
