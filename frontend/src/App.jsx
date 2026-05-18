import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/routes/protected-route'
import { AppShell } from './components/layout/app-shell'
import { LoginPage } from './pages/login-page'
import { SignupPage } from './pages/signup-page'
import { DashboardPage } from './pages/dashboard-page'
import { ResourcesPage } from './pages/resources-page'
import { FavoritesPage } from './pages/favorites-page'
import { TrashPage } from './pages/trash-page'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="trash" element={<TrashPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
