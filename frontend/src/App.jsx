import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { APP_CONFIG } from './config'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import AppLayout from './layouts/AppLayout'

function App() {
  useEffect(() => {
    document.title = APP_CONFIG.appName
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
