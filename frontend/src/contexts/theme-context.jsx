import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'vault-theme'

function resolveSystemTheme() {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  const root = document.documentElement
  const resolved = theme === 'system' ? resolveSystemTheme() : theme
  root.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) ?? 'system')

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(theme)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return context
}
