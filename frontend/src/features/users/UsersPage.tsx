import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, User, Mail, Shield, Search, UserCheck, Briefcase } from 'lucide-react'
import api from '@/shared/services/api'
import { useTheme } from '@/shared/theme/theme'

const roleColor: Record<string, string> = {
  admin: '#a855f7', secretaria: '#3b82f6', tesorero: '#f59e0b',
  lector: '#64748b', gran_logia: '#00a88e',
}
const degreeLabel = (d: number) => ({ 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }[d] ?? '—')

export default function UsersPage() {
  const { colors, mode } = useTheme()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const statusStyles = {
    active: {
      background: mode === 'light' ? '#e6f6f3' : '#0d3b34',
      text: '#00a88e',
      border: mode === 'light' ? '#7ed9ca' : '#00a88e',
    },
    inactive: {
      background: mode === 'light' ? '#fef2f2' : '#450a0a',
      text: '#dc2626',
      border: mode === 'light' ? '#fca5a5' : '#ef4444',
    },
  }
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return data.data || []
    },
  })

  const users = data ?? []
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const matchesSearch =
        `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u: any) => u.status === 'active').length
    const admins = users.filter((u: any) => u.role === 'admin').length
    const officers = users.filter((u: any) => ['secretaria', 'tesorero'].includes(u.role)).length
    return { total, active, admins, officers }
  }, [users])

  const cardStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
  } as const

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 4 }}>Usuarios</h1>
          <p style={{ color: colors.muted, fontSize: 13 }}>Gestión de perfiles, roles y estado operativo</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#00a88e' },
          { label: 'Activos', value: stats.active, icon: UserCheck, color: '#00a88e' },
          { label: 'Administradores', value: stats.admins, icon: Shield, color: '#3b82f6' },
          { label: 'Oficiales', value: stats.officers, icon: Briefcase, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ ...cardStyle, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: colors.muted }}>{label}</div>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color={colors.muted} style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo"
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px 0 30px',
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              outline: 'none',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ height: 36, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: '0 10px' }}
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="secretaria">Secretaria</option>
          <option value="tesorero">Tesorero</option>
          <option value="lector">Lector</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 36, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: '0 10px' }}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="suspended">Suspendido</option>
        </select>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {filteredUsers.map((u: any) => (
          <div key={u.id} style={{
            background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#e6f6f3',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {u.photo_url
                ? <img src={u.photo_url} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                : <User size={22} color="#00a88e" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{u.full_name}</div>
              <div style={{ fontSize: 12, color: colors.muted, display: 'flex', gap: 12, marginTop: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{u.email}</span>
                <span>· {degreeLabel(u.degree)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: `${roleColor[u.role] ?? '#64748b'}15`,
                color: roleColor[u.role] ?? '#64748b',
                border: `1px solid ${roleColor[u.role] ?? '#64748b'}40`,
                textTransform: 'capitalize',
              }}>
                {u.role}
              </span>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: u.status === 'active' ? statusStyles.active.background : statusStyles.inactive.background,
                color: u.status === 'active' ? statusStyles.active.text : statusStyles.inactive.text,
                border: `1px solid ${u.status === 'active' ? statusStyles.active.border : statusStyles.inactive.border}`,
              }}>
                {u.status === 'active' ? 'Activo' : u.status}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && filteredUsers.length === 0 && (
          <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: colors.muted, fontSize: 14 }}>
            No hay resultados con los filtros actuales.
          </div>
        )}
      </div>
    </motion.div>
  )
}
