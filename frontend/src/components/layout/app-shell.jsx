import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Menu, Moon, Sun, Monitor, Home, FolderOpen, Star,
  Trash2, Tag, ChevronDown,
  PanelLeftClose, PanelLeft, LogOut, NotebookPen, ClipboardList
} from 'lucide-react'
import { useIsMobile } from '../../hooks/use-media-query'
import { useTheme } from '../../contexts/theme-context'
import { useAuth } from '../../contexts/auth-context'
import { useWorkspace } from '../../contexts/workspace-context'
import { useProfile } from '../../contexts/profile-context'
import { Avatar } from '../ui/avatar'
import vaultIcon from '../../assets/vault_icon_bw.svg'

const navItems = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Resources', path: '/resources', icon: FolderOpen },
  { label: 'Notes', path: '/notes', icon: NotebookPen },
  { label: 'TODO', path: '/todo', icon: ClipboardList },
  { label: 'Favorites', path: '/favorites', icon: Star },
  { label: 'Tags', path: '/tags', icon: Tag },
  { label: 'Trash', path: '/trash', icon: Trash2 },
]

// Phone bottom tab bar: the main sections, plus "More" which opens the drawer
// with everything else (favorites, trash, workspace, profile, theme, logout).
const tabItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Resources', path: '/resources', icon: FolderOpen },
  { label: 'Notes', path: '/notes', icon: NotebookPen },
  { label: 'TODO', path: '/todo', icon: ClipboardList },
]

export function AppShell() {
  // Closed by default on mobile, where the sidebar is an overlay; open on
  // desktop, where it occupies its own column.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768,
  )
  const { theme, setTheme } = useTheme()
  const { logout, user } = useAuth()
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace()
  const { profile } = useProfile()
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const isMobile = useIsMobile()
  // On phones the drawer always shows full labels; the icon-only rail is a
  // desktop affordance.
  const expanded = sidebarOpen || isMobile

  const cycleTheme = () => {
    const order = ['dark', 'light', 'system']
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-background/95 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur transition-all duration-300 md:z-30 md:pb-0 md:pt-0 ${
          // Closed on phones means fully off-screen. Collapsing to w-0 left the
          // nav icons overflowing visibly along the left edge.
          sidebarOpen ? 'w-64' : 'w-64 -translate-x-full md:w-16 md:translate-x-0'
        }`}
        aria-hidden={isMobile && !sidebarOpen}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          {expanded && (
            <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-wider">
              <img src={vaultIcon} alt="Vault" className="h-8 w-8 rounded-full dark:ring-1 dark:ring-white/25" />
              <span>VAULT</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${!expanded ? 'mx-auto' : ''}`}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Workspace Selector */}
        {expanded && activeWorkspace && (
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
                } ${!expanded ? 'justify-center px-0' : ''}`
              }
              title={label}
              onClick={() => {
                // On mobile the sidebar overlays the content, so dismiss it
                // once a destination is chosen.
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {expanded && <span>{label}</span>}
            </NavLink>
          ))}

        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-2 space-y-1">
          {/* Profile sits directly above Logout, grouping account actions */}
          <NavLink
            to="/profile"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false)
            }}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${!expanded ? 'justify-center px-0' : ''}`
            }
            title={user?.name ?? 'Profile'}
          >
            <Avatar user={user} profile={profile} className="h-5 w-5 shrink-0 text-[10px]" />
            {expanded && <span className="truncate">{user?.name ?? 'Profile'}</span>}
          </NavLink>

          <button
            onClick={cycleTheme}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${!expanded ? 'justify-center px-0' : ''}`}
            title={`Theme: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 shrink-0" />
            ) : theme === 'light' ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Monitor className="h-4 w-4 shrink-0" />
            )}
            {expanded && <span className="capitalize">{theme} mode</span>}
          </button>
          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-red-400 transition-colors ${!expanded ? 'justify-center px-0' : ''}`}
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}
      >
        {/* Phone app bar: brand on the left, account on the right. Navigation
            lives in the bottom tab bar instead. */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-wider">
            <img src={vaultIcon} alt="" className="h-7 w-7 rounded-full dark:ring-1 dark:ring-white/25" />
            <span>VAULT</span>
          </Link>
          {activeWorkspace && (
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              · {activeWorkspace.name}
            </span>
          )}
          <Link to="/profile" aria-label="Profile" className="ml-auto rounded-full p-1">
            <Avatar user={user} profile={profile} className="h-8 w-8 text-xs" />
          </Link>
        </header>

        {/* Page Content. Extra bottom padding on phones keeps the last item
            clear of the tab bar. */}
        <main className="min-w-0 flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="grid h-16 grid-cols-5">
          {tabItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="More"
            aria-expanded={sidebarOpen}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              sidebarOpen ? 'text-primary' : 'text-muted-foreground active:text-foreground'
            }`}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
