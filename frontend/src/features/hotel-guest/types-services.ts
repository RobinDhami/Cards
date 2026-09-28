export type GuestService = {
  identifier: string
  name: string
  shortDescription: string
  description: string
  iconIdentifier: string
  image: string
  price: string | null
  availability: string
  estimatedCompletionMinutes: number | null
  allowsGuestNote: boolean
  displayOrder: number
}

export type GuestServiceCategory = {
  name: string
  slug: string
  description: string
  displayOrder: number
  services: GuestService[]
}

export type GuestServicesResponse = {
  ok: boolean
  currency: string
  capabilities: import('./types').GuestCapabilities
  whatsapp: string
  categories: GuestServiceCategory[]
}
