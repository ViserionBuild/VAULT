import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { Button } from '../components/ui/button'

export function SignupPage() {
  const { signup, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    try {
      setError('')
      await signup(formData.get('name'), formData.get('email'), formData.get('password'))
      navigate('/')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form className="w-full max-w-md space-y-4 rounded-xl border p-5" onSubmit={handleSubmit}>
        <h1 className="text-xl font-semibold">Create your VAULT account</h1>
        <input className="w-full rounded-md border bg-background p-2" name="name" placeholder="Name" required minLength={2} />
        <input className="w-full rounded-md border bg-background p-2" name="email" type="email" placeholder="Email" required />
        <input
          className="w-full rounded-md border bg-background p-2"
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link className="underline" to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  )
}
