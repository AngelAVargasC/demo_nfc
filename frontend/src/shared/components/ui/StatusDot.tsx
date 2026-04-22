import { useTheme } from '@/shared/theme/theme'

type Tone = 'success' | 'warning' | 'danger' | 'muted' | 'primary'

export function StatusDot({ tone = 'success', pulse = false, size = 8 }: { tone?: Tone; pulse?: boolean; size?: number }) {
  const { colors } = useTheme()
  const color =
    tone === 'success' ? colors.success :
    tone === 'warning' ? colors.warning :
    tone === 'danger'  ? colors.danger  :
    tone === 'primary' ? colors.primary : colors.subtle

  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 1,
      }} />
      {pulse && (
        <span style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          background: color, opacity: 0.18,
          animation: 'sigam-pulse 1.6s ease-out infinite',
        }} />
      )}
    </span>
  )
}
