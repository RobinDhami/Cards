import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet'

type CommonProps = {
  children: ReactNode
  className?: string
  variant?: ButtonVariant
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`t2c-button t2c-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  children,
  className = '',
  variant = 'primary',
  ...props
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`t2c-button t2c-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </a>
  )
}
