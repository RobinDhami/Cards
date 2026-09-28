import type { GuestCapabilities } from './types'

export const canBrowseMenu = (capabilities: GuestCapabilities) => capabilities.menuVisible
export const canOrder = (capabilities: GuestCapabilities) => capabilities.menuVisible && capabilities.menuMode === 'ordering' && capabilities.guestAccessEnabled
export const canBrowseServices = (capabilities: GuestCapabilities) => capabilities.servicesVisible
export const canRequestService = (capabilities: GuestCapabilities) => capabilities.servicesVisible && capabilities.serviceMode === 'digital_request' && capabilities.guestAccessEnabled
export const usesWhatsAppServices = (capabilities: GuestCapabilities) => capabilities.servicesVisible && capabilities.serviceMode === 'whatsapp'
export const requiresGuestAccess = (capabilities: GuestCapabilities) => canOrder(capabilities) || canRequestService(capabilities)
