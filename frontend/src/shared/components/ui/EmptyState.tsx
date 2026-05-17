import { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="ui_empty">
      {icon && <div className="ui_empty_icon">{icon}</div>}
      <div className="ui_empty_title">{title}</div>
      {description && <div className="ui_empty_desc">{description}</div>}
      {action && <div className="ui_empty_action">{action}</div>}
    </div>
  )
}
