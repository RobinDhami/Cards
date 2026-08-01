type FeedbackProps = {
  message: string
  title?: string
  loading?: boolean
}

export function Feedback({ message, title, loading = false }: FeedbackProps) {
  return (
    <main className="t2c-ui t2c-feedback" aria-live="polite">
      <div className="t2c-feedback__panel">
        {loading ? <span className="t2c-spinner" aria-hidden="true" /> : null}
        {title ? <strong>{title}</strong> : null}
        <span>{message}</span>
      </div>
    </main>
  )
}
