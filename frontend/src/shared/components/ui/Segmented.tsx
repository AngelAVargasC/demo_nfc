import { ReactNode } from 'react'
import { motion } from 'framer-motion'

type Option<T extends string> = { value: T; label: string; icon?: ReactNode }

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`ui_seg ui_seg_${size}`}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`ui_seg_btn${active ? ' ui_seg_btn_active' : ''}`}
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                className="ui_seg_thumb"
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
