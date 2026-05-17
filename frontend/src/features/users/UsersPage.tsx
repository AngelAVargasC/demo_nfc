import { useMemo, useState, CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, User, Mail, Shield, Search, UserCheck, Briefcase } from 'lucide-react'
import api from '@/shared/services/api'
import './UsersPage.css'

const roleColor: Record<string, string> = {
  admin: '#a855f7', secretaria: '#3b82f6', tesorero: '#f59e0b',
  lector: '#64748b', gran_logia: '#00a88e',
}
const degreeLabel = (d: number) => ({ 1: 'Aprendiz', 2: 'Compañero', 3: 'Maestro' }[d] ?? '—')

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="users_head">
        <div>
          <h1 className="users_title">Usuarios</h1>
          <p className="users_subtitle">Gestión de perfiles, roles y estado operativo</p>
        </div>
      </div>

      <div className="users_stats">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#00a88e' },
          { label: 'Activos', value: stats.active, icon: UserCheck, color: '#00a88e' },
          { label: 'Administradores', value: stats.admins, icon: Shield, color: '#3b82f6' },
          { label: 'Oficiales', value: stats.officers, icon: Briefcase, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="users_card users_stat">
            <div className="users_stat_head">
              <div className="users_stat_label">{label}</div>
              <Icon size={16} color={color} />
            </div>
            <div className="users_stat_value">{value}</div>
          </div>
        ))}
      </div>

      <div className="users_card users_filters">
        <div className="users_search">
          <Search size={14} className="users_search_icon" />
          <input
            className="users_search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo"
          />
        </div>
        <select className="users_select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="secretaria">Secretaria</option>
          <option value="tesorero">Tesorero</option>
          <option value="lector">Lector</option>
        </select>
        <select className="users_select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="suspended">Suspendido</option>
        </select>
      </div>

      {isLoading && (
        <div className="users_skeleton_list">
          {[1, 2, 3].map(i => <div key={i} className="users_skeleton" />)}
        </div>
      )}

      <div className="users_list">
        {filteredUsers.map((u: any) => (
          <div key={u.id} className="users_row">
            <div className="users_avatar">
              {u.photo_url
                ? <img className="users_avatar_img" src={u.photo_url} alt="" />
                : <User size={22} color="#00a88e" />}
            </div>
            <div className="users_row_main">
              <div className="users_row_name">{u.full_name}</div>
              <div className="users_row_meta">
                <span className="users_row_mail"><Mail size={11} />{u.email}</span>
                <span>· {degreeLabel(u.degree)}</span>
              </div>
            </div>
            <div className="users_tags">
              <span
                className="users_role_pill"
                style={{ '--role-color': roleColor[u.role] ?? '#64748b' } as CSSProperties}
              >
                {u.role}
              </span>
              <span className={`users_status_pill ${u.status === 'active' ? 'users_status_active' : 'users_status_inactive'}`}>
                {u.status === 'active' ? 'Activo' : u.status}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="users_card users_empty">
            No hay resultados con los filtros actuales.
          </div>
        )}
      </div>
    </motion.div>
  )
}
