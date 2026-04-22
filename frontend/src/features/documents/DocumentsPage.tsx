import { useMemo, useState } from 'react'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/shared/theme/theme'
import { useResponsive } from '@/shared/hooks/useResponsive'

const mockDocs = [
  { title: 'Plancha de Iniciación — Juan García', type: 'Plancha', status: 'approved_gran_logia', code: 'A1B2C3D4', date: '2026-03-15' },
  { title: 'Certificado de Grado — Pedro Martínez', type: 'Certificado', status: 'approved_logia', code: 'E5F6G7H8', date: '2026-04-01' },
  { title: 'Título de Maestro — Luis Hernández', type: 'Título', status: 'pending', code: 'I9J0K1L2', date: '2026-04-18' },
  { title: 'Expediente Digital — Carlos Rodríguez', type: 'Expediente', status: 'rejected', code: 'M3N4O5P6', date: '2026-04-10' },
]

const buildStatusConfig = (isLight: boolean): Record<string, { label: string; color: string; bg: string; border: string; icon: any }> => ({
  pending: { label: 'Pendiente', color: '#d97706', bg: isLight ? '#fffbeb' : '#451a03', border: isLight ? '#fcd34d' : '#f59e0b', icon: Clock },
  approved_logia: { label: 'Aprobado Logia', color: '#2563eb', bg: isLight ? '#eff6ff' : '#1e1b4b', border: isLight ? '#93c5fd' : '#3b82f6', icon: CheckCircle },
  approved_gran_logia: { label: 'Aprobado Gran Logia', color: '#00a88e', bg: isLight ? '#e6f6f3' : '#0d3b34', border: isLight ? '#7ed9ca' : '#00a88e', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: isLight ? '#fef2f2' : '#450a0a', border: isLight ? '#fca5a5' : '#ef4444', icon: XCircle },
})

export default function DocumentsPage() {
  const { colors, mode } = useTheme()
  const { isMobile, isTablet } = useResponsive()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const statusConfig = buildStatusConfig(mode === 'light')
  const filteredDocs = useMemo(
    () =>
      mockDocs.filter((doc) => {
        const matchesSearch = `${doc.title} ${doc.code}`.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [search, statusFilter],
  )
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: colors.text }}>Documentos</h1>
        <p style={{ color: colors.muted, fontSize: 13 }}>Gestión de expedientes digitales</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1.6fr 1fr', gap: 10, marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o código"
          style={{ height: 36, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: '0 12px', outline: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 36, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: '0 10px' }}
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved_logia">Aprobado Logia</option>
          <option value="approved_gran_logia">Aprobado Gran Logia</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filteredDocs.map((doc) => {
          const s = statusConfig[doc.status]
          const StatusIcon = s.icon
          return (
            <div key={doc.code} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: isMobile ? '14px' : '16px 20px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ background: '#e6f6f3', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                <FileText size={22} color="#00a88e" />
              </div>
              <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{doc.title}</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>{doc.type}</span>
                  <span>·</span>
                  <span style={{ fontFamily: 'monospace' }}>#{doc.code}</span>
                  <span>·</span>
                  <span>{doc.date}</span>
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 4, alignSelf: isMobile ? 'flex-start' : 'center' }}>
                <StatusIcon size={12} />
                {s.label}
              </span>
            </div>
          )
        })}
        {filteredDocs.length === 0 && (
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, color: colors.muted, textAlign: 'center' }}>
            No hay documentos que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </motion.div>
  )
}
