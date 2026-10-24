import type { ComponentType, SVGProps } from 'react'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import { socialIconAssets } from './socialIconAssets'

const imageIcons: Record<string, string> = {
  facebook: socialIconAssets.facebook,
  google: socialIconAssets.googleReview,
  'google-review': socialIconAssets.googleReview,
  instagram: socialIconAssets.instagram,
  tiktok: socialIconAssets.tiktok,
  website: socialIconAssets.website,
  whatsapp: socialIconAssets.whatsapp,
  youtube: socialIconAssets.youtube,
}

const fallbackIcons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  email: Mail,
}

export const socialLabels: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google review link',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  website: 'Website',
  youtube: 'YouTube',
}

type SocialIconProps = {
  type: string
  className?: string
  'aria-hidden'?: boolean
}

export function SocialIcon({ type, className, 'aria-hidden': ariaHidden = true }: SocialIconProps) {
  const normalizedType = type.toLowerCase()
  const imageSource = imageIcons[normalizedType]

  if (imageSource) {
    return <img className={`social-brand-image${className ? ` ${className}` : ''}`} src={imageSource} width="20" height="20" alt="" aria-hidden={ariaHidden} draggable={false} />
  }

  const Icon = fallbackIcons[normalizedType] || ExternalLink
  return <Icon className={className} aria-hidden={ariaHidden} />
}
