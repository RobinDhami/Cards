import { brandLogo } from '../../lib/assets'
import './MigrationNeededPage.css'

type MigrationNeededPageProps = {
  title?: string
  route?: string
}

export function MigrationNeededPage({
  title = 'Migration needed',
  route = window.location.pathname,
}: MigrationNeededPageProps) {
  return (
    <main className="migration-page">
      <section className="migration-card">
        <a href="/" className="migration-logo" aria-label="Tap2Connect home">
          <img src={brandLogo} alt="Tap2Connect" />
        </a>
        <span className="migration-eyebrow">Route not migrated yet</span>
        <h1>{title}</h1>
        <p>
          This URL exists in the old Django project, but the React page for it has not been migrated yet.
        </p>
        <code>{route}</code>
        <div>
          <a href="/dashboard/">Dashboard</a>
          <a href="/">Home</a>
        </div>
      </section>
    </main>
  )
}
