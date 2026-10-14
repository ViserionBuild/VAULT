import { useRef, useState } from 'react'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { AvatarCropDialog } from './avatar-crop-dialog'

const MAX_SOURCE_BYTES = 8 * 1024 * 1024 // reject huge originals before decoding

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      // Decode once up front so a broken file fails here, not in the cropper.
      const image = new Image()
      image.onerror = () => reject(new Error('That file is not a readable image.'))
      image.onload = () => resolve(reader.result)
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function AvatarUpload({ user, profile, value, onChange, disabled }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // The picked photo, while the user positions it. The crop is downscaled to
  // a small JPEG in the browser, so no storage bucket is needed.
  const [cropSrc, setCropSrc] = useState(null)

  const pick = async (event) => {
    const file = event.target.files?.[0]
    // Reset so re-picking the same file still fires a change event.
    event.target.value = ''
    if (!file) return

    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('That image is over 8MB. Try a smaller one.')
      return
    }

    setBusy(true)
    try {
      setCropSrc(await readAsDataUrl(file))
    } catch (err) {
      setError(err.message ?? 'Could not process that image.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="group relative">
        <Avatar
          user={user}
          profile={{ ...profile, avatarUrl: value }}
          className="h-28 w-28 text-3xl ring-2 ring-border"
        />

        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Change profile picture"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <Camera className="h-6 w-6" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {value ? 'Change' : 'Add'}
                </span>
              </span>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={pick}
          className="hidden"
        />
      </div>

      {!disabled && value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" /> Remove photo
        </button>
      ) : null}

      {cropSrc && (
        <AvatarCropDialog
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onChooseAnother={() => inputRef.current?.click()}
          onSave={(dataUrl) => {
            setCropSrc(null)
            onChange(dataUrl)
          }}
        />
      )}

      {error ? <p className="max-w-[14rem] text-center text-xs text-red-500">{error}</p> : null}
    </div>
  )
}
