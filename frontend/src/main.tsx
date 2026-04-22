import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AppRouter } from './app/Router'
import { ThemeProvider, useTheme } from './shared/theme/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function AppShell() {
  const { colors } = useTheme()
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: colors.toastBg, color: colors.text, border: `1px solid ${colors.border}` },
          success: { iconTheme: { primary: '#00a88e', secondary: colors.toastBg } },
          error: { iconTheme: { primary: '#ef4444', secondary: colors.toastBg } },
        }}
      />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
