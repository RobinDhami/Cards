import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import './FormControls.css'

export function Field({
  label,
  hint,
  error,
  children,
  wide,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`form-field${wide ? ' is-wide' : ''}`}>
      <span className="form-label">{label}</span>
      {children}
      {error ? <small className="form-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  )
}
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="form-control" {...props} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="form-control" rows={4} {...props} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="form-control" {...props} />
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="form-toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <i aria-hidden="true" />
    </label>
  )
}

export function FileInput({
  label,
  currentUrl,
  accept,
  onChange,
}: {
  label: string
  currentUrl?: string
  accept?: string
  onChange: (file: File | null) => void
}) {
  return (
    <label className="form-file">
      <Upload size={16} aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        <small>{currentUrl ? 'Current file saved. Choose another to replace it.' : 'Choose a file to upload.'}</small>
      </span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  )
}

export function FormSection({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="form-section manage-card">
      <div className="form-section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  )
}
