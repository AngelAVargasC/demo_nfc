import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import api from '@/shared/services/api'
import { useTheme } from '@/shared/theme/theme'
import { radius } from '@/shared/theme/theme'
import { StatusDot } from '@/shared/components/ui'
import { useResponsive } from '@/shared/hooks/useResponsive'
import {
  Users, DollarSign, FileText, BarChart2,
  LogOut, Home, Moon, Sun, Radio, Search, Command, Bell, ChevronDown, Settings, ShieldCheck, Menu, X,
} from 'lucide-react'

type NavItem = { to: string; icon: any; label: string; group: 'principal' | 'gestion' | 'inteligencia' }

const navItems: NavItem[] = [
  { to: '/dashboard',  icon: Home,       label: 'Panel',       group: 'principal' },
  { to: '/nfc',        icon: Radio,      label: 'Acceso NFC',  group: 'principal' },
  { to: '/users',      icon: Users,      label: 'Miembros',    group: 'gestion' },
  { to: '/finance',    icon: DollarSign, label: 'Finanzas',    group: 'gestion' },
  { to: '/documents',  icon: FileText,   label: 'Documentos',  group: 'gestion' },
  { to: '/reports',    icon: BarChart2,  label: 'Reportes',    group: 'inteligencia' },
]

const GROUP_LABEL: Record<string, string> = {
  principal: 'Operación',
  gestion: 'Gestión',
  inteligencia: 'Analítica',
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, colors, toggleMode } = useTheme()
  const { isMobile, isTablet } = useResponsive()
  const [now, setNow] = useState(() => new Date())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  const currentPage = navItems.find(n => location.pathname.startsWith(n.to))

  const groupedNav: Record<string, NavItem[]> = navItems.reduce((acc, item) => {
    (acc[item.group] ||= []).push(item); return acc
  }, {} as Record<string, NavItem[]>)

  const sidebarContent = (
    <>
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: colors.primary, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, letterSpacing: -0.4,
            boxShadow: colors.elev1,
          }}>
            SG
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: colors.textStrong, letterSpacing: -0.2 }}>SIGAM</div>
            <div style={{ fontSize: 10.5, color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>Plataforma Masónica</div>
          </div>
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: '14px 10px' }}>
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase',
                color: colors.subtle, fontWeight: 700, padding: '0 10px 8px',
              }}>
                {GROUP_LABEL[group]}
              </div>
              {items.map(({ to, icon: Icon, label }) => {
                const active = location.pathname.startsWith(to)
                return (
                  <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                    <motion.div
                      whileHover={{ x: active ? 0 : 2 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '9px 11px', margin: '2px 0',
                        fontSize: 13.5, fontWeight: active ? 650 : 500,
                        color: active ? colors.primaryStrong : colors.text,
                        background: active ? colors.primarySoft : 'transparent',
                        borderRadius: radius.md,
                        transition: 'background 140ms ease, color 140ms ease',
                      }}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          style={{
                            position: 'absolute', left: -10, top: 6, bottom: 6,
                            width: 3, background: colors.primary, borderRadius: 4,
                          }}
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon size={16} strokeWidth={active ? 2.25 : 1.9} />
                      {label}
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Estado del sistema + perfil */}
        <div style={{ padding: '12px 12px 14px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: radius.md,
            background: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            marginBottom: 10,
          }}>
            <StatusDot tone="success" pulse />
            <div style={{ fontSize: 11.5, color: colors.text, fontWeight: 600 }}>Sistema operativo</div>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.subtle, fontVariantNumeric: 'tabular-nums' }}>
              {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <button
            onClick={toggleMode}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', marginBottom: 8,
              background: 'transparent', color: colors.muted,
              border: `1px solid ${colors.border}`, borderRadius: radius.md,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              transition: 'background 140ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {mode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 6px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: colors.primarySoft, color: colors.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}>
              {(user?.full_name?.trim()?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: colors.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: 10.5, color: colors.muted, textTransform: 'capitalize', letterSpacing: 0.3 }}>{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: 'transparent', border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, padding: 6, cursor: 'pointer',
                color: colors.muted, display: 'flex',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = colors.danger; e.currentTarget.style.borderColor = colors.danger }}
              onMouseLeave={e => { e.currentTarget.style.color = colors.muted; e.currentTarget.style.borderColor = colors.border }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: colors.appBg, color: colors.text }}>
      {!isMobile && (
        <aside style={{
          width: isTablet ? 232 : 256, background: colors.surface, borderRight: `1px solid ${colors.border}`,
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh', flexShrink: 0, overflow: 'hidden',
        }}>
          {sidebarContent}
        </aside>
      )}

      {isMobile && (
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 39,
                  background: 'rgba(0,0,0,0.45)',
                }}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: 288,
                  background: colors.surface,
                  borderRight: `1px solid ${colors.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  height: '100vh',
                  zIndex: 40,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 0' }}>
                  <button onClick={() => setSidebarOpen(false)} style={iconBtn(colors)}>
                    <X size={15} />
                  </button>
                </div>
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ============ CONTENT ============ */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          height: isMobile ? 56 : 60,
          background: `${colors.appBg}e6`,
          backdropFilter: 'saturate(140%) blur(10px)',
          WebkitBackdropFilter: 'saturate(140%) blur(10px)',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', gap: 18,
          padding: isMobile ? '0 14px' : isTablet ? '0 18px' : '0 28px',
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={iconBtn(colors)}>
              <Menu size={16} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.muted }}>
            <ShieldCheck size={14} color={colors.primary} />
            <span style={{ fontWeight: 600, color: colors.text }}>
              {currentPage?.label ?? 'Panel'}
            </span>
            {!isMobile && <ChevronDown size={12} style={{ opacity: 0.5 }} />}
            {!isMobile && <span>Chilam Balam N°3</span>}
          </div>

          {!isMobile && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => {}}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 14px', width: '100%', maxWidth: isTablet ? 280 : 420,
                background: colors.surfaceAlt,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                color: colors.muted, fontSize: 13,
                cursor: 'pointer', transition: 'border-color 140ms ease, background 140ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderStrong }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border }}
            >
              <Search size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>Buscar miembros, pagos, documentos…</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10.5, padding: '2px 6px',
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 5, color: colors.subtle, fontWeight: 600,
              }}>
                <Command size={10} /> K
              </span>
            </button>
          </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button title="Notificaciones" style={iconBtn(colors)}>
              <Bell size={15} />
              <span style={{
                position: 'absolute', top: 6, right: 6, width: 7, height: 7,
                borderRadius: '50%', background: colors.danger, border: `1.5px solid ${colors.appBg}`,
              }} />
            </button>
            <button title="Ajustes" style={iconBtn(colors)}>
              <Settings size={15} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            style={{
              flex: 1,
              padding: isMobile ? '14px 14px 22px' : isTablet ? '18px 18px 28px' : '28px 28px 44px',
              minWidth: 0,
              overflow: 'auto',
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function iconBtn(colors: any) {
  return {
    position: 'relative' as const,
    width: 34, height: 34, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: `1px solid ${colors.border}`,
    borderRadius: 8, color: colors.muted, cursor: 'pointer',
    transition: 'color 140ms ease, background 140ms ease, border-color 140ms ease',
  }
}
