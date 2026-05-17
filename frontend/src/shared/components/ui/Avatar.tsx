export function Avatar({
  name,
  src,
  size = 36,
  tone = 'primary',
  ring = false,
}: {
  name?: string | null
  src?: string | null
  size?: number
  tone?: 'primary' | 'warning' | 'danger' | 'neutral'
  ring?: boolean
}) {
  const initials = (name?.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('') || '·').toUpperCase()
  const cls = `ui_avatar ui_avatar_${tone}${ring ? ' ui_avatar_ring' : ''}`

  return (
    <div className={cls} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {src ? <img className="ui_avatar_img" src={src} alt="" /> : initials}
    </div>
  )
}
