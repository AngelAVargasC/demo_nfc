import { ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="ui_section">
      <div>
        {eyebrow && <div className="ui_section_eyebrow">{eyebrow}</div>}
        <h1 className="ui_section_title">{title}</h1>
        {subtitle && <p className="ui_section_subtitle">{subtitle}</p>}
      </div>
      {right && <div className="ui_section_right">{right}</div>}
    </div>
  )
}

export function PanelHeader({
  title,
  hint,
  right,
  icon,
}: {
  title: ReactNode
  hint?: ReactNode
  right?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="ui_panel">
      <div className="ui_panel_main">
        {icon && <span className="ui_panel_icon">{icon}</span>}
        <div className="ui_panel_text">
          <div className="ui_panel_title">{title}</div>
          {hint && <div className="ui_panel_hint">{hint}</div>}
        </div>
      </div>
      {right && <div className="ui_panel_right">{right}</div>}
    </div>
  )
}
