import { useState } from 'react'
import {
  Check, Loader2, Mail, Calendar, AlertCircle, Pencil, X,
  Phone, MapPin, User, FileText,
} from 'lucide-react'
import { useAuth } from '../contexts/auth-context'
import { useProfile } from '../contexts/profile-context'
import { AvatarUpload } from '../components/profile/avatar-upload'
import { Button } from '../components/ui/button'

const SECTIONS = [
  {
    title: 'Personal',
    icon: User,
    fields: [
      { key: 'displayName', label: 'Display name', placeholder: 'How your name appears' },
      { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
      { key: 'bio', label: 'Bio', placeholder: 'A short description', multiline: true, full: true },
    ],
  },
  {
    title: 'Address',
    icon: MapPin,
    fields: [
      { key: 'addressLine1', label: 'Address line 1', placeholder: 'Street address', full: true },
      { key: 'addressLine2', label: 'Address line 2', placeholder: 'Apartment, suite', full: true },
      { key: 'city', label: 'City', placeholder: 'City' },
      { key: 'state', label: 'State / Region', placeholder: 'State' },
      { key: 'postalCode', label: 'Postal code', placeholder: 'ZIP / PIN' },
      { key: 'country', label: 'Country', placeholder: 'Country' },
    ],
  },
]

export function ProfilePage() {
  const { user } = useAuth()
  const { profile, loading, saveProfile } = useProfile()

  const [editing, setEditing] = useState(false)
  // Edits are a diff over server state, so nothing needs seeding on load and a
  // refetch mid-edit cannot clobber what the user is typing.
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const valueOf = (key) => edits[key] ?? profile?.[key] ?? ''
  const name = edits.name ?? user?.name ?? ''
  const avatarUrl = edits.avatarUrl ?? profile?.avatarUrl ?? ''

  const update = (key, value) => {
    setEdits((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const startEdit = () => {
    setEditing(true)
    setSaved(false)
    setError('')
  }

  const cancelEdit = () => {
    setEdits({})
    setEditing(false)
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = { name, avatarUrl }
      for (const section of SECTIONS) {
        for (const field of section.fields) payload[field.key] = valueOf(field.key)
      }
      await saveProfile(payload)
      setEdits({})
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError(err?.message ?? 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      {/* ── Identity banner ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="h-24 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent" />

        <div className="flex flex-col items-center gap-4 px-6 pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="-mt-14 shrink-0">
            <AvatarUpload
              user={user}
              profile={profile}
              value={avatarUrl}
              onChange={(next) => update('avatarUrl', next)}
              disabled={!editing}
            />
          </div>

          <div className="min-w-0 flex-1 sm:pb-2">
            {editing ? (
              <input
                value={name}
                onChange={(e) => update('name', e.target.value)}
                minLength={2}
                maxLength={100}
                required
                aria-label="Full name"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <h1 className="truncate text-xl font-bold">
                {valueOf('displayName') || user?.name || 'Unnamed'}
              </h1>
            )}

            <div className="mt-1.5 flex flex-col items-center gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </span>
              {joined && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Joined {joined}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:pb-2">
            {editing ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                  <X className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    <><Check className="mr-1.5 h-4 w-4" />Save</>
                  )}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={startEdit}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          <Check className="h-4 w-4 shrink-0" /> Profile updated.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Detail sections ─────────────────────────────────────── */}
      {SECTIONS.map((section) => {
        const Icon = section.icon
        const filled = section.fields.filter((f) => valueOf(f.key))

        return (
          <section key={section.title} className="rounded-2xl border border-border p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" />
              {section.title}
            </h2>

            {!editing && filled.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing added yet — choose <span className="font-medium">Edit profile</span> to fill this in.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const value = valueOf(field.key)
                  if (!editing && !value) return null

                  return (
                    <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        {field.label}
                      </div>

                      {editing ? (
                        field.multiline ? (
                          <textarea
                            value={value}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className={`${inputClass} resize-y py-2`}
                          />
                        ) : (
                          <input
                            type={field.type ?? 'text'}
                            value={value}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        )
                      ) : (
                        <div className="text-sm">{value}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {/* ── Account (read-only) ─────────────────────────────────── */}
      <section className="rounded-2xl border border-border p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          Account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Email</div>
            <div className="flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {user?.email}
            </div>
          </div>
          {valueOf('phone') && !editing ? (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Phone</div>
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {valueOf('phone')}
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your email is the identity for this account and cannot be changed here.
        </p>
      </section>
    </form>
  )
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
