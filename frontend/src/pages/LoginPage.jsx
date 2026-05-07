import { APP_CONFIG } from '../config'

function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <span className="text-3xl">{APP_CONFIG.logo}</span>
          <h1 className="mt-2 text-2xl font-semibold">Sign in to {APP_CONFIG.appName}</h1>
          <p className="mt-1 text-sm text-slate-400">Your personal command center</p>
        </div>
        <form className="space-y-3">
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Email" type="email" />
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Password" type="password" />
          <button type="button" className="w-full rounded-lg bg-violet-600 px-3 py-2 font-medium hover:bg-violet-500">
            Continue
          </button>
        </form>
      </div>
    </main>
  )
}

export default LoginPage
