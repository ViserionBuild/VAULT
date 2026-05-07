import { APP_CONFIG } from '../config'

function SettingsPage() {
  return (
    <section className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-400">Configured app name</p>
        <p className="mt-1 text-lg font-medium">{APP_CONFIG.appName}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-400">Accent color</p>
        <div className="mt-2 h-8 w-24 rounded" style={{ backgroundColor: APP_CONFIG.accentColor }} />
      </div>
    </section>
  )
}

export default SettingsPage
