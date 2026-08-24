import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ImageIcon from 'lucide-react/dist/esm/icons/image.js'
import Minus from 'lucide-react/dist/esm/icons/minus.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.js'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import './ImageAdjustInput.css'

export type ImageAdjustMode = 'profile' | 'logo' | 'cover' | 'featured'

const imageModeConfig = {
  profile: { aspect: 1, width: 800, height: 800, cropShape: 'round' as const, guidance: 'Center the face inside the circular safe area.' },
  logo: { aspect: 1, width: 800, height: 800, cropShape: 'rect' as const, guidance: 'Keep the full logo visible inside the safe area.' },
  cover: { aspect: 2.08, width: 1248, height: 600, cropShape: 'rect' as const, guidance: 'Keep important content away from the outer edges.' },
  featured: { aspect: 1.5, width: 1200, height: 800, cropShape: 'rect' as const, guidance: 'Frame the strongest part of this work sample.' },
}

function imageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

function rotatedBounds(width: number, height: number, rotation: number) {
  const radians = rotation * Math.PI / 180
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

async function adjustedImageFile({
  sourceUrl,
  sourceName,
  crop,
  rotation,
  mode,
  padding,
  background,
}: {
  sourceUrl: string
  sourceName: string
  crop: Area
  rotation: number
  mode: ImageAdjustMode
  padding: number
  background: 'transparent' | 'white'
}) {
  const image = await imageFromUrl(sourceUrl)
  const bounds = rotatedBounds(image.naturalWidth, image.naturalHeight, rotation)
  const rotationCanvas = document.createElement('canvas')
  rotationCanvas.width = Math.ceil(bounds.width)
  rotationCanvas.height = Math.ceil(bounds.height)
  const rotationContext = rotationCanvas.getContext('2d')
  if (!rotationContext) throw new Error('Image editor is unavailable in this browser.')

  rotationContext.translate(rotationCanvas.width / 2, rotationCanvas.height / 2)
  rotationContext.rotate(rotation * Math.PI / 180)
  rotationContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)
  rotationContext.drawImage(image, 0, 0)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = Math.max(1, Math.round(crop.width))
  cropCanvas.height = Math.max(1, Math.round(crop.height))
  const cropContext = cropCanvas.getContext('2d')
  if (!cropContext) throw new Error('Image editor is unavailable in this browser.')
  cropContext.drawImage(
    rotationCanvas,
    Math.max(0, crop.x),
    Math.max(0, crop.y),
    crop.width,
    crop.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  )

  const config = imageModeConfig[mode]
  const output = document.createElement('canvas')
  output.width = config.width
  output.height = config.height
  const outputContext = output.getContext('2d')
  if (!outputContext) throw new Error('Image editor is unavailable in this browser.')
  if (background === 'white' || mode !== 'logo') {
    outputContext.fillStyle = '#ffffff'
    outputContext.fillRect(0, 0, output.width, output.height)
  }

  const inset = mode === 'logo' ? Math.round(Math.min(output.width, output.height) * padding / 200) : 0
  outputContext.drawImage(cropCanvas, inset, inset, output.width - inset * 2, output.height - inset * 2)

  const mimeType = mode === 'logo' ? 'image/png' : 'image/jpeg'
  const extension = mode === 'logo' ? 'png' : 'jpg'
  const baseName = sourceName.replace(/\.[^.]+$/, '') || 'profile-image'
  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob((result) => result ? resolve(result) : reject(new Error('The adjusted image could not be created.')), mimeType, 0.92)
  })
  return new File([blob], `${baseName}-adjusted.${extension}`, { type: mimeType })
}

export function ImageAdjustInput({
  label,
  mode,
  currentUrl,
  onChange,
}: {
  label: string
  mode: ImageAdjustMode
  currentUrl?: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [padding, setPadding] = useState(mode === 'logo' ? 16 : 0)
  const [background, setBackground] = useState<'transparent' | 'white'>(mode === 'logo' ? 'transparent' : 'white')
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit')
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const config = imageModeConfig[mode]

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  useEffect(() => {
    if (!sourceUrl) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !working) closeEditor()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  })

  function resetAdjustments(nextFitMode: 'fit' | 'fill' = fitMode) {
    setCrop({ x: 0, y: 0 })
    setZoom(nextFitMode === 'fit' && mode === 'logo' ? 0.84 : 1)
    setRotation(0)
    setPadding(mode === 'logo' ? 16 : 0)
    setBackground(mode === 'logo' ? 'transparent' : 'white')
    setError('')
  }

  function selectFile(file: File | null) {
    if (!file) return
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const nextUrl = URL.createObjectURL(file)
    setSourceFile(file)
    setSourceUrl(nextUrl)
    setFitMode('fit')
    resetAdjustments('fit')
  }

  function closeEditor() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl('')
    setSourceFile(null)
    setError('')
  }

  async function applyImage() {
    if (!sourceFile || !croppedArea) return
    setWorking(true)
    setError('')
    try {
      const file = await adjustedImageFile({
        sourceUrl,
        sourceName: sourceFile.name,
        crop: croppedArea,
        rotation,
        mode,
        padding,
        background,
      })
      onChange(file)
      closeEditor()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The image could not be adjusted.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <label className="image-adjust-trigger">
        <span className="image-adjust-thumb">
          {currentUrl ? <img src={currentUrl} alt="" /> : <ImageIcon size={19} aria-hidden="true" />}
        </span>
        <span>
          <strong>{label}</strong>
          <small>{currentUrl ? 'Current image saved. Choose another to adjust it.' : 'Choose, crop and preview an image.'}</small>
        </span>
        <span className="image-adjust-choose"><Upload size={13} /> Choose</span>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      </label>

      {sourceUrl ? createPortal(
        <div className="image-adjust-modal" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !working) closeEditor()
        }}>
          <section className="image-adjust-dialog" role="dialog" aria-modal="true" aria-labelledby="image-adjust-title">
            <header>
              <div>
                <h2 id="image-adjust-title">Adjust {label.toLowerCase()}</h2>
                <p>{config.guidance}</p>
              </div>
              <button type="button" onClick={closeEditor} disabled={working} aria-label="Close image editor"><X size={18} /></button>
            </header>

            <div className="image-adjust-layout">
              <div className={`image-adjust-stage is-${mode}${background === 'transparent' ? ' is-transparent' : ''}`}>
                <Cropper
                  image={sourceUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={config.aspect}
                  cropShape={config.cropShape}
                  objectFit={mode === 'logo' && fitMode === 'fit' ? 'contain' : 'cover'}
                  restrictPosition={mode !== 'logo' || fitMode === 'fill'}
                  minZoom={mode === 'logo' && fitMode === 'fit' ? 0.5 : 1}
                  maxZoom={3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_, pixels) => setCroppedArea(pixels)}
                  showGrid={mode !== 'logo'}
                />
              </div>

              <aside className="image-adjust-controls">
                {mode === 'logo' ? (
                  <div className="image-adjust-segmented" aria-label="Logo fit mode">
                    {(['fit', 'fill'] as const).map((item) => (
                      <button className={fitMode === item ? 'is-selected' : ''} type="button" onClick={() => {
                        setFitMode(item)
                        resetAdjustments(item)
                      }} key={item}>{item === 'fit' ? 'Fit' : 'Fill'}</button>
                    ))}
                  </div>
                ) : null}

                <label className="image-adjust-slider">
                  <span><strong>Zoom</strong><b>{Math.round(zoom * 100)}%</b></span>
                  <span><button type="button" onClick={() => setZoom((value) => Math.max(mode === 'logo' ? 0.5 : 1, value - 0.1))}><Minus size={14} /></button><input type="range" min={mode === 'logo' ? 0.5 : 1} max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.1))}><Plus size={14} /></button></span>
                </label>

                <label className="image-adjust-slider">
                  <span><strong>Rotation</strong><b>{rotation}°</b></span>
                  <span><button type="button" onClick={() => setRotation((value) => Math.max(-180, value - 90))}><RotateCcw size={14} /></button><input type="range" min="-180" max="180" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} /><button type="button" onClick={() => setRotation((value) => Math.min(180, value + 90))}><RotateCcw className="is-flipped" size={14} /></button></span>
                </label>

                {mode === 'logo' ? (
                  <>
                    <label className="image-adjust-slider">
                      <span><strong>Padding</strong><b>{padding}%</b></span>
                      <span><button type="button" onClick={() => setPadding((value) => Math.max(0, value - 4))}><Minus size={14} /></button><input type="range" min="0" max="40" step="1" value={padding} onChange={(event) => setPadding(Number(event.target.value))} /><button type="button" onClick={() => setPadding((value) => Math.min(40, value + 4))}><Plus size={14} /></button></span>
                    </label>
                    <div className="image-adjust-background">
                      <strong>Background</strong>
                      <div>
                        {(['transparent', 'white'] as const).map((item) => (
                          <button className={`${item === background ? 'is-selected ' : ''}is-${item}`} type="button" onClick={() => setBackground(item)} key={item}>
                            {item === background ? <Check size={12} /> : null}<span />{item === 'transparent' ? 'Transparent' : 'White'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                <button className="image-adjust-reset" type="button" onClick={() => resetAdjustments()}><RotateCcw size={14} /> Reset adjustments</button>
                {error ? <p className="image-adjust-error" role="alert">{error}</p> : null}
              </aside>
            </div>

            <footer>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={working}><ImageIcon size={15} /> Choose another</button>
              <span>
                <button type="button" onClick={closeEditor} disabled={working}>Cancel</button>
                <button className="is-primary" type="button" onClick={() => void applyImage()} disabled={working || !croppedArea}>{working ? 'Applying…' : 'Apply image'}</button>
              </span>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
