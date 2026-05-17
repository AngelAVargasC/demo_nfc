type Tone = 'success' | 'warning' | 'danger' | 'muted' | 'primary'

export function StatusDot({
  tone = 'success',
  pulse = false,
  size = 8,
}: {
  tone?: Tone
  pulse?: boolean
  size?: number
}) {
  return (
    <span className={`ui_status ui_status_${tone}`} style={{ width: size, height: size }}>
      <span className="ui_status_dot" />
      {pulse && <span className="ui_status_pulse" />}
    </span>
  )
}
