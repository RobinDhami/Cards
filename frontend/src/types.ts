import type { LucideIcon } from 'lucide-react'

export type ContactAction = {
  label: string
  href: string
  icon: LucideIcon
  tone: 'call' | 'whatsapp' | 'email' | 'map'
}

export type SocialLink = {
  label: string
  href: string
  icon: LucideIcon
  tone: 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'github'
}

export type ServiceOffering = {
  title: string
  description: string
  icon: LucideIcon
}

export type ProfessionalProfile = {
  fullName: string
  role: string
  organization: string
  organizationTagline: string
  location: string
  verified: boolean
  accentColor: string
  about: string
  businessHours: string
  officeAddress: string
  website: string
  contactActions: ContactAction[]
  socialLinks: SocialLink[]
  services: ServiceOffering[]
}
