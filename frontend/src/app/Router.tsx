import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const AccessReader = lazy(() => import('@/features/faceid/AccessReader'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const NFCPage = lazy(() => import('@/features/nfc/NFCPage'))
const FaceIDPage = lazy(() => import('@/features/faceid/FaceIDPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const FinancePage = lazy(() => import('@/features/finance/FinancePage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))

const Loading = () => (
  <div className="app_loading">Cargando...</div>
)

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Lector de acceso (kiosco): pantalla completa, sin login —
            se protege con su propio token de kiosco. */}
        <Route path="/lector" element={<AccessReader />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
        } />
        <Route path="/nfc" element={
          <ProtectedRoute><Layout><NFCPage /></Layout></ProtectedRoute>
        } />
        <Route path="/faceid" element={
          <ProtectedRoute><Layout><FaceIDPage /></Layout></ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>
        } />
        <Route path="/finance" element={
          <ProtectedRoute><Layout><FinancePage /></Layout></ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute><Layout><DocumentsPage /></Layout></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
