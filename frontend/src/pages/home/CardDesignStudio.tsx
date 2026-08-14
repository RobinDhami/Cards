import { lazy, Suspense, useState, type CSSProperties } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js'
import Palette from 'lucide-react/dist/esm/icons/palette.js'
import ScanLine from 'lucide-react/dist/esm/icons/scan-line.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import type { CardFinishId } from '../../features/card-editor/types'

const loadAdvancedCardEditor = () => import('../../features/card-editor/CardEditor')
const AdvancedCardEditor = lazy(() =>
  loadAdvancedCardEditor().then((module) => ({ default: module.AdvancedCardEditor })),
)

const materials = [
  { id: 'plastic', label: 'Plastic' },
  { id: 'metal', label: 'Metal' },
  { id: 'wood', label: 'Wood' },
  { id: 'custom', label: 'Custom' },
] as const

const finishes = ['Matte', 'Brushed', 'Gloss'] as const
const accents = ['#4D5BFF', '#61F2C2', '#FFB84D', '#A7ADB8'] as const

type MaterialId = (typeof materials)[number]['id']
type FinishStyle = (typeof finishes)[number]

const editorFinish: Record<MaterialId, CardFinishId> = {
  plastic: 'pvc',
  metal: 'metal',
  wood: 'wood',
  custom: 'pvc',
}

const studioBenefits = [
  { title: 'NFC enabled', text: 'One tap. Instant connect.', icon: ScanLine },
  { title: 'Secure & reliable', text: 'Your data stays protected.', icon: ShieldCheck },
  { title: 'Designed in Nepal', text: 'Crafted for you.', icon: Palette },
]

export function CardDesignStudio() {
  const [material, setMaterial] = useState<MaterialId>('plastic')
  const [finish, setFinish] = useState<FinishStyle>('Matte')
  const [accent, setAccent] = useState<(typeof accents)[number]>(accents[0])
  const [name, setName] = useState('Tap2Connect Nepal')
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <>
      <section className="card-studio-section section-pad" id="card-studio">
        <div className="container card-studio-layout">
          <div className="card-studio-copy">
            <span className="studio-kicker">Design yours</span>
            <h2>Make it yours.<br />Tap to stand out.</h2>
            <p>Customize every detail and see it come to life in real time.</p>

            <div className="card-studio-controls">
              <fieldset className="studio-control-group">
                <legend className="studio-control-label">Material</legend>
                <div className="studio-material-options">
                  {materials.map((option) => (
                    <button
                      type="button"
                      className={`studio-material studio-material--${option.id}${material === option.id ? ' is-selected' : ''}`}
                      aria-pressed={material === option.id}
                      onClick={() => setMaterial(option.id)}
                      key={option.id}
                    >
                      <span aria-hidden="true" />
                      <small>{option.label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="studio-control-group">
                <legend className="studio-control-label">Finish</legend>
                <div className="studio-finish-options">
                  {finishes.map((option) => (
                    <button
                      type="button"
                      className={finish === option ? 'is-selected' : ''}
                      aria-pressed={finish === option}
                      onClick={() => setFinish(option)}
                      key={option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="studio-control-group">
                <legend className="studio-control-label">Accent</legend>
                <div className="studio-accent-options">
                  {accents.map((color) => (
                    <button
                      type="button"
                      aria-label={`Use ${color} accent`}
                      aria-pressed={accent === color}
                      className={accent === color ? 'is-selected' : ''}
                      style={{ backgroundColor: color }}
                      onClick={() => setAccent(color)}
                      key={color}
                    />
                  ))}
                </div>
              </fieldset>

              <label className="studio-name-field">
                <span>Name on card</span>
                <span>
                  <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
                  <small>{name.length} / 20</small>
                </span>
              </label>
            </div>

            <button
              type="button"
              className="home-button home-button-primary studio-start-button"
              onClick={() => setEditorOpen(true)}
              onMouseEnter={() => void loadAdvancedCardEditor()}
              onFocus={() => void loadAdvancedCardEditor()}
            >
              Start designing
              <ArrowRight size={19} />
            </button>
          </div>

          <div className="card-preview-stage">
            <div
              className={`card-proof card-proof--${material} card-proof--${finish.toLowerCase()}`}
              style={{ '--studio-accent': accent } as CSSProperties}
              aria-label={`${material} card preview with ${finish.toLowerCase()} finish`}
            >
              <span className="card-proof-texture" aria-hidden="true" />
              <ScanLine className="card-proof-nfc" size={48} strokeWidth={2.1} aria-hidden="true" />
              <strong>{name || 'Your name'}</strong>
              <small>Nepal</small>
            </div>
          </div>
        </div>

        <div className="container studio-benefits">
          {studioBenefits.map(({ title, text, icon: Icon }) => (
            <div key={title}>
              <span><Icon size={20} strokeWidth={1.6} /></span>
              <p><strong>{title}</strong><small>{text}</small></p>
            </div>
          ))}
        </div>
      </section>

      {editorOpen ? (
        <Suspense
          fallback={
            <div className="editor-loading-screen" role="status" aria-live="polite">
              <img src="/static/branding/tap2connect-logo.png" alt="" />
              <span>Opening card editor…</span>
            </div>
          }
        >
          <AdvancedCardEditor
            open
            initialFrontDesign="midnight"
            initialBackDesign="minimal"
            finish={editorFinish[material]}
            initialTemplateId={null}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  )
}
