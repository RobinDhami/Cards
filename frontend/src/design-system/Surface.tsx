import type { HTMLAttributes, ReactNode } from 'react'

export function Surface({
  children,
  className = '',
  raised = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; raised?: boolean }) {
  return (
    <div className={`t2c-surface${raised ? ' t2c-surface--raised' : ''} ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
