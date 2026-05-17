import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightSlot, size = 'md', className, ...rest },
  ref,
) {
  const cls = [
    'ui_input',
    `ui_input_${size}`,
    leftIcon ? 'ui_input_hasleft' : '',
    rightSlot ? 'ui_input_hasright' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ui_input_wrap">
      {leftIcon && <span className="ui_input_icon">{leftIcon}</span>}
      <input ref={ref} className={cls} {...rest} />
      {rightSlot && <span className="ui_input_slot">{rightSlot}</span>}
    </div>
  )
})
