import type { ReactNode } from 'react'

export function ProfileSection({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  return (
    <section className={`digital-card-section ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
