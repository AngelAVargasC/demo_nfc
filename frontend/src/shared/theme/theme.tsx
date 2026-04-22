import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type ThemeMode = 'light' | 'dark'

export type ThemeColors = {
  appBg: string
  surface: string
  surfaceAlt: string
  surfaceHover: string
  border: string
  borderStrong: string
  borderFocus: string
  text: string
  textStrong: string
  muted: string
  subtle: string
  inputBg: string
  activeBg: string
  toastBg: string
  primary: string
  primaryHover: string
  primarySoft: string
  primaryStrong: string
  accent: string
  accentSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  success: string
  successSoft: string
  overlay: string
  elev1: string
  elev2: string
  focusRing: string
}

const palette: Record<ThemeMode, ThemeColors> = {
  light: {
    appBg: '#f7f8fa',
    surface: '#ffffff',
    surfaceAlt: '#f3f5f8',
    surfaceHover: '#eef1f5',
    border: '#e6e9ee',
    borderStrong: '#d6dae2',
    borderFocus: '#00a88e',
    text: '#0b1118',
    textStrong: '#030712',
    muted: '#5b6473',
    subtle: '#8a93a2',
    inputBg: '#ffffff',
    activeBg: '#e6f6f3',
    toastBg: '#ffffff',
    primary: '#00a88e',
    primaryHover: '#00917a',
    primarySoft: '#e6f6f3',
    primaryStrong: '#00735f',
    accent: '#4f46e5',
    accentSoft: '#edeefe',
    warning: '#b45309',
    warningSoft: '#fef3e2',
    danger: '#c62828',
    dangerSoft: '#fdecec',
    success: '#00a88e',
    successSoft: '#e6f6f3',
    overlay: 'rgba(11,17,24,0.5)',
    elev1: '0 1px 2px rgba(10,20,40,0.04)',
    elev2: '0 4px 16px rgba(10,20,40,0.06), 0 1px 2px rgba(10,20,40,0.04)',
    focusRing: '0 0 0 3px rgba(0,168,142,0.18)',
  },
  dark: {
    appBg: '#0a0d12',
    surface: '#11151c',
    surfaceAlt: '#161b24',
    surfaceHover: '#1a202a',
    border: '#1d232d',
    borderStrong: '#2a3140',
    borderFocus: '#00c3a3',
    text: '#e7ebf1',
    textStrong: '#f3f5f8',
    muted: '#8e98a6',
    subtle: '#5d6675',
    inputBg: '#0f131a',
    activeBg: 'rgba(0,195,163,0.12)',
    toastBg: '#11151c',
    primary: '#00c3a3',
    primaryHover: '#00d6b3',
    primarySoft: 'rgba(0,195,163,0.12)',
    primaryStrong: '#00e3be',
    accent: '#818cf8',
    accentSoft: 'rgba(129,140,248,0.14)',
    warning: '#eab308',
    warningSoft: 'rgba(234,179,8,0.12)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239,68,68,0.14)',
    success: '#00c3a3',
    successSoft: 'rgba(0,195,163,0.12)',
    overlay: 'rgba(0,0,0,0.65)',
    elev1: '0 0 0 1px rgba(255,255,255,0.02)',
    elev2: '0 8px 24px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.2)',
    focusRing: '0 0 0 3px rgba(0,195,163,0.28)',
  },
}

export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
}

export const space = (n: number) => n * 4

export const typography = {
  display: { fontSize: 28, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.15 },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2 },
  h2: { fontSize: 18, fontWeight: 650, letterSpacing: -0.2, lineHeight: 1.25 },
  h3: { fontSize: 15, fontWeight: 650, letterSpacing: -0.1, lineHeight: 1.3 },
  body: { fontSize: 14, fontWeight: 450, lineHeight: 1.5 },
  small: { fontSize: 12.5, fontWeight: 500, lineHeight: 1.45 },
  tiny: { fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  mono: { fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', fontVariantNumeric: 'tabular-nums' as const },
  numeric: { fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum"' },
}

type ThemeContextValue = {
  mode: ThemeMode
  colors: ThemeColors
  toggleMode: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('sigam_theme_mode')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('sigam_theme_mode', mode)
    document.documentElement.style.colorScheme = mode
    document.documentElement.style.background = palette[mode].appBg
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      colors: palette[mode],
      toggleMode: () => setMode(prev => (prev === 'light' ? 'dark' : 'light')),
      setMode,
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
