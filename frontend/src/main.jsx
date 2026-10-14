import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from './contexts/theme-context'
import { AuthProvider } from './contexts/auth-context'
import { WorkspaceProvider } from './contexts/workspace-context'
import { ProfileProvider } from './contexts/profile-context'
import { ToastProvider } from './components/ui/toast'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ProfileProvider>
            <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            </ToastProvider>
            </ProfileProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
