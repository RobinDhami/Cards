import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonBase = {
  children: ReactNode
  className?: string
}

export function IconButton({
  children,
  className = '',
  ...props
}: IconButtonBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`t2c-icon-button ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function IconLink({
  children,
  className = '',
  ...props
}: IconButtonBase & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`t2c-icon-button ${className}`.trim()} {...props}>
      {children}
    </a>
  )
}
