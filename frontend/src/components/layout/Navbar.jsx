import { APP_CONFIG } from '../../config'
import { useWorkspaceStore } from '../../store/workspaceStore'

function Navbar() {
  const { query, setQuery, createFolder, createBlock } = useWorkspaceStore()

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-950/85 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-sm font-semibold text-slate-200 md:text-base">{APP_CONFIG.appName} Command Center</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search folders, notes, URLs..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-violet-500/40 placeholder:text-slate-500 focus:ring md:w-72"
        />
        <button
          onClick={() => createFolder('New Folder')}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm transition hover:bg-slate-700"
        >
          + Folder
        </button>
        <button
          onClick={() => createBlock({ title: 'Untitled', type: 'note' })}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium transition hover:bg-violet-500"
        >
          + Block
        </button>
      </div>
    </header>
  )
}

export default Navbar
