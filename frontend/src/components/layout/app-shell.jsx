import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Menu, Moon, Sun, Monitor, Home, FolderOpen, Star,
  Clock, Trash2, Settings, Tag, Plus, ChevronDown,
  PanelLeftClose, PanelLeft, LogOut
} from 'lucide-react'
import { useTheme } from '../../contexts/theme-context'
import { useAuth } from '../../contexts/auth-context'
import { useWorkspace } from '../../contexts/workspace-context'
import { Button } from '../ui/button'

const navItems = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Resources', path: '/resources', icon: FolderOpen },
  { label: 'Favorites', path: '/favorites', icon: Star },
  { label: 'Tags', path: '/tags', icon: Tag },
  { label: 'Trash', path: '/trash', icon: Trash2 },
]

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { theme, setTheme } = useTheme()
  const { logout, user } = useAuth()
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace()
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const navigate = useNavigate()

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  const cycleTheme = () => {
    const order = ['dark', 'light', 'system']
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-background/95 backdrop-blur transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-wider">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                V
              </div>
              <span>VAULT</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${!sidebarOpen ? 'mx-auto' : ''}`}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Workspace Selector */}
        {sidebarOpen && activeWorkspace && (
          <div className="border-b border-border px-3 py-2.5">
            <div className="relative">
              <button
                onClick={() => setShowWsDropdown((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="text-base">{activeWorkspace.icon}</span>
                <span className="flex-1 truncate text-left font-medium">{activeWorkspace.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {showWsDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-background p-1 shadow-xl">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws)
                        setShowWsDropdown(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        ws.id === activeWorkspace.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <span>{ws.icon}</span>
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${!sidebarOpen ? 'justify-center px-0' : ''}`
              }
              title={label}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={cycleTheme}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            title={`Theme: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 shrink-0" />
            ) : theme === 'light' ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Monitor className="h-4 w-4 shrink-0" />
            )}
            {sidebarOpen && <span className="capitalize">{theme} mode</span>}
          </button>
          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-red-400 transition-colors ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => navigate('/resources')}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
