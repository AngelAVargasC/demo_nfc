import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import api from '@/shared/services/api'
import { useTheme } from '@/shared/theme/theme'
import { StatusDot } from '@/shared/components/ui'
import { useResponsive } from '@/shared/hooks/useResponsive'
import {
  Users, DollarSign, FileText, BarChart2,
  LogOut, Home, Moon, Sun, Radio, Search, Command,
  Bell, ChevronDown, Settings, ShieldCheck, Menu, X,
} from 'lucide-react'
import './Layout.css'

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

/* ─── Sidebar inner (compartido por aside de escritorio y drawer movil) ── */
function SidebarInner({
  mode, user, now, location, groupedNav, toggleMode, handleLogout, onNavClick,
}: any) {
  return (
    <div className="sidebar">
      <div className="sidebar_brand">
        <div className="sidebar_brand_logo">SG</div>
        <div className="sidebar_brand_text">
          <div className="sidebar_brand_name">SIGAM</div>
          <div className="sidebar_brand_tag">Plataforma Masónica</div>
        </div>
      </div>

      <nav className="sidebar_nav">
        {Object.entries(groupedNav).map(([group, items]: any) => (
          <div key={group} className="sidebar_group">
            <div className="sidebar_group_label">{GROUP_LABEL[group]}</div>
            {items.map(({ to, icon: Icon, label }: NavItem) => {
              const active = location.pathname.startsWith(to)
              return (
                <Link key={to} to={to} className="sidebar_link" onClick={onNavClick}>
                  <div className={`sidebar_item${active ? ' sidebar_item_active' : ''}`}>
                    {active && <span className="sidebar_item_bar" />}
                    <Icon size={16} strokeWidth={active ? 2.25 : 1.9} />
                    {label}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar_foot">
        <div className="sidebar_status">
          <StatusDot tone="success" pulse />
          <div className="sidebar_status_label">Sistema operativo</div>
          <span className="sidebar_status_time">
            {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <button onClick={toggleMode} className="sidebar_theme_btn">
          {mode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          {mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>

        <div className="sidebar_user">
          <div className="sidebar_user_avatar">
            {(user?.full_name?.trim()?.[0] ?? 'U').toUpperCase()}
          </div>
          <div className="sidebar_user_info">
            <div className="sidebar_user_name">{user?.full_name}</div>
            <div className="sidebar_user_role">{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" className="sidebar_logout">
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
  const { mode, toggleMode } = useTheme()
  const { isMobile } = useResponsive()
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

  const sidebarProps = { mode, user, now, location, groupedNav, toggleMode, handleLogout, onNavClick: closeSidebar }

  return (
    <div className="layout">

      {/* ── Sidebar fija (escritorio / tablet) ── */}
      {!isMobile && (
        <aside className="layout_aside">
          <SidebarInner {...sidebarProps} />
        </aside>
      )}

      {/* ── Drawer movil ── */}
      {isMobile && (
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="backdrop"
                className="layout_backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={closeSidebar}
              />
              <motion.aside
                key="drawer"
                className="layout_drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <div className="layout_drawer_close">
                  <button onClick={closeSidebar} className="layout_icon_btn">
                    <X size={15} />
                  </button>
                </div>
                <SidebarInner {...sidebarProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Topbar ── */}
      <header className="layout_topbar">
        {isMobile && (
          <button onClick={openSidebar} className="layout_icon_btn">
            <Menu size={16} />
          </button>
        )}

        <div className="layout_crumb">
          <ShieldCheck size={14} className="layout_crumb_icon" />
          <span className="layout_crumb_name">{currentPage?.label ?? 'Panel'}</span>
          {!isMobile && (
            <>
              <ChevronDown size={12} className="layout_crumb_chevron" />
              <span className="layout_crumb_logia">Chilam Balam N°3</span>
            </>
          )}
        </div>

        {!isMobile && (
          <div className="layout_search_wrap">
            <button className="layout_search">
              <Search size={14} />
              <span className="layout_search_text">Buscar miembros, pagos, documentos…</span>
              <span className="layout_search_kbd">
                <Command size={10} /> K
              </span>
            </button>
          </div>
        )}

        <div className="layout_actions">
          <button title="Notificaciones" className="layout_icon_btn">
            <Bell size={15} />
            <span className="layout_bell_dot" />
          </button>
          {!isMobile && (
            <button title="Ajustes" className="layout_icon_btn">
              <Settings size={15} />
            </button>
          )}
        </div>
      </header>

      {/* ── Contenido de la pagina ── */}
      <main className="layout_main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="layout_page"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
