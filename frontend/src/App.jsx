import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/routes/protected-route'
import { SessionGuard } from './components/session/session-guard'
import { AppShell } from './components/layout/app-shell'
import { LoginPage } from './pages/login-page'
import { SignupPage } from './pages/signup-page'
import { DashboardPage } from './pages/dashboard-page'
import { ResourcesPage } from './pages/resources-page'
import { NotesPage } from './pages/notes-page'
import { TodoPage } from './pages/todo-page'
import { FavoritesPage } from './pages/favorites-page'
import { TrashPage } from './pages/trash-page'
import { ProfilePage } from './pages/profile-page'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SessionGuard>
              <AppShell />
            </SessionGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="todo" element={<TodoPage />} />
        <Route path="todo/:listId" element={<TodoPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
