import { lazy, Suspense, useState } from 'react'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal.mjs'
import TreePine from 'lucide-react/dist/esm/icons/tree-pine.mjs'
import type {
  CardDesignId,
  CardFinishId,
  CardSide,
} from '../../features/card-editor/types'

const loadAdvancedCardEditor = () => import('../../features/card-editor/CardEditor')
const AdvancedCardEditor = lazy(() =>
  loadAdvancedCardEditor().then((module) => ({ default: module.AdvancedCardEditor })),
)

const designOptions: Array<{ id: CardDesignId; label: string }> = [
  { id: 'midnight', label: 'Midnight' },
  { id: 'signature', label: 'Signature Blue' },
  { id: 'minimal', label: 'Minimal White' },
]

const finishOptions = [
  { id: 'pvc' as const, label: 'PVC', icon: CreditCard },
  { id: 'metal' as const, label: 'Metal', icon: Layers3 },
  { id: 'wood' as const, label: 'Wood', icon: TreePine },
]

export function CardDesignStudio() {
  const [side, setSide] = useState<CardSide>('front')
  const [frontDesign, setFrontDesign] = useState<CardDesignId>('midnight')
  const [backDesign, setBackDesign] = useState<CardDesignId>('minimal')
  const [finish, setFinish] = useState<CardFinishId>('pvc')
  const [editorOpen, setEditorOpen] = useState(false)

  const activeDesign = side === 'front' ? frontDesign : backDesign
  const frontLabel = designOptions.find((option) => option.id === frontDesign)?.label ?? 'Midnight'
  const backLabel = designOptions.find((option) => option.id === backDesign)?.label ?? 'Minimal White'

  const chooseDesign = (design: CardDesignId) => {
    if (side === 'front') {
      setFrontDesign(design)
      return
    }
    setBackDesign(design)
  }

  return (
    <>
      <section className="card-studio-section section-pad" id="card-studio">
        <div className="container card-studio-layout">
          <div className="card-studio-copy">
            <h2>Design both sides. Make it yours.</h2>
            <p>Choose a front, a back, and the finish. Then refine every detail in the advanced editor.</p>

            <div className="card-studio-controls">
              <div className="studio-control-group">
                <span className="studio-control-label">Side</span>
                <div className="studio-side-switch" aria-label="Card side">
                  {(['front', 'back'] as const).map((option) => (
                    <button
                      type="button"
                      className={side === option ? 'is-selected' : ''}
                      aria-pressed={side === option}
                      onClick={() => setSide(option)}
                      key={option}
                    >
                      {option === 'front' ? 'Front' : 'Back'}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="studio-control-group">
                <legend className="studio-control-label">
                  {side === 'front' ? 'Front design' : 'Back design'}
                </legend>
                <div className="studio-design-options">
                  {designOptions.map((option) => {
                    const isSelected = activeDesign === option.id
                    return (
                      <button
                        type="button"
                        className={`studio-design-option studio-design-option--${option.id}${isSelected ? ' is-selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => chooseDesign(option.id)}
                        key={option.id}
                      >
                        <span className="studio-design-swatch" aria-hidden="true">
                          <span>T2C</span>
                          {isSelected ? <Check size={14} strokeWidth={2.4} /> : null}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <fieldset className="studio-control-group">
                <legend className="studio-control-label">Finish</legend>
                <div className="studio-finish-options">
                  {finishOptions.map((option) => {
                    const Icon = option.icon
                    const isSelected = finish === option.id
                    return (
                      <button
                        type="button"
                        className={isSelected ? 'is-selected' : ''}
                        aria-pressed={isSelected}
                        onClick={() => setFinish(option.id)}
                        key={option.id}
                      >
                        <Icon size={20} strokeWidth={1.8} />
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>

            <div className="studio-order-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditorOpen(true)}
                onMouseEnter={() => void loadAdvancedCardEditor()}
                onFocus={() => void loadAdvancedCardEditor()}
              >
                Advanced editor
                <SlidersHorizontal size={17} strokeWidth={2} />
              </button>
              <p aria-live="polite">
                Front: {frontLabel} | Back: {backLabel} | {finish.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="card-preview-stage">
            <div className="card-preview-meta">
              <span>{side === 'front' ? 'Front preview' : 'Back preview'}</span>
              <span>{finish.toUpperCase()}</span>
            </div>

            <div
              className={`card-proof card-proof--${activeDesign} card-proof--${finish}`}
              aria-label={`${side} card preview using the ${activeDesign} design and ${finish} finish`}
            >
              <span className="card-proof-texture" aria-hidden="true" />
              {side === 'front' ? (
                <div className="card-proof-front">
                  <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect Nepal" />
                  <div>
                    <strong>Aarav Sharma</strong>
                    <span>Founder | Tap2Connect Nepal</span>
                  </div>
                  <small>Tap. Share. Connect.</small>
                </div>
              ) : (
                <div className="card-proof-back">
                  <div className="card-proof-qr" aria-hidden="true">
                    <QrCode size={82} strokeWidth={1.5} />
                  </div>
                  <strong>SCAN TO CONNECT</strong>
                  <span>tap2connect.me/aarav</span>
                </div>
              )}
            </div>

            <p className="card-preview-note">Your final artwork is reviewed with you before printing.</p>
          </div>
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
            initialFrontDesign={frontDesign}
            initialBackDesign={backDesign}
            finish={finish}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  )
}
