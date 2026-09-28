from django.db.models import Count
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods
import json
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Hotel, HotelFeatureSettings, HotelMembership, HotelTheme, NfcTouchpoint, Room, MenuCategory, MenuItem, ServiceCategory, HotelService
from .services import resolve_hotel_for_user
from .entitlements import effective_modules, module_payload, ensure_hotel_entitlement
from .models import HotelPackageEntitlement


def _admin_error(message, status):
    return JsonResponse({'ok': False, 'message': message}, status=status)


def _require_hotel_admin(request):
    if not request.user.is_authenticated:
        return _admin_error('Please sign in to continue.', 401)
    if not request.user.is_superuser:
        return _admin_error('Only Super Admins can manage hotels from this workspace.', 403)
    return None


def _require_authenticated(request):
    if not request.user.is_authenticated:
        return _admin_error('Please sign in to continue.', 401)
    return None


def _is_platform_admin(request):
    return bool(request.user.is_authenticated and request.user.is_superuser)


def _resolve_authorized_hotel(request, hotel_id):
    if _is_platform_admin(request):
        return Hotel.objects.filter(pk=hotel_id).first(), None
    try:
        return resolve_hotel_for_user(request.user, hotel_id), None
    except Exception:
        return None, _admin_error('You do not have access to this hotel.', 403)


def _hotel_payload(hotel):
    try:
        features = hotel.feature_settings
    except HotelFeatureSettings.DoesNotExist:
        features = None
    touchpoint = hotel.touchpoints.filter(is_active=True).order_by('id').first()
    return {
        'id': hotel.id,
        'name': hotel.name,
        'slug': hotel.slug,
        'currency': hotel.currency,
        'isActive': hotel.is_active,
        'createdAt': hotel.created_at.isoformat(),
        'roomCount': getattr(hotel, 'room_count', hotel.rooms.count()),
        'touchpointCount': getattr(hotel, 'touchpoint_count', hotel.touchpoints.count()),
        'membershipCount': getattr(hotel, 'membership_count', hotel.memberships.count()),
        'guestUrl': f'/guest/{touchpoint.public_identifier}' if touchpoint else '',
        'menuMode': features.menu_mode if features else 'view_only',
        'serviceMode': features.service_mode if features else 'view_only',
        'guestAccessEnabled': bool(features and features.guest_access_enabled),
        'templateIdentifier': hotel.theme.template_identifier if hasattr(hotel, 'theme') else 'aurora',
        'primaryColor': hotel.theme.primary_color if hasattr(hotel, 'theme') else '#C9A84C',
        'backgroundColor': hotel.theme.background_color if hasattr(hotel, 'theme') else '#F7F5F0',
        'package': ensure_hotel_entitlement(hotel).package,
    }


def _json_body(request):
    try:
        return json.loads(request.body or '{}')
    except (TypeError, ValueError):
        return None


@require_http_methods(['GET', 'POST'])
def hotel_directory_api(request):
    denied = _require_hotel_admin(request)
    if denied:
        return denied
    if request.method == 'POST':
        body = _json_body(request)
        name = str(body.get('name', '')).strip() if isinstance(body, dict) else ''
        if not name:
            return _admin_error('Hotel name is required.', 400)
        requested_slug = str(body.get('slug', '')).strip() if isinstance(body, dict) else ''
        slug = slugify(requested_slug or name)
        if not slug:
            return _admin_error('Hotel slug is required.', 400)
        if Hotel.objects.filter(slug=slug).exists():
            return _admin_error('A hotel with this slug already exists.', 409)
        try:
            with transaction.atomic():
                hotel = Hotel.objects.create(
                    name=name, slug=slug, currency=str(body.get('currency', 'USD')).upper()[:3] or 'USD',
                    short_description=str(body.get('shortDescription', '')).strip(), email=str(body.get('email', '')).strip(),
                    phone=str(body.get('phone', '')).strip(), whatsapp=str(body.get('whatsapp', '')).strip(),
                    address=str(body.get('address', '')).strip(), time_zone=str(body.get('timeZone', 'UTC')).strip() or 'UTC',
                    is_active=bool(body.get('isActive', True)),
                )
                HotelFeatureSettings.objects.update_or_create(hotel=hotel, defaults={
                    'menu_mode': body.get('menuMode', HotelFeatureSettings.MENU_VIEW_ONLY),
                    'service_mode': body.get('serviceMode', HotelFeatureSettings.SERVICE_VIEW_ONLY),
                    'guest_access_enabled': bool(body.get('guestAccessEnabled', False)),
                    'menu_visible': bool(body.get('menuVisible', True)), 'services_visible': bool(body.get('servicesVisible', True)),
                    'offers_visible': bool(body.get('offersVisible', True)), 'review_visible': bool(body.get('reviewVisible', True)),
                    'contact_links_visible': bool(body.get('contactLinksVisible', True)),
                })
                HotelTheme.objects.get_or_create(hotel=hotel)
                entitlement = ensure_hotel_entitlement(hotel, assigned_by=request.user)
                if body.get('package') in dict(HotelPackageEntitlement.PACKAGE_CHOICES):
                    entitlement.package = body['package']; entitlement.assigned_by = request.user; entitlement.save(update_fields=['package', 'assigned_by', 'updated_at'])
                owner_id = body.get('ownerId') or body.get('managerId')
                if owner_id:
                    owner = get_user_model().objects.filter(pk=owner_id).first()
                    if not owner:
                        return _admin_error('Selected owner or manager was not found.', 400)
                    HotelMembership.objects.create(user=owner, hotel=hotel, role='owner' if body.get('ownerId') else 'manager')
        except ValidationError as error:
            return _admin_error('; '.join(sum(error.message_dict.values(), [])), 400)
        return JsonResponse({'ok': True, 'hotel': _hotel_payload(hotel)}, status=201)
    hotels = Hotel.objects.select_related('feature_settings').annotate(
        room_count=Count('rooms', distinct=True),
        touchpoint_count=Count('touchpoints', distinct=True),
        membership_count=Count('memberships', distinct=True),
    ).order_by('name', 'id')
    active_hotels = Hotel.objects.filter(is_active=True)
    return JsonResponse({'ok': True, 'hotels': [_hotel_payload(hotel) for hotel in hotels], 'total': hotels.count(), 'metrics': {
        'totalHotels': hotels.count(), 'activeHotels': active_hotels.count(), 'inactiveHotels': Hotel.objects.filter(is_active=False).count(),
        'digitalGuideHotels': HotelFeatureSettings.objects.filter(hotel__is_active=True, menu_visible=True).count(),
        'smartGuestHotels': HotelFeatureSettings.objects.filter(hotel__is_active=True, guest_access_enabled=True).count(),
        'totalRooms': Room.objects.filter(hotel__is_active=True).count(), 'totalTouchpoints': NfcTouchpoint.objects.filter(hotel__is_active=True, is_active=True).count(),
    }})


@require_http_methods(['GET', 'PATCH'])
def hotel_detail_api(request, hotel_id):
    denied = _require_authenticated(request)
    if denied:
        return denied
    hotel, denied = _resolve_authorized_hotel(request, hotel_id)
    if denied:
        return denied
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    hotel = Hotel.objects.select_related('feature_settings', 'theme').annotate(
        room_count=Count('rooms', distinct=True),
        touchpoint_count=Count('touchpoints', distinct=True),
        membership_count=Count('memberships', distinct=True),
    ).filter(pk=hotel_id).first()
    if request.method == 'PATCH':
        body = _json_body(request)
        if not isinstance(body, dict):
            return _admin_error('Invalid JSON payload.', 400)
        if not _is_platform_admin(request):
            body = {key: value for key, value in body.items() if key in {'name', 'shortDescription', 'email', 'phone', 'whatsapp', 'address', 'isActive', 'template_identifier', 'primary_color', 'background_color', 'text_color'}}
        if 'name' in body:
            name = str(body['name']).strip()
            if not name:
                return _admin_error('Hotel name cannot be empty.', 400)
            hotel.name = name
        if 'currency' in body:
            hotel.currency = str(body['currency']).strip().upper()[:3]
        if 'isActive' in body:
            hotel.is_active = bool(body['isActive'])
        hotel.save(update_fields=['name', 'currency', 'is_active', 'updated_at'])
        features, _ = HotelFeatureSettings.objects.get_or_create(hotel=hotel)
        theme = None
        for field in ('template_identifier', 'primary_color', 'background_color', 'text_color'):
            if field in body:
                if theme is None:
                    theme = HotelTheme.objects.get_or_create(hotel=hotel)[0]
                setattr(theme, field, str(body[field]).strip())
        if any(field in body for field in ('template_identifier', 'primary_color', 'background_color', 'text_color')):
            theme.save(update_fields=['template_identifier', 'primary_color', 'background_color', 'text_color'])
        for field in ('menu_mode', 'service_mode', 'guest_access_enabled'):
            if field in body:
                setattr(features, field, body[field])
        features.save()
        hotel.refresh_from_db()
        return JsonResponse({'ok': True, 'hotel': _hotel_payload(hotel)})
    touchpoints = NfcTouchpoint.objects.filter(hotel=hotel).select_related('room').order_by('label', 'id')
    return JsonResponse({'ok': True, 'hotel': _hotel_payload(hotel), 'rooms': list(Room.objects.filter(hotel=hotel).order_by('identifier').values('id', 'identifier', 'floor', 'room_type', 'is_active')), 'touchpoints': [{'label': item.label, 'publicIdentifier': item.public_identifier, 'type': item.touchpoint_type, 'room': item.room.identifier if item.room_id else '', 'isActive': item.is_active, 'guestUrl': f'/guest/{item.public_identifier}'} for item in touchpoints]})


@require_http_methods(['GET'])
def hotel_metrics_api(request):
    denied = _require_hotel_admin(request)
    if denied:
        return denied
    hotels = Hotel.objects.all()
    return JsonResponse({'ok': True, 'metrics': {
        'totalHotels': hotels.count(), 'activeHotels': hotels.filter(is_active=True).count(), 'inactiveHotels': hotels.filter(is_active=False).count(),
        'digitalGuideHotels': HotelFeatureSettings.objects.filter(hotel__is_active=True, menu_visible=True).count(),
        'smartGuestHotels': HotelFeatureSettings.objects.filter(hotel__is_active=True, guest_access_enabled=True).count(),
        'totalRooms': Room.objects.filter(hotel__is_active=True).count(), 'totalTouchpoints': NfcTouchpoint.objects.filter(hotel__is_active=True, is_active=True).count(),
    }})


@require_http_methods(['GET'])
def hotel_modules_api(request, hotel_id):
    denied = _require_authenticated(request)
    if denied:
        return denied
    hotel, denied = _resolve_authorized_hotel(request, hotel_id)
    if denied:
        return denied
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    return JsonResponse({'ok': True, 'hotelId': hotel.id, **module_payload(hotel)})


@require_http_methods(['PATCH'])
def hotel_package_api(request, hotel_id):
    denied = _require_hotel_admin(request)
    if denied:
        return denied
    hotel = Hotel.objects.filter(pk=hotel_id).first()
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    body = _json_body(request)
    package = body.get('package') if isinstance(body, dict) else None
    if package not in dict(HotelPackageEntitlement.PACKAGE_CHOICES):
        return _admin_error('Unknown hotel package.', 400)
    entitlement = ensure_hotel_entitlement(hotel, assigned_by=request.user)
    entitlement.package = package; entitlement.assigned_by = request.user; entitlement.save(update_fields=['package', 'assigned_by', 'updated_at'])
    return JsonResponse({'ok': True, **module_payload(hotel)})


@require_http_methods(['GET', 'POST', 'PATCH'])
def hotel_rooms_api(request, hotel_id):
    denied = _require_authenticated(request)
    if denied:
        return denied
    hotel, denied = _resolve_authorized_hotel(request, hotel_id)
    if denied:
        return denied
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'rooms': list(Room.objects.filter(hotel=hotel).order_by('identifier').values('id', 'identifier', 'floor', 'room_type', 'is_active'))})
    body = _json_body(request)
    if not isinstance(body, dict) or not str(body.get('identifier', '')).strip():
        return _admin_error('Room identifier is required.', 400)
    room = Room.objects.filter(pk=body.get('id'), hotel=hotel).first() if body.get('id') else Room(hotel=hotel)
    room.identifier = str(body['identifier']).strip(); room.floor = str(body.get('floor', '')).strip(); room.room_type = str(body.get('roomType', body.get('room_type', ''))).strip(); room.is_active = bool(body.get('isActive', True))
    try:
        room.full_clean(); room.save()
    except ValidationError as error:
        return _admin_error('; '.join(sum(error.message_dict.values(), [])), 400)
    return JsonResponse({'ok': True, 'room': {'id': room.id, 'identifier': room.identifier, 'floor': room.floor, 'room_type': room.room_type, 'is_active': room.is_active}}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'POST', 'PATCH'])
def hotel_menu_api(request, hotel_id):
    return _hotel_catalog_api(request, hotel_id, 'menu_catalog')


@require_http_methods(['GET', 'POST', 'PATCH'])
def hotel_services_api(request, hotel_id):
    return _hotel_catalog_api(request, hotel_id, 'service_catalog')


def _hotel_catalog_api(request, hotel_id, module):
    denied = _require_authenticated(request)
    if denied:
        return denied
    hotel, denied = _resolve_authorized_hotel(request, hotel_id)
    if denied:
        return denied
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    if module not in effective_modules(hotel):
        return _admin_error('This module is not enabled for the hotel package.', 403)
    body = _json_body(request) if request.method != 'GET' else {}
    if module == 'menu_catalog':
        if request.method == 'GET':
            categories = MenuCategory.objects.filter(hotel=hotel).order_by('display_order', 'name')
            return JsonResponse({'ok': True, 'categories': [{'id': c.id, 'name': c.name, 'slug': c.slug, 'isActive': c.is_active, 'items': list(MenuItem.objects.filter(hotel=hotel, category=c).order_by('display_order', 'name').values('id', 'name', 'description', 'price', 'is_vegetarian', 'dietary_info', 'display_order', 'is_available'))} for c in categories]})
        category = MenuCategory.objects.filter(pk=body.get('categoryId'), hotel=hotel).first() if body.get('categoryId') else None
        if not category:
            category = MenuCategory.objects.create(hotel=hotel, name=str(body.get('categoryName', 'General')).strip() or 'General', slug=slugify(str(body.get('categoryName', 'general'))))
        item = MenuItem.objects.filter(pk=body.get('id'), hotel=hotel).first() if body.get('id') else MenuItem(hotel=hotel, category=category)
        item.category = category; item.name = str(body.get('name', item.name if item.pk else '')).strip(); item.description = str(body.get('description', '')).strip(); item.price = body.get('price', item.price if item.pk else '0'); item.is_vegetarian = bool(body.get('isVegetarian', False)); item.dietary_info = str(body.get('dietaryInfo', '')).strip(); item.is_available = bool(body.get('isAvailable', True))
        if not item.name: return _admin_error('Menu item name is required.', 400)
        try: item.full_clean(); item.save()
        except ValidationError as error: return _admin_error('; '.join(sum(error.message_dict.values(), [])), 400)
        return JsonResponse({'ok': True, 'item': {'id': item.id, 'name': item.name, 'price': str(item.price), 'isAvailable': item.is_available}}, status=201 if request.method == 'POST' else 200)
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'categories': list(ServiceCategory.objects.filter(hotel=hotel).order_by('display_order', 'name').values('id', 'name', 'slug', 'description', 'icon_identifier', 'is_active')), 'services': list(HotelService.objects.filter(hotel=hotel).order_by('display_order', 'name').values('id', 'category_id', 'name', 'short_description', 'description', 'icon_identifier', 'price', 'availability', 'estimated_completion_minutes', 'allows_guest_note', 'is_active'))})
    category = ServiceCategory.objects.filter(pk=body.get('categoryId'), hotel=hotel).first() if body.get('categoryId') else None
    if not category:
        category = ServiceCategory.objects.create(hotel=hotel, name=str(body.get('categoryName', 'General')).strip() or 'General', slug=slugify(str(body.get('categoryName', 'general'))))
    service = HotelService.objects.filter(pk=body.get('id'), hotel=hotel).first() if body.get('id') else HotelService(hotel=hotel, category=category)
    service.category = category; service.name = str(body.get('name', service.name if service.pk else '')).strip(); service.short_description = str(body.get('shortDescription', '')).strip(); service.description = str(body.get('description', '')).strip(); service.icon_identifier = str(body.get('iconIdentifier', '')).strip(); service.price = body.get('price') or None; service.availability = str(body.get('availability', '')).strip(); service.estimated_completion_minutes = body.get('estimatedCompletionMinutes') or None; service.allows_guest_note = bool(body.get('allowsGuestNote', True)); service.is_active = bool(body.get('isActive', True))
    if not service.name: return _admin_error('Service name is required.', 400)
    try: service.full_clean(); service.save()
    except ValidationError as error: return _admin_error('; '.join(sum(error.message_dict.values(), [])), 400)
    return JsonResponse({'ok': True, 'service': {'id': service.id, 'name': service.name, 'isActive': service.is_active}}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['POST'])
def hotel_touchpoint_api(request, hotel_id):
    denied = _require_authenticated(request)
    if denied:
        return denied
    hotel, denied = _resolve_authorized_hotel(request, hotel_id)
    if denied:
        return denied
    if not hotel:
        return _admin_error('Hotel not found.', 404)
    body = _json_body(request)
    if not isinstance(body, dict) or not str(body.get('label', '')).strip():
        return _admin_error('Touchpoint label is required.', 400)
    room = None
    if body.get('roomId'):
        room = Room.objects.filter(pk=body['roomId'], hotel=hotel).first()
        if not room:
            return _admin_error('Room does not belong to this hotel.', 400)
    touchpoint = NfcTouchpoint.objects.create(
        hotel=hotel,
        room=room,
        label=str(body['label']).strip(),
        touchpoint_type=str(body.get('type', 'general')).strip() or 'general',
        is_active=bool(body.get('isActive', True)),
    )
    return JsonResponse({'ok': True, 'publicIdentifier': touchpoint.public_identifier, 'guestUrl': f'/guest/{touchpoint.public_identifier}'}, status=201)
