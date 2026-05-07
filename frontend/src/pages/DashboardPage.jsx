import BlockBoard from '../components/blocks/BlockBoard'
import { APP_CONFIG } from '../config'

function DashboardPage() {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Welcome to {APP_CONFIG.appName}</h2>
        <p className="text-sm text-slate-400">Manage folders, links, notes, checklists, and embeds from one place.</p>
      </header>
      <BlockBoard />
    </section>
  )
}

export default DashboardPage
