import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '../../contexts/theme-context'
import { useAuth } from '../../contexts/auth-context'
import { Button } from '../ui/button'

const navItems = ['Dashboard', 'Resources', 'Favorites', 'Recent', 'Settings']

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { theme, setTheme } = useTheme()
  const { logout, user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen((open) => !open)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Link to="/" className="font-semibold tracking-wide">
              VAULT
            </Link>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{user?.name}</span>
            <Button variant={theme === 'light' ? 'default' : 'ghost'} size="sm" onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4" />
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'ghost'} size="sm" onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4" />
            </Button>
            <Button variant={theme === 'system' ? 'default' : 'ghost'} size="sm" onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden border-r transition-all`}>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => (
              <div key={item} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
