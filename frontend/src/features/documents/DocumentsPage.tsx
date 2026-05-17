import { useMemo, useState } from 'react'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import './DocumentsPage.css'

const mockDocs = [
  { title: 'Plancha de Iniciación — Juan García', type: 'Plancha', status: 'approved_gran_logia', code: 'A1B2C3D4', date: '2026-03-15' },
  { title: 'Certificado de Grado — Pedro Martínez', type: 'Certificado', status: 'approved_logia', code: 'E5F6G7H8', date: '2026-04-01' },
  { title: 'Título de Maestro — Luis Hernández', type: 'Título', status: 'pending', code: 'I9J0K1L2', date: '2026-04-18' },
  { title: 'Expediente Digital — Carlos Rodríguez', type: 'Expediente', status: 'rejected', code: 'M3N4O5P6', date: '2026-04-10' },
]

const statusConfig: Record<string, { label: string; icon: any }> = {
  pending: { label: 'Pendiente', icon: Clock },
  approved_logia: { label: 'Aprobado Logia', icon: CheckCircle },
  approved_gran_logia: { label: 'Aprobado Gran Logia', icon: CheckCircle },
  rejected: { label: 'Rechazado', icon: XCircle },
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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
      <div className="documents_head">
        <h1 className="documents_title">Documentos</h1>
        <p className="documents_subtitle">Gestión de expedientes digitales</p>
      </div>

      <div className="documents_filters">
        <input
          className="documents_search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o código"
        />
        <select className="documents_select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved_logia">Aprobado Logia</option>
          <option value="approved_gran_logia">Aprobado Gran Logia</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      <div className="documents_list">
        {filteredDocs.map((doc) => {
          const s = statusConfig[doc.status]
          const StatusIcon = s.icon
          return (
            <div key={doc.code} className="documents_row">
              <div className="documents_icon">
                <FileText size={22} />
              </div>
              <div className="documents_row_main">
                <div className="documents_row_title">{doc.title}</div>
                <div className="documents_row_meta">
                  <span>{doc.type}</span>
                  <span>·</span>
                  <span className="documents_row_code">#{doc.code}</span>
                  <span>·</span>
                  <span>{doc.date}</span>
                </div>
              </div>
              <span className={`documents_pill documents_pill_${doc.status}`}>
                <StatusIcon size={12} />
                {s.label}
              </span>
            </div>
          )
        })}
        {filteredDocs.length === 0 && (
          <div className="documents_empty">
            No hay documentos que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </motion.div>
  )
}
