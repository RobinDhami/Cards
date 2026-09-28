export type GuestMenuItem = {
  identifier: string
  name: string
  description: string
  image: string
  price: string
  isVegetarian: boolean
  dietaryInfo: string
  displayOrder: number
}

export type GuestMenuCategory = {
  name: string
  slug: string
  description: string
  displayOrder: number
  items: GuestMenuItem[]
}

export type GuestMenuResponse = {
  ok: boolean
  currency: string
  capabilities: import('./types').GuestCapabilities
  categories: GuestMenuCategory[]
}
