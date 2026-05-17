import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

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
  { variant = 'primary', size = 'md', leftIcon, rightIcon, full, className, children, disabled, ...rest },
  ref,
) {
  const cls = ['ui_btn', `ui_btn_${size}`, `ui_btn_${variant}`, full ? 'ui_btn_full' : '', className || '']
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} disabled={disabled} className={cls} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})
