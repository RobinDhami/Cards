import { useState } from 'react'
import { ModernIdentityPreview } from './components/ModernIdentityPreview'
import { OrganizationFocusPreview } from './components/OrganizationFocusPreview'
import { demoProfile } from './data/demoProfile'
import './App.css'

type PreviewMode = 'organization' | 'modern'

function App() {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('organization')

  return (
    <main className="app-shell">
      <section className="workspace-panel">
        <p className="eyebrow">React migration foundation</p>
        <h1>Django stays strong. React becomes the builder UI.</h1>
        <p className="lede">
          This is the first React layer for the current profile work. Next we can connect it to
          Django REST APIs and move the shop/dashboard builder here.
        </p>

        <div className="stack-plan" aria-label="Recommended stack">
          <div>
            <strong>Frontend</strong>
            <span>Vite + React 19 + TypeScript</span>
          </div>
          <div>
            <strong>Backend</strong>
            <span>Django + Django REST Framework</span>
          </div>
          <div>
            <strong>Migration style</strong>
            <span>React beside Django first, route-by-route later</span>
          </div>
        </div>

        <div className="preview-tabs" role="tablist" aria-label="Profile preview template">
          <button
            aria-selected={previewMode === 'organization'}
            onClick={() => setPreviewMode('organization')}
            role="tab"
            type="button"
          >
            Organization Focus
          </button>
          <button
            aria-selected={previewMode === 'modern'}
            onClick={() => setPreviewMode('modern')}
            role="tab"
            type="button"
          >
            Modern Identity
          </button>
        </div>

        <section className="next-steps">
          <h2>Best next steps</h2>
          <ol>
            <li>Create read APIs for professional profiles and shop data.</li>
            <li>Replace this sample profile with API-loaded data.</li>
            <li>Build the shop dashboard and product builder in React.</li>
            <li>Switch Django routes to React only after each screen is stable.</li>
          </ol>
        </section>
      </section>

      <section className="preview-stage" aria-label="Template preview">
        {previewMode === 'organization' ? (
          <OrganizationFocusPreview profile={demoProfile} />
        ) : (
          <ModernIdentityPreview profile={demoProfile} />
        )}
      </section>
    </main>
  )
}

export default App
