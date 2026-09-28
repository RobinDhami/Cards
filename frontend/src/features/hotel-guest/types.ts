export type GuestHotel = {
  name: string
  slug: string
  logo: string
  heroImage: string
  shortDescription: string
  phone: string
  whatsapp: string
  address: string
  mapUrl: string
  googleReviewUrl: string
  checkInTime: string
  checkOutTime: string
}

export type GuestTheme = {
  templateIdentifier?: string
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  secondaryColor?: string
  headingFont?: string
  bodyFont?: string
  cardRadius?: number
  buttonRadius?: number
}

export type GuestOffer = {
  title: string
  shortDescription: string
  description: string
  image: string
  buttonLabel: string
  destinationUrl: string
  startsAt: string
  endsAt: string
}

export type GuestLink = {
  type: string
  label: string
  value: string
  displayOrder: number
}

export type GuestTouchpoint = {
  type: string
  isRoomAssociated: boolean
  requiresGuestAuthorization: boolean
}

export type GuestCapabilities = {
  menuVisible: boolean
  menuMode: 'view_only' | 'ordering'
  servicesVisible: boolean
  serviceMode: 'view_only' | 'whatsapp' | 'digital_request'
  offersVisible: boolean
  reviewVisible: boolean
  contactLinksVisible: boolean
  guestAccessEnabled: boolean
}

export type GuestExperienceResponse = {
  ok: boolean
  experience: {
    hotel: GuestHotel
    theme: GuestTheme
    offer: GuestOffer | null
    links: GuestLink[]
    touchpoint: GuestTouchpoint
    capabilities: GuestCapabilities
  }
}
