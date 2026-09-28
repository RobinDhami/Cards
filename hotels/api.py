import json
import secrets
import hashlib
import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .models import AnalyticsEvent, GuestAccessSession, GuestReview, GuestStay, HotelService, NfcTouchpoint, ServiceRequest
from .services import create_guest_access_session, create_order, get_hotel_features, hotel_capabilities, verify_guest_access_code
from .entitlements import hotel_allows


MAX_BODY_BYTES = 32 * 1024
RATE_LIMITS = {'service-request': (10, 300), 'order': (10, 300), 'review': (10, 300), 'analytics': (30, 300), 'access-activate': (5, 300)}
GUEST_ACCESS_COOKIE = 'hotel_guest_access'


def _error(message, status):
    return JsonResponse({'ok': False, 'message': message}, status=status)


def _json_body(request):
    if int(request.META.get('CONTENT_LENGTH') or 0) > MAX_BODY_BYTES:
        raise ValueError('Request body is too large.')
    try:
        value = json.loads(request.body.decode('utf-8') or '{}')
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValueError('Malformed JSON.')
    if not isinstance(value, dict):
        raise ValueError('JSON body must be an object.')
    return value


def _order_payload(order):
    return {'orderNumber': order.order_number, 'status': order.status, 'currency': order.hotel.currency, 'subtotal': str(order.subtotal), 'serviceCharge': str(order.service_charge), 'tax': str(order.tax), 'total': str(order.total), 'createdAt': order.created_at.isoformat(), 'roomLabel': order.room.identifier if order.room_id else '', 'items': [{'name': item.item_name_snapshot, 'quantity': item.quantity, 'unitPrice': str(item.unit_price_snapshot), 'lineTotal': str(item.line_total), 'instructions': item.instructions} for item in order.items.all()]}


def _service_request_payload(request_record):
    return {'requestReference': request_record.public_identifier, 'serviceName': request_record.service_name_snapshot or request_record.service.name, 'serviceIdentifier': request_record.service.public_identifier, 'quantity': request_record.quantity, 'guestNote': request_record.guest_note, 'requestedAt': request_record.requested_at.isoformat(), 'status': request_record.status, 'createdAt': request_record.created_at.isoformat(), 'estimatedCompletionMinutes': request_record.service.estimated_completion_minutes}


def _rate_limited(request, action):
    limit, window = RATE_LIMITS[action]
    key = f'hotel-api:{action}:{request.META.get("REMOTE_ADDR", "unknown")}'
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, window)
    return False


def _file_url(request, field):
    if not field:
        return ''
    url = field.url
    return request.build_absolute_uri(url) if request else url


def _offer_payload(request, offer):
    return {'title': offer.title, 'shortDescription': offer.short_description, 'description': offer.description, 'image': _file_url(request, offer.image), 'buttonLabel': offer.button_label, 'destinationUrl': offer.destination_url, 'startsAt': offer.starts_at.isoformat() if offer.starts_at else '', 'endsAt': offer.ends_at.isoformat() if offer.ends_at else ''}


def _link_payload(link):
    return {'type': link.link_type, 'label': link.label, 'value': link.value, 'displayOrder': link.display_order}


def _active_offer(hotel):
    now = timezone.now()
    return hotel.offers.filter(is_active=True).filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now)).filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now)).order_by('display_order', 'id').first()


def _active_offers(hotel):
    now = timezone.now()
    return hotel.offers.filter(is_active=True).filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now)).filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now)).order_by('display_order', 'id')


def _touchpoint(identifier):
    return NfcTouchpoint.objects.select_related('hotel', 'room').filter(public_identifier=identifier, is_active=True, hotel__is_active=True).first()


def _touchpoint_context(touchpoint):
    return {'type': touchpoint.touchpoint_type, 'isRoomAssociated': bool(touchpoint.room_id), 'requiresGuestAuthorization': get_hotel_features(touchpoint.hotel).guest_access_enabled}


def _guest_cookie_path(public_identifier):
    return f'/api/hotels/guest/{public_identifier}/'


def _guest_session(request, touchpoint=None):
    raw = request.COOKIES.get(GUEST_ACCESS_COOKIE, '').strip()
    if not raw or len(raw) > 256:
        return None
    session = GuestAccessSession.objects.select_related('stay', 'stay__hotel', 'stay__room').filter(token_hash=GuestAccessSession.hash_token(raw)).first()
    if not session or not secrets.compare_digest(session.token_hash, GuestAccessSession.hash_token(raw)) or not session.is_active():
        return None
    if touchpoint and (touchpoint.hotel_id != session.stay.hotel_id or not touchpoint.room_id or touchpoint.room_id != session.stay.room_id):
        return None
    session.last_used_at = timezone.now()
    session.save(update_fields=['last_used_at'])
    return session


def _guest_stay(request, touchpoint=None):
    session = _guest_session(request, touchpoint)
    if session:
        return session.stay, None
    # Compatibility for existing non-browser clients. New guest clients use the HttpOnly cookie session.
    raw = request.headers.get('X-Guest-Token', '').strip()
    if not raw or len(raw) > 256:
        return None, _error('Valid guest authorization is required.', 401)
    digest = GuestStay.hash_token(raw)
    stay = GuestStay.objects.select_related('hotel', 'room').filter(access_token_hash=digest).first()
    if not stay or not stay.matches_token(raw):
        return None, _error('Valid guest authorization is required.', 401)
    if stay.status != 'active' or stay.token_expires_at <= timezone.now():
        return None, _error('Guest authorization has expired or is inactive.', 401)
    if touchpoint and (touchpoint.hotel_id != stay.hotel_id or (touchpoint.room_id and touchpoint.room_id != stay.room_id)):
        return None, _error('Guest authorization does not match this touchpoint.', 403)
    return stay, None


def _set_guest_cookie(response, public_identifier, raw_token, expires_at):
    max_age = max(0, int((expires_at - timezone.now()).total_seconds()))
    response.set_cookie(GUEST_ACCESS_COOKIE, raw_token, max_age=max_age, httponly=True, secure=settings.SESSION_COOKIE_SECURE, samesite=settings.SESSION_COOKIE_SAMESITE, path=_guest_cookie_path(public_identifier))


def _clear_guest_cookie(response, public_identifier):
    response.delete_cookie(GUEST_ACCESS_COOKIE, path=_guest_cookie_path(public_identifier), samesite=settings.SESSION_COOKIE_SAMESITE)


@require_http_methods(['POST'])
def activate_guest_access(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint or not touchpoint.room_id:
        return _error('Room access could not be verified.', 401)
    if not hotel_allows(touchpoint.hotel, 'guest_access') or not get_hotel_features(touchpoint.hotel).guest_access_enabled:
        return _error('Guest access is not available.', 403)
    if _rate_limited(request, 'access-activate'):
        return _error('Too many verification attempts. Try again later.', 429)
    lock_key = f'hotel-api:access-lock:{public_identifier}:{request.META.get("REMOTE_ADDR", "unknown")}'
    if cache.get(lock_key):
        return _error('Too many verification attempts. Try again later.', 429)
    try:
        data = _json_body(request)
        code = str(data.get('accessCode') or '').strip()
    except ValueError:
        return _error('Room access could not be verified.', 401)
    now = timezone.now()
    stay = GuestStay.objects.select_related('hotel', 'room').filter(hotel=touchpoint.hotel, room=touchpoint.room, status='active', check_in_at__lte=now, token_expires_at__gt=now, access_code_expires_at__gt=now).filter(Q(check_out_at__isnull=True) | Q(check_out_at__gt=now)).order_by('-check_in_at').first()
    if not stay or len(code) != 6 or not code.isdigit() or not verify_guest_access_code(stay, code):
        failures_key = f'hotel-api:access-failures:{public_identifier}:{request.META.get("REMOTE_ADDR", "unknown")}'
        failures = cache.get(failures_key, 0) + 1
        cache.set(failures_key, failures, 900)
        if failures >= 5:
            cache.set(lock_key, True, 900)
        return _error('Room access could not be verified.', 401)
    cache.delete(f'hotel-api:access-failures:{public_identifier}:{request.META.get("REMOTE_ADDR", "unknown")}')
    session, raw_token = create_guest_access_session(stay)
    response = JsonResponse({'ok': True, 'verified': True, 'roomLabel': stay.room.identifier, 'sessionExpiresAt': session.expires_at.isoformat(), 'canOrder': True, 'canRequestService': True})
    _set_guest_cookie(response, public_identifier, raw_token, session.expires_at)
    return response


@require_http_methods(['GET'])
def guest_access_status(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    if not get_hotel_features(touchpoint.hotel).guest_access_enabled:
        return JsonResponse({'ok': True, 'verified': False, 'canOrder': False, 'canRequestService': False})
    session = _guest_session(request, touchpoint)
    if not session:
        return JsonResponse({'ok': True, 'verified': False, 'canOrder': False, 'canRequestService': False})
    return JsonResponse({'ok': True, 'verified': True, 'roomLabel': session.stay.room.identifier, 'sessionExpiresAt': session.expires_at.isoformat(), 'canOrder': True, 'canRequestService': True})


@require_http_methods(['POST'])
def logout_guest_access(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    response = JsonResponse({'ok': True, 'verified': False})
    if touchpoint:
        raw = request.COOKIES.get(GUEST_ACCESS_COOKIE, '').strip()
        if raw:
            GuestAccessSession.objects.filter(token_hash=GuestAccessSession.hash_token(raw), stay__hotel=touchpoint.hotel).update(revoked_at=timezone.now())
        _clear_guest_cookie(response, public_identifier)
    return response


def _public_hotel_payload(request, hotel, touchpoint):
    features = hotel_capabilities(hotel)
    theme = getattr(hotel, 'theme', None)
    offer = _active_offer(hotel)
    links = hotel.links.filter(is_active=True).order_by('display_order', 'id')
    return {'hotel': {'name': hotel.name, 'slug': hotel.slug, 'logo': _file_url(request, hotel.logo), 'heroImage': _file_url(request, hotel.cover_image), 'shortDescription': hotel.short_description, 'phone': hotel.phone, 'whatsapp': hotel.whatsapp, 'address': hotel.address, 'mapUrl': hotel.google_maps_url, 'googleReviewUrl': hotel.google_review_url, 'checkInTime': hotel.check_in_time.isoformat() if hotel.check_in_time else '', 'checkOutTime': hotel.check_out_time.isoformat() if hotel.check_out_time else ''}, 'theme': {'templateIdentifier': theme.template_identifier, 'primaryColor': theme.primary_color, 'backgroundColor': theme.background_color, 'textColor': theme.text_color, 'secondaryColor': theme.secondary_color, 'headingFont': theme.heading_font, 'bodyFont': theme.body_font, 'cardRadius': theme.card_radius, 'buttonRadius': theme.button_radius} if theme else {}, 'offer': _offer_payload(request, offer) if offer and features['offersVisible'] else None, 'links': [_link_payload(link) for link in links] if features['contactLinksVisible'] else [], 'touchpoint': _touchpoint_context(touchpoint), 'capabilities': features}


@require_http_methods(['GET'])
def resolve_guest_experience(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    return JsonResponse({'ok': True, 'experience': _public_hotel_payload(request, touchpoint.hotel, touchpoint)})


@require_http_methods(['GET'])
def guest_services(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    features = hotel_capabilities(touchpoint.hotel)
    if not features['servicesVisible']:
        return JsonResponse({'ok': True, 'currency': touchpoint.hotel.currency, 'capabilities': features, 'whatsapp': touchpoint.hotel.whatsapp, 'categories': []})
    categories = touchpoint.hotel.service_categories.filter(is_active=True).prefetch_related('services').order_by('display_order', 'name')
    payload = []
    for category in categories:
        services = category.services.filter(is_active=True).order_by('display_order', 'name')
        payload.append({'name': category.name, 'slug': category.slug, 'description': category.description, 'displayOrder': category.display_order, 'services': [{'identifier': service.public_identifier, 'name': service.name, 'shortDescription': service.short_description, 'description': service.description, 'iconIdentifier': service.icon_identifier, 'image': _file_url(request, service.image), 'price': str(service.price) if service.price is not None else None, 'availability': service.availability, 'estimatedCompletionMinutes': service.estimated_completion_minutes, 'allowsGuestNote': service.allows_guest_note, 'displayOrder': service.display_order} for service in services]})
    return JsonResponse({'ok': True, 'currency': touchpoint.hotel.currency, 'capabilities': features, 'whatsapp': touchpoint.hotel.whatsapp, 'categories': payload})


@require_http_methods(['GET'])
def guest_menu(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    features = hotel_capabilities(touchpoint.hotel)
    if not features['menuVisible']:
        return JsonResponse({'ok': True, 'currency': touchpoint.hotel.currency, 'capabilities': features, 'categories': []})
    categories = touchpoint.hotel.menu_categories.filter(is_active=True).prefetch_related('items').order_by('display_order', 'name')
    payload = []
    for category in categories:
        items = category.items.filter(is_available=True).order_by('display_order', 'name')
        payload.append({'name': category.name, 'slug': category.slug, 'description': category.description, 'displayOrder': category.display_order, 'items': [{'identifier': item.public_identifier, 'name': item.name, 'description': item.description, 'image': _file_url(request, item.image), 'price': str(item.price), 'isVegetarian': item.is_vegetarian, 'dietaryInfo': item.dietary_info, 'displayOrder': item.display_order} for item in items]})
    return JsonResponse({'ok': True, 'currency': touchpoint.hotel.currency, 'capabilities': features, 'categories': payload})


@require_http_methods(['GET'])
def guest_offers(request, public_identifier):
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    offers = _active_offers(touchpoint.hotel)
    links = touchpoint.hotel.links.filter(is_active=True).order_by('display_order', 'id')
    return JsonResponse({'ok': True, 'offers': [_offer_payload(request, offer) for offer in offers], 'links': [_link_payload(link) for link in links]})


@require_http_methods(['POST'])
def create_guest_service_request(request, public_identifier):
    if _rate_limited(request, 'service-request'):
        return _error('Too many requests. Try again later.', 429)
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    features = get_hotel_features(touchpoint.hotel)
    if not hotel_allows(touchpoint.hotel, 'service_requests') or not features.services_visible or features.service_mode != features.SERVICE_DIGITAL_REQUEST or not features.guest_access_enabled:
        return _error('Digital service requests are not available.', 403)
    stay, error = _guest_stay(request, touchpoint)
    if error:
        return error
    idempotency_key = request.headers.get('Idempotency-Key', '').strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,64}', idempotency_key):
        return _error('A valid idempotency key is required.', 400)
    try:
        data = _json_body(request)
        identifier = str(data.get('serviceIdentifier') or '').strip()
        quantity = int(data.get('quantity', 1))
        note = str(data.get('guestNote') or '')
        requested_time_value = data.get('requestedTime')
        if requested_time_value:
            raise ValueError('Requested time is not enabled for this service.')
        requested_at = timezone.now()
        if not identifier or quantity < 1 or quantity > 50 or len(note) > 1000:
            raise ValueError('Invalid service request fields.')
        service = HotelService.objects.filter(hotel=stay.hotel, public_identifier=identifier, is_active=True).first()
        if not service:
            return _error('Service not found.', 404)
        if note and not service.allows_guest_note:
            return _error('Notes are not allowed for this service.', 400)
        canonical_payload = {'serviceIdentifier': identifier, 'quantity': quantity, 'guestNote': note, 'requestedTime': requested_at.isoformat() if requested_time_value else ''}
        payload_hash = hashlib.sha256(json.dumps(canonical_payload, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
        existing = stay.service_requests.filter(idempotency_key=idempotency_key).select_related('service').first()
        if existing:
            if existing.idempotency_payload_hash != payload_hash:
                return _error('This idempotency key was already used for a different request.', 409)
            return JsonResponse({'ok': True, 'request': _service_request_payload(existing), 'idempotentReplay': True})
        try:
            with transaction.atomic():
                from .services import create_service_request
                request_record = create_service_request(hotel=stay.hotel, room=stay.room, guest_stay=stay, service=service, quantity=quantity, guest_note=note, requested_at=requested_at, idempotency_key=idempotency_key, idempotency_payload_hash=payload_hash)
        except IntegrityError:
            existing = stay.service_requests.filter(idempotency_key=idempotency_key).select_related('service').first()
            if not existing or existing.idempotency_payload_hash != payload_hash:
                return _error('The request could not be safely repeated.', 409)
            return JsonResponse({'ok': True, 'request': _service_request_payload(existing), 'idempotentReplay': True})
    except (ValueError, ValidationError, TypeError, KeyError):
        return _error('Invalid service request.', 400)
    try:
        AnalyticsEvent.objects.create(hotel=stay.hotel, room=stay.room, guest_stay=stay, event_type='service_request_submitted', metadata={'service_id': service.public_identifier, 'item_id': request_record.public_identifier})
    except ValidationError:
        pass
    return JsonResponse({'ok': True, 'request': _service_request_payload(request_record)}, status=201)


@require_http_methods(['POST'])
def create_guest_order(request, public_identifier):
    if _rate_limited(request, 'order'):
        return _error('Too many requests. Try again later.', 429)
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    features = get_hotel_features(touchpoint.hotel)
    if not hotel_allows(touchpoint.hotel, 'orders') or not features.menu_visible or features.menu_mode != features.MENU_ORDERING or not features.guest_access_enabled:
        return _error('Room-service ordering is not available.', 403)
    stay, error = _guest_stay(request, touchpoint)
    if error:
        return error
    idempotency_key = request.headers.get('Idempotency-Key', '').strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,64}', idempotency_key):
        return _error('A valid idempotency key is required.', 400)
    try:
        data = _json_body(request)
        raw_items = data.get('items')
        instructions = str(data.get('guestInstructions') or '')
        if not isinstance(raw_items, list) or not raw_items or len(raw_items) > 50 or len(instructions) > 1000:
            raise ValueError('Invalid order fields.')
        canonical_items = []
        items = []
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                raise ValueError('Invalid order item.')
            identifier = str(raw_item.get('menuItemIdentifier') or '').strip()
            quantity = int(raw_item.get('quantity'))
            if not identifier or quantity < 1 or quantity > 50 or len(str(raw_item.get('instructions') or '')) > 500:
                raise ValueError('Invalid order item.')
            item_instructions = str(raw_item.get('instructions') or '')
            canonical_items.append({'menuItemIdentifier': identifier, 'quantity': quantity, 'instructions': item_instructions})
            from .models import MenuItem
            menu_item = MenuItem.objects.filter(hotel=stay.hotel, public_identifier=identifier, is_available=True).first()
            if not menu_item:
                return _error('Menu item not found or unavailable.', 404)
            items.append({'menu_item': menu_item, 'quantity': quantity, 'instructions': item_instructions})
        payload_hash = hashlib.sha256(json.dumps({'items': canonical_items, 'guestInstructions': instructions}, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
        existing = stay.orders.filter(idempotency_key=idempotency_key).prefetch_related('items').first()
        if existing:
            if existing.idempotency_payload_hash != payload_hash:
                return _error('This idempotency key was already used for a different order.', 409)
            return JsonResponse({'ok': True, 'order': _order_payload(existing), 'idempotentReplay': True})
        try:
            with transaction.atomic():
                order = create_order(hotel=stay.hotel, room=stay.room, guest_stay=stay, items=items, guest_instructions=instructions, idempotency_key=idempotency_key, idempotency_payload_hash=payload_hash)
        except IntegrityError:
            existing = stay.orders.filter(idempotency_key=idempotency_key).prefetch_related('items').first()
            if not existing or existing.idempotency_payload_hash != payload_hash:
                return _error('The order could not be safely repeated.', 409)
            return JsonResponse({'ok': True, 'order': _order_payload(existing), 'idempotentReplay': True})
    except (ValueError, ValidationError, TypeError, KeyError):
        return _error('Invalid order.', 400)
    try:
        AnalyticsEvent.objects.create(hotel=stay.hotel, room=stay.room, guest_stay=stay, event_type='order_submitted', metadata={'item_id': order.order_number, 'source': 'guest_checkout'})
    except ValidationError:
        pass
    return JsonResponse({'ok': True, 'order': _order_payload(order)}, status=201)


@require_http_methods(['POST'])
def create_guest_review(request, public_identifier):
    if _rate_limited(request, 'review'):
        return _error('Too many requests. Try again later.', 429)
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    stay, error = _guest_stay(request, touchpoint)
    if error:
        return error
    try:
        data = _json_body(request)
        rating = int(data.get('rating'))
        feedback = str(data.get('feedback') or '')
        if rating < 1 or rating > 5 or len(feedback) > 2000:
            raise ValueError('Invalid review.')
        review = GuestReview(hotel=stay.hotel, room=stay.room, guest_stay=stay, rating=rating, feedback=feedback)
        review.save()
    except (ValueError, ValidationError, TypeError):
        return _error('Invalid review.', 400)
    return JsonResponse({'ok': True, 'review': {'rating': review.rating}}, status=201)


@require_http_methods(['POST'])
def record_google_review_click(request, public_identifier):
    if _rate_limited(request, 'review'):
        return _error('Too many requests. Try again later.', 429)
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    stay, error = _guest_stay(request, touchpoint)
    if error:
        return error
    AnalyticsEvent.objects.create(hotel=stay.hotel, room=stay.room, guest_stay=stay, event_type='google_review_opened')
    return JsonResponse({'ok': True, 'reviewUrl': stay.hotel.google_review_url})


@require_http_methods(['POST'])
def record_guest_analytics(request, public_identifier):
    if _rate_limited(request, 'analytics'):
        return _error('Too many requests. Try again later.', 429)
    touchpoint = _touchpoint(public_identifier)
    if not touchpoint:
        return _error('Guest experience not found.', 404)
    try:
        data = _json_body(request)
        event_type = str(data.get('eventType') or '')
        metadata = data.get('metadata') or {}
        if event_type not in dict(AnalyticsEvent.EVENT_TYPES) or not isinstance(metadata, dict):
            raise ValueError('Invalid analytics event.')
        event = AnalyticsEvent(hotel=touchpoint.hotel, room=touchpoint.room, touchpoint=touchpoint, event_type=event_type, session_identifier=str(data.get('sessionIdentifier') or '')[:128], metadata=metadata)
        event.save()
    except (ValueError, ValidationError, TypeError):
        return _error('Invalid analytics event.', 400)
    return JsonResponse({'ok': True}, status=201)
