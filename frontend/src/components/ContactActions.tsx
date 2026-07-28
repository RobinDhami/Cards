import type { ContactAction } from '../types'

type ContactActionsProps = {
  actions: ContactAction[]
}

export function ContactActions({ actions }: ContactActionsProps) {
  return (
    <nav className="contact-actions" aria-label="Contact actions">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <a className="contact-action" href={action.href} key={action.label}>
            <span className={`contact-action__icon contact-action__icon--${action.tone}`}>
              <Icon aria-hidden="true" />
            </span>
            <span>{action.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
