import { Link, useLocation } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import { useWorkspaceStore } from '../../store/workspaceStore'

function Sidebar() {
  const location = useLocation()
  const { folders, favorites } = useWorkspaceStore()

  return (
    <aside className="hidden w-72 border-r border-slate-800/70 bg-black/30 p-4 backdrop-blur md:block">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <span className="text-xl">{APP_CONFIG.logo}</span>
        <span>{APP_CONFIG.appName}</span>
      </div>

      <nav className="space-y-2 text-sm">
        <Link
          to="/"
          className={`block rounded-lg px-3 py-2 transition ${location.pathname === '/' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
        >
          Workspace
        </Link>
        <Link
          to="/settings"
          className={`block rounded-lg px-3 py-2 transition ${location.pathname === '/settings' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
        >
          Settings
        </Link>
      </nav>

      <section className="mt-6">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-400">Folders</h3>
        <ul className="space-y-1 text-sm text-slate-300">
          {folders.filter((f) => !f.deletedAt).map((folder) => (
            <li key={folder.id} className="rounded-md px-2 py-1 hover:bg-slate-900/80">
              {folder.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-400">Favorites</h3>
        <ul className="space-y-1 text-sm text-slate-300">
          {favorites.length === 0 ? <li className="px-2 text-slate-500">No favorites yet</li> : favorites.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </aside>
  )
}

export default Sidebar
