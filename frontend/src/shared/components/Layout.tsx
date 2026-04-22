import { ReactNode, useEffect, useRef, useState } from 'react'
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
  LogOut, Home, Moon, Sun, Radio, Search, Command,
  Bell, ChevronDown, Settings, ShieldCheck, Menu, X,
} from 'lucide-react'

type NavItem = { to: string; icon: any; label: string; group: 'principal' | 'gestion' | 'inteligencia' }

const navItems: NavItem[] = [
  { to: '/dashboard', icon: Home,       label: 'Panel',      group: 'principal' },
  { to: '/nfc',       icon: Radio,      label: 'Acceso NFC', group: 'principal' },
  { to: '/users',     icon: Users,      label: 'Miembros',   group: 'gestion' },
  { to: '/finance',   icon: DollarSign, label: 'Finanzas',   group: 'gestion' },
  { to: '/documents', icon: FileText,   label: 'Documentos', group: 'gestion' },
  { to: '/reports',   icon: BarChart2,  label: 'Reportes',   group: 'inteligencia' },
]

const GROUP_LABEL: Record<string, string> = {
  principal: 'Operación',
  gestion: 'Gestión',
  inteligencia: 'Analítica',
}

const SIDEBAR_W_DESKTOP = 256
const SIDEBAR_W_TABLET = 232
const SIDEBAR_W_MOBILE = 284
const TOPBAR_H_DESKTOP = 60
const TOPBAR_H_MOBILE = 56

/* ─── Sidebar inner (shared for desktop aside and mobile drawer) ── */
function SidebarInner({
  colors, mode, user, now, location, groupedNav, toggleMode, handleLogout, onNavClick,
}: any) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0, width: '100%',
      background: colors.surface, color: colors.text,
    }}>
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: colors.primary, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, letterSpacing: -0.4,
          boxShadow: colors.elev1, flexShrink: 0,
        }}>SG</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: colors.textStrong, letterSpacing: -0.2 }}>SIGAM</div>
          <div style={{ fontSize: 10.5, color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
            Plataforma Masónica
          </div>
        </div>
      </div>

      <nav style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as any,
        padding: '12px 10px',
      }}>
        {Object.entries(groupedNav).map(([group, items]: any) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase',
              color: colors.subtle, fontWeight: 700, padding: '0 10px 8px',
            }}>
              {GROUP_LABEL[group]}
            </div>
            {items.map(({ to, icon: Icon, label }: NavItem) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link key={to} to={to} style={{ textDecoration: 'none' }} onClick={onNavClick}>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 11,
                      padding: '10px 12px', margin: '2px 0',
                      fontSize: 13.5, fontWeight: active ? 650 : 500,
                      color: active ? colors.primaryStrong : colors.text,
                      background: active ? colors.primarySoft : 'transparent',
                      borderRadius: radius.md,
                      transition: 'background 140ms ease, color 140ms ease',
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: 'absolute', left: -10, top: 8, bottom: 8,
                          width: 3, background: colors.primary, borderRadius: 4,
                        }}
                      />
                    )}
                    <Icon size={16} strokeWidth={active ? 2.25 : 1.9} />
                    {label}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{
        padding: '10px 12px 14px',
        borderTop: `1px solid ${colors.border}`,
        flexShrink: 0,
        background: colors.surface,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: radius.md,
          background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
          marginBottom: 8,
        }}>
          <StatusDot tone="success" pulse />
          <div style={{ fontSize: 11, color: colors.text, fontWeight: 600 }}>Sistema operativo</div>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.subtle, fontVariantNumeric: 'tabular-nums' }}>
            {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <button
          onClick={toggleMode}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', marginBottom: 8,
            background: 'transparent', color: colors.muted,
            border: `1px solid ${colors.border}`, borderRadius: radius.md,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          {mode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: colors.primarySoft, color: colors.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, border: `1px solid ${colors.border}`,
          }}>
            {(user?.full_name?.trim()?.[0] ?? 'U').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12.5, color: colors.text, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 10.5, color: colors.muted, textTransform: 'capitalize', letterSpacing: 0.3 }}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'transparent', border: `1px solid ${colors.border}`,
              borderRadius: radius.sm, padding: 7, cursor: 'pointer',
              color: colors.muted, display: 'flex', flexShrink: 0,
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Layout ─────────────────────────────────────────────────────── */
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, colors, toggleMode } = useTheme()
  const { isMobile, isTablet } = useResponsive()
  const [now, setNow] = useState(() => new Date())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const lastCloseRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const closeSidebar = () => {
    lastCloseRef.current = Date.now()
    setSidebarOpen(false)
  }

  const openSidebar = () => {
    if (Date.now() - lastCloseRef.current < 250) return
    setSidebarOpen(true)
  }

  useEffect(() => { closeSidebar() }, [location.pathname])
  useEffect(() => { if (!isMobile) closeSidebar() }, [isMobile])

  // Lock document scroll only while drawer is open on mobile.
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isMobile, sidebarOpen])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  const currentPage = navItems.find(n => location.pathname.startsWith(n.to))

  const groupedNav: Record<string, NavItem[]> = navItems.reduce((acc, item) => {
    (acc[item.group] ||= []).push(item); return acc
  }, {} as Record<string, NavItem[]>)

  const sidebarProps = { colors, mode, user, now, location, groupedNav, toggleMode, handleLogout, onNavClick: closeSidebar }

  const sidebarWidth = isTablet ? SIDEBAR_W_TABLET : SIDEBAR_W_DESKTOP
  const topbarHeight = isMobile ? TOPBAR_H_MOBILE : TOPBAR_H_DESKTOP

  return (
    <div style={{ background: colors.appBg, color: colors.text, minHeight: '100dvh' }}>

      {/* ── Desktop / tablet fixed sidebar ── */}
      {!isMobile && (
        <aside style={{
          position: 'fixed', top: 0, left: 0,
          width: sidebarWidth,
          height: '100dvh',
          borderRight: `1px solid ${colors.border}`,
          zIndex: 30,
          overflow: 'hidden',
        }}>
          <SidebarInner {...sidebarProps} />
        </aside>
      )}

      {/* ── Mobile drawer ── */}
      {isMobile && (
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={closeSidebar}
                style={{
                  position: 'fixed', inset: 0, zIndex: 49,
                  background: 'rgba(0,0,0,0.55)',
                }}
              />
              <motion.aside
                key="drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                style={{
                  position: 'fixed', top: 0, left: 0,
                  width: SIDEBAR_W_MOBILE, maxWidth: '86vw',
                  height: '100dvh',
                  zIndex: 50,
                  borderRight: `1px solid ${colors.border}`,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 8, right: 8, zIndex: 2,
                }}>
                  <button onClick={closeSidebar} style={iconBtn(colors)}>
                    <X size={15} />
                  </button>
                </div>
                <SidebarInner {...sidebarProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Topbar (fixed) ── */}
      <header style={{
        position: 'fixed', top: 0,
        left: isMobile ? 0 : sidebarWidth,
        right: 0,
        height: topbarHeight,
        background: colors.appBg,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: isMobile ? '0 12px' : isTablet ? '0 18px' : '0 28px',
        zIndex: 20,
      }}>
        {isMobile && (
          <button onClick={openSidebar} style={{ ...iconBtn(colors), flexShrink: 0 }}>
            <Menu size={16} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: colors.muted, minWidth: 0 }}>
          <ShieldCheck size={14} color={colors.primary} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentPage?.label ?? 'Panel'}
          </span>
          {!isMobile && (
            <>
              <ChevronDown size={12} style={{ opacity: 0.5 }} />
              <span style={{ whiteSpace: 'nowrap' }}>Chilam Balam N°3</span>
            </>
          )}
        </div>

        {!isMobile && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 14px', width: '100%', maxWidth: isTablet ? 280 : 420,
              background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
              borderRadius: radius.md, color: colors.muted, fontSize: 13,
              cursor: 'pointer',
            }}>
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

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button title="Notificaciones" style={iconBtn(colors)}>
            <Bell size={15} />
            <span style={{
              position: 'absolute', top: 6, right: 6, width: 7, height: 7,
              borderRadius: '50%', background: colors.danger, border: `1.5px solid ${colors.appBg}`,
            }} />
          </button>
          {!isMobile && (
            <button title="Ajustes" style={iconBtn(colors)}>
              <Settings size={15} />
            </button>
          )}
        </div>
      </header>

      {/* ── Page content (normal document scroll) ── */}
      <main style={{
        marginLeft: isMobile ? 0 : sidebarWidth,
        paddingTop: topbarHeight,
        minHeight: '100dvh',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            style={{
              padding: isMobile ? '14px 14px 28px' : isTablet ? '18px 18px 32px' : '28px 28px 44px',
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
    width: 34, height: 34,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: `1px solid ${colors.border}`,
    borderRadius: 8, color: colors.muted, cursor: 'pointer',
  }
}
