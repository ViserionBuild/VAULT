import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagePlus, Minus, Plus, RotateCcw } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'

const OUTPUT_SIZE = 256 // square, adequate for every size we display
const MAX_ZOOM = 4
const PREVIEW_SIZES = [72, 40, 28]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Position the photo under a circular frame before saving, as profile
 * pictures work elsewhere: drag to move, pinch / scroll / slider to zoom.
 * The square shows the photo; the circle is what becomes the picture.
 *
 * The crop is kept as a centre point in image pixels plus a zoom, so it
 * survives the frame resizing (e.g. rotating a phone).
 */
export function AvatarCropDialog({ src, onCancel, onSave, onChooseAnother }) {
  const frameRef = useRef(null)
  const [image, setImage] = useState(null) // the decoded <img>
  const [frame, setFrame] = useState(0) // frame side in CSS px
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState(null) // { x, y } in image px
  const [saving, setSaving] = useState(false)
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImage(img)
      setZoom(1)
      setCenter({ x: img.naturalWidth / 2, y: img.naturalHeight / 2 })
    }
    img.src = src
  }, [src])

  useLayoutEffect(() => {
    const node = frameRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setFrame(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const ready = image && center && frame > 0
  // Scale at zoom 1 makes the photo just cover the square.
  const baseScale = ready ? frame / Math.min(image.naturalWidth, image.naturalHeight) : 1
  const scale = baseScale * zoom

  // Keep the square covered: the centre can't come closer to an edge than
  // half the visible width (in image px).
  const clampCenter = (c, z = zoom) => {
    if (!image) return c
    const half = frame / (2 * baseScale * z)
    return {
      x: clamp(c.x, half, image.naturalWidth - half),
      y: clamp(c.y, half, image.naturalHeight - half),
    }
  }

  const changeZoom = (next) => {
    const z = clamp(next, 1, MAX_ZOOM)
    setZoom(z)
    setCenter((c) => clampCenter(c, z))
  }

  const pan = (dx, dy) => setCenter((c) => clampCenter({ x: c.x - dx / scale, y: c.y - dy / scale }))

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    gesture.current = null
  }
  const onPointerMove = (event) => {
    const last = pointers.current.get(event.pointerId)
    if (!last) return
    const now = { x: event.clientX, y: event.clientY }
    if (pointers.current.size === 1) {
      pan(now.x - last.x, now.y - last.y)
    } else if (pointers.current.size === 2) {
      // Pinch: zoom by the change in distance between the two fingers.
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)[1]
      const distance = Math.hypot(now.x - other.x, now.y - other.y)
      if (gesture.current) changeZoom(gesture.current.zoom * (distance / gesture.current.distance))
      else gesture.current = { distance, zoom }
    }
    pointers.current.set(event.pointerId, now)
  }
  const onPointerUp = (event) => {
    pointers.current.delete(event.pointerId)
    gesture.current = null
  }

  // Scroll to zoom. A non-passive listener so the page doesn't scroll too;
  // it reads the latest zoom through refs instead of re-subscribing.
  const zoomRef = useRef(zoom)
  const changeZoomRef = useRef(changeZoom)
  useEffect(() => {
    zoomRef.current = zoom
    changeZoomRef.current = changeZoom
  })
  useEffect(() => {
    const node = frameRef.current
    if (!node) return
    const onWheel = (event) => {
      event.preventDefault()
      changeZoomRef.current(zoomRef.current * Math.exp(-event.deltaY * 0.0015))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 40 : 10
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    if (moves[event.key]) {
      event.preventDefault()
      pan(...moves[event.key])
    } else if (event.key === '+' || event.key === '=') {
      changeZoom(zoom * 1.1)
    } else if (event.key === '-') {
      changeZoom(zoom / 1.1)
    }
  }

  const reset = () => {
    setZoom(1)
    setCenter({ x: image.naturalWidth / 2, y: image.naturalHeight / 2 })
  }

  // Style that places the photo inside a box of `size` px showing the crop.
  const placement = (size) => {
    const k = scale * (size / frame)
    return {
      width: image.naturalWidth * k,
      height: image.naturalHeight * k,
      transform: `translate(${size / 2 - center.x * k}px, ${size / 2 - center.y * k}px)`,
    }
  }

  const save = () => {
    setSaving(true)
    const side = frame / scale
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, center.x - side / 2, center.y - side / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    // JPEG keeps the payload small; transparency is not meaningful once the
    // image is masked into a circle.
    onSave(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <Dialog open onClose={onCancel} title="Position your photo" className="max-w-md">
      <div className="space-y-5">
        <div
          ref={frameRef}
          tabIndex={0}
          role="application"
          aria-label="Photo position. Drag or use arrow keys to move, plus and minus to zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="relative mx-auto aspect-square w-full max-w-[20rem] cursor-grab touch-none select-none overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        >
          {ready && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
              style={placement(frame)}
            />
          )}
          {/* Everything outside the circle is dimmed; the circle is the picture. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/90"
          />
          {/* Rule-of-thirds guides inside the circle, like camera apps */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-30">
            <div className="absolute inset-y-0 left-1/3 w-px bg-white" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white" />
          </div>
        </div>

        {/* Zoom */}
        <div className="mx-auto flex max-w-[20rem] items-center gap-3">
          <button
            type="button"
            onClick={() => changeZoom(zoom / 1.2)}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 flex-1 cursor-pointer accent-primary"
          />
          <button
            type="button"
            onClick={() => changeZoom(zoom * 1.2)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* How it will look around the app */}
        <div className="flex items-center justify-center gap-4 rounded-lg bg-muted/40 py-3">
          <span className="text-xs text-muted-foreground">Preview</span>
          {PREVIEW_SIZES.map((size) => (
            <div
              key={size}
              className="relative shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border"
              style={{ width: size, height: size }}
            >
              {ready && (
                <img
                  src={src}
                  alt=""
                  className="absolute left-0 top-0 max-w-none origin-top-left"
                  style={placement(size)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={onChooseAnother}>
              <ImagePlus className="mr-1.5 h-4 w-4" /> Another photo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={!ready} aria-label="Reset position">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={!ready || saving}>
              Use photo
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
