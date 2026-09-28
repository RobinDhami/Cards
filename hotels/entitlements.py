from .models import HotelFeatureSettings, HotelPackageEntitlement

PACKAGE_MODULES = {
    HotelPackageEntitlement.DIGITAL_GUIDE: {
        'overview', 'branding', 'rooms', 'nfc_touchpoints', 'menu_catalog', 'service_catalog',
        'offers_links', 'google_review', 'basic_analytics', 'team', 'settings',
    },
    HotelPackageEntitlement.SMART_GUEST: {
        'overview', 'branding', 'rooms', 'nfc_touchpoints', 'nfc_assets', 'menu_catalog', 'service_catalog',
        'offers_links', 'google_review', 'basic_analytics', 'guest_access', 'orders', 'service_requests',
        'operations', 'advanced_analytics', 'team', 'settings',
    },
}

MODULE_METADATA = {
    'overview': ('Overview', 'Hotel status and operational summary'),
    'branding': ('Branding & Template', 'Hotel identity and guest experience appearance'),
    'rooms': ('Rooms', 'Rooms and room-level destinations'),
    'nfc_touchpoints': ('NFC Touchpoints', 'Logical guest destinations'),
    'nfc_assets': ('NFC Cards', 'Physical NFC inventory'),
    'menu_catalog': ('Menu', 'Categories, items, prices and availability'),
    'service_catalog': ('Services', 'Guest-facing service catalogue'),
    'offers_links': ('Offers & Links', 'Promotions and contact destinations'),
    'google_review': ('Reviews', 'Google review configuration'),
    'basic_analytics': ('Basic Analytics', 'Guest tap and content analytics'),
    'guest_access': ('Guest Access', 'Stays and room verification'),
    'orders': ('Orders', 'Guest ordering operations'),
    'service_requests': ('Service Requests', 'Digital guest service requests'),
    'operations': ('Operations', 'Operational staff workflows'),
    'advanced_analytics': ('Advanced Analytics', 'Advanced hotel analytics'),
    'team': ('Team', 'Hotel membership access'),
    'settings': ('Settings', 'Hotel configuration'),
}


def ensure_hotel_entitlement(hotel, *, assigned_by=None):
    entitlement, _ = HotelPackageEntitlement.objects.get_or_create(hotel=hotel, defaults={'assigned_by': assigned_by})
    return entitlement


def effective_modules(hotel):
    entitlement = ensure_hotel_entitlement(hotel)
    modules = set(PACKAGE_MODULES[entitlement.package])
    features = HotelFeatureSettings.objects.get_or_create(hotel=hotel)[0]
    if entitlement.package == HotelPackageEntitlement.DIGITAL_GUIDE:
        modules.discard('guest_access'); modules.discard('orders'); modules.discard('service_requests'); modules.discard('operations'); modules.discard('advanced_analytics')
    if not features.menu_visible: modules.discard('menu_catalog')
    if not features.services_visible: modules.discard('service_catalog')
    return modules


def hotel_allows(hotel, module):
    return module in effective_modules(hotel)


def module_payload(hotel):
    entitlement = ensure_hotel_entitlement(hotel)
    modules = effective_modules(hotel)
    return {
        'package': entitlement.package,
        'packageLabel': entitlement.get_package_display(),
        'managementMode': entitlement.management_mode,
        'modules': [{'key': key, 'label': MODULE_METADATA[key][0], 'description': MODULE_METADATA[key][1], 'enabled': key in modules} for key in MODULE_METADATA],
    }
