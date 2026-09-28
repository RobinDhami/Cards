from decimal import Decimal
import secrets
import uuid
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from .models import GuestAccessSession, GuestStay, Hotel, HotelFeatureSettings, HotelMembership, HotelOrder, HotelOrderItem, HotelService, ServiceRequest, MenuItem


def resolve_hotel_for_user(user, hotel_id):
    if not getattr(user, 'is_authenticated', False):
        raise PermissionDenied('Authentication is required.')
    membership = HotelMembership.objects.select_related('hotel').filter(
        user=user, hotel_id=hotel_id, is_active=True, hotel__is_active=True,
    ).first()
    if not membership:
        raise PermissionDenied('You do not have access to this hotel.')
    return membership.hotel


def get_hotel_features(hotel):
    settings, _ = HotelFeatureSettings.objects.get_or_create(hotel=hotel)
    return settings


def hotel_capabilities(hotel):
    settings = get_hotel_features(hotel)
    return {
        'menuVisible': settings.menu_visible,
        'menuMode': settings.menu_mode,
        'servicesVisible': settings.services_visible,
        'serviceMode': settings.service_mode,
        'offersVisible': settings.offers_visible,
        'reviewVisible': settings.review_visible,
        'contactLinksVisible': settings.contact_links_visible,
        'guestAccessEnabled': settings.guest_access_enabled,
    }


def issue_guest_access_code(stay, *, validity_seconds=1800):
    if not isinstance(stay, GuestStay):
        raise ValidationError('A guest stay is required.')
    now = timezone.now()
    code = f'{secrets.randbelow(1_000_000):06d}'
    stay.access_code_hash = make_password(code)
    stay.access_code_generated_at = now
    stay.access_code_expires_at = now + timedelta(seconds=validity_seconds)
    stay.access_code_version += 1
    stay.save(update_fields=['access_code_hash', 'access_code_generated_at', 'access_code_expires_at', 'access_code_version', 'updated_at'])
    GuestAccessSession.objects.filter(stay=stay, revoked_at__isnull=True).update(revoked_at=now)
    return code


def create_guest_access_session(stay, *, lifetime_seconds=3600):
    raw, digest = GuestAccessSession.issue_token()
    now = timezone.now()
    session = GuestAccessSession.objects.create(stay=stay, token_hash=digest, code_version=stay.access_code_version, expires_at=min(now + timedelta(seconds=lifetime_seconds), stay.check_out_at) if stay.check_out_at else now + timedelta(seconds=lifetime_seconds))
    return session, raw


def verify_guest_access_code(stay, code):
    now = timezone.now()
    return bool(stay.access_code_hash and stay.access_code_expires_at and stay.access_code_expires_at > now and check_password(code, stay.access_code_hash))


@transaction.atomic
def create_order(*, hotel, room, items, guest_stay=None, guest_instructions='', idempotency_key='', idempotency_payload_hash=''):
    if room.hotel_id != hotel.id or (guest_stay and guest_stay.hotel_id != hotel.id):
        raise ValidationError('Order relationships must belong to the same hotel.')
    if not items:
        raise ValidationError('An order requires at least one item.')
    subtotal = Decimal('0.00')
    order = HotelOrder.objects.create(
        hotel=hotel, room=room, guest_stay=guest_stay, idempotency_key=idempotency_key, idempotency_payload_hash=idempotency_payload_hash,
        order_number=f'ORD-{uuid.uuid4().hex[:16].upper()}',
        guest_instructions=guest_instructions,
        # Fees are deliberately calculated here, not accepted from a client.
        service_charge=Decimal('0.00'), tax=Decimal('0.00'),
    )
    for item in items:
        menu_item = item['menu_item']
        quantity = int(item['quantity'])
        if not isinstance(menu_item, MenuItem) or menu_item.hotel_id != hotel.id or not menu_item.is_available:
            raise ValidationError('Every menu item must be available and belong to the same hotel.')
        if quantity < 1:
            raise ValidationError('Item quantity must be positive.')
        line_total = menu_item.price * quantity
        subtotal += line_total
        order_item = HotelOrderItem(
            order=order, menu_item=menu_item, item_name_snapshot=menu_item.name,
            unit_price_snapshot=menu_item.price, quantity=quantity,
            instructions=item.get('instructions', ''), line_total=line_total,
        )
        order_item.full_clean()
        order_item.save()
    order.subtotal = subtotal
    order.total = subtotal + order.service_charge + order.tax
    order.save(update_fields=['subtotal', 'total'])
    return order


@transaction.atomic
def create_service_request(*, hotel, room, service, guest_stay=None, quantity=1, guest_note='', requested_at=None, idempotency_key='', idempotency_payload_hash=''):
    if not isinstance(service, HotelService) or service.hotel_id != hotel.id:
        raise ValidationError('The service must belong to the same hotel.')
    if room.hotel_id != hotel.id or (guest_stay and guest_stay.hotel_id != hotel.id):
        raise ValidationError('Service request relationships must belong to the same hotel.')
    if quantity < 1 or quantity > 50:
        raise ValidationError('Quantity must be between 1 and 50.')
    if not service.allows_guest_note and guest_note:
        raise ValidationError('Notes are not allowed for this service.')
    request_record = ServiceRequest(
        hotel=hotel, room=room, service=service, guest_stay=guest_stay,
        public_identifier=uuid.uuid4(), idempotency_key=idempotency_key,
        idempotency_payload_hash=idempotency_payload_hash,
        service_name_snapshot=service.name, quantity=quantity,
        guest_note=guest_note, requested_at=requested_at or timezone.now(),
    )
    request_record.full_clean()
    request_record.save()
    return request_record
