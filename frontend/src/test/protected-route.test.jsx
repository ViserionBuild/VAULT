import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { ThemeProvider } from '../contexts/theme-context'
import { AuthProvider } from '../contexts/auth-context'

function renderApp(initialEntries = ['/']) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects unauthenticated users to login page', () => {
    renderApp(['/'])
    expect(screen.getByText('Sign in to VAULT')).toBeInTheDocument()
  })

  it('keeps persisted theme in localStorage', () => {
    localStorage.setItem('vault-theme', 'light')
    renderApp(['/login'])
    expect(localStorage.getItem('vault-theme')).toBe('light')
  })
})
