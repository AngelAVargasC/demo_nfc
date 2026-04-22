import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { useTheme } from '@/shared/theme/theme'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const NFCPage = lazy(() => import('@/features/nfc/NFCPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const FinancePage = lazy(() => import('@/features/finance/FinancePage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))

const Loading = () => {
  const { colors } = useTheme()
  return (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: colors.text, background: colors.appBg }}>
    Cargando...
  </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
        } />
        <Route path="/nfc" element={
          <ProtectedRoute><Layout><NFCPage /></Layout></ProtectedRoute>
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
