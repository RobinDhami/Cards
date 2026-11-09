import hashlib
import hmac
import json
import re
import secrets
from decimal import Decimal, InvalidOperation
from datetime import date, datetime, time, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.utils.text import slugify

from .models import (
    LoyaltyCustomer, VenueAnalyticsEvent, VenueCardAssignment, VenueFeedback,
    VenueLink, VenueLoyaltyMembership, VenueMenuCategory, VenueMenuItem,
    VenueMenuItemVariant, VenueOperationalActivity, VenueProfile, VenueRewardsProgram,
    VenueRewardsTransaction, VenueStaffLink,
    VenueStaffProfile, VenueTouchpoint, VenueOrder, VenueOrderItem, VenueWaiterCall,
)
from django.contrib.auth import authenticate, get_user_model, login
from vcards.models import CardBatchCard, College, OrganizationModuleAccess, OrganizationNotificationPreference, OrganizationServicePlan, OrganizationTeamMember
from vcards.organization_access import (
    MODULE_CAPABILITIES, ROLE_CAPABILITIES, accessible_organizations, can_access_organization,
    effective_capabilities, enabled_organization_modules, ensure_organization_modules,
    ensure_organization_owner, organization_role,
)


def _body(request):
    try:
        return json.loads(request.body or '{}')
    except (TypeError, ValueError):
        return None


def _authorized(request, organization_id, capability='overview'):
    organization = College.objects.filter(pk=organization_id).first()
    return bool(organization and can_access_organization(request.user, organization, capability))


def _safe_url(value):
    if not value:
        return value
    parsed = urlparse(value)
    if parsed.scheme and parsed.scheme.lower() not in {'http', 'https', 'mailto', 'tel'}:
        raise ValidationError('Only safe web, mail and telephone links are allowed.')
    return value


def _web_url(value, label='Link'):
    value = str(value or '').strip()
    if not value:
        return value
    parsed = urlparse(value)
    if parsed.scheme.lower() not in {'http', 'https'} or not parsed.netloc:
        raise ValidationError(f'{label} must be a complete http or https URL.')
    return value


def _json_field(data, key, default):
    value = data.get(key, default)
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            raise ValidationError(f'{key.replace("_", " ").title()} is invalid.')
    return value


def _validate_schedule(value):
    if not isinstance(value, dict):
        raise ValidationError('Opening hours are invalid.')
    allowed_days = {'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'}
    result = {}
    for day, settings in value.items():
        if day not in allowed_days or not isinstance(settings, dict):
            raise ValidationError('Opening hours contain an invalid day.')
        closed = bool(settings.get('closed', False))
        intervals = settings.get('intervals', [])
        if not isinstance(intervals, list) or len(intervals) > 4:
            raise ValidationError('Each day can have up to four opening intervals.')
        clean_intervals = []
        for interval in intervals:
            if not isinstance(interval, dict):
                raise ValidationError('Opening interval is invalid.')
            start, end = str(interval.get('start', '')), str(interval.get('end', ''))
            if len(start) != 5 or len(end) != 5 or start >= end:
                raise ValidationError('Opening times must have a start before the end.')
            clean_intervals.append({'start': start, 'end': end})
        result[day] = {'closed': closed, 'intervals': [] if closed else clean_intervals}
    return result


def _source_conflicts(venue):
    organization = venue.organization
    comparisons = [
        ('description', venue.description, organization.description),
        ('logo', getattr(venue.logo, 'name', ''), getattr(organization.logo, 'name', '')),
        ('cover', getattr(venue.cover_image, 'name', ''), getattr(organization.cover_photo, 'name', '')),
        ('primary colour', venue.primary_color, organization.theme_primary),
        ('accent colour', venue.secondary_color, organization.theme_ternary),
    ]
    conflicts = [label for label, public_value, legacy_value in comparisons if public_value and legacy_value and public_value != legacy_value]
    link_values = {link.link_type: link.value for link in venue.links.all()}
    for link_type, field in {'facebook': 'facebook', 'instagram': 'instagram', 'linkedin': 'linkedin', 'x': 'twitter'}.items():
        public_value, legacy_value = link_values.get(link_type), getattr(organization, field, '')
        if public_value and legacy_value and public_value != legacy_value:
            conflicts.append(f'{link_type} link')
    return conflicts


def _management_links(venue):
    links = list(venue.links.order_by('display_order', 'id').values('id', 'link_type', 'label', 'value', 'icon', 'display_order', 'is_active'))
    existing = {link['link_type'] for link in links}
    legacy = [('facebook', 'Facebook', venue.organization.facebook), ('instagram', 'Instagram', venue.organization.instagram), ('linkedin', 'LinkedIn', venue.organization.linkedin), ('x', 'X', venue.organization.twitter)]
    for link_type, label, value in legacy:
        if value and link_type not in existing:
            links.append({'id': 0, 'link_type': link_type, 'label': label, 'value': value, 'icon': '', 'display_order': len(links), 'is_active': True, 'legacy': True})
    return links


def _file_url(request, field):
    if not field:
        return None
    url = field.url
    return request.build_absolute_uri(url) if request else url


def _venue_timezone(venue):
    try:
        return ZoneInfo(venue.timezone or 'Asia/Kathmandu')
    except ZoneInfoNotFoundError:
        return ZoneInfo('Asia/Kathmandu')


def _tracking_context(request, source=None, entry=None):
    source = source if source is not None else request.GET.get('source')
    entry = entry if entry is not None else request.GET.get('entry')
    source = re.sub(r'[^a-zA-Z0-9_-]', '', str(source or ''))[:64]
    entry = str(entry or '') if entry in {'qr', 'nfc'} else ''
    return source, entry


def _event_target(destination='', source='', entry='', detail=''):
    """Stable, compact tracking target. Older free-text targets stay readable."""
    parts = []
    if destination:
        parts.append(f'destination:{str(destination)[:64]}')
    if detail:
        parts.append(f'detail:{str(detail)[:64]}')
    if source:
        parts.append(f'source:{str(source)[:64]}')
    if entry:
        parts.append(f'entry:{str(entry)[:8]}')
    return '|'.join(parts)[:160]


def _target_parts(target):
    parts = {}
    for piece in str(target or '').split('|'):
        key, separator, value = piece.partition(':')
        if separator and key in {'destination', 'detail', 'source', 'entry'}:
            parts[key] = value
    return parts


def _visitor_hash(request, venue):
    raw = f'{venue.pk}:{request.META.get("REMOTE_ADDR", "")}:{request.META.get("HTTP_USER_AGENT", "")}'
    return hmac.new(settings.SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()


def _normalize_loyalty_phone(value):
    """Use one canonical form so the same customer cannot join twice."""
    raw = str(value or '').strip()
    digits = re.sub(r'\D', '', raw)
    if len(digits) == 10 and digits.startswith('9'):
        return f'+977{digits}'
    if digits.startswith('977') and len(digits) == 13 and digits[3] == '9':
        return f'+{digits}'
    if raw.startswith('+') and 8 <= len(digits) <= 15:
        return f'+{digits}'
    raise ValidationError('Enter a valid mobile number, including the country code if it is not a Nepali number.')


def _loyalty_membership_payload(membership):
    return {
        'memberId': membership.public_identifier,
        'stampCount': membership.stamp_count,
        'stampGoal': membership.stamp_goal,
        'rewardsRedeemed': membership.rewards_redeemed,
        'rewardBalance': str(membership.reward_balance),
        'isActive': membership.is_active,
    }


def _rewards_program_payload(program):
    return {
        'isActive': program.is_active,
        'programType': program.program_type,
        'rewardRatePercent': str(program.reward_rate_percent),
        'minimumOrderAmount': str(program.minimum_order_amount),
        'maxRedemptionPercent': str(program.max_redemption_percent),
        'rewardLabel': program.reward_label,
        'pointsPerCurrency': str(program.points_per_currency),
        'pointsToReward': program.points_to_reward,
        'stampGoal': program.stamp_goal,
        'stampRewardLabel': program.stamp_reward_label,
        'expiryDays': program.expiry_days,
    }


def _record_operational_activity(venue, event_type, summary, request=None, details=None):
    """Keep business changes separate from public engagement analytics."""
    VenueOperationalActivity.objects.create(
        venue=venue,
        event_type=str(event_type)[:48],
        summary=str(summary)[:240],
        details=details or {},
        actor=request.user if request and request.user.is_authenticated else None,
    )


def _expire_rewards_if_needed(membership, program):
    if program.program_type == 'stamps':
        return False
    if not program.expiry_days or not membership.reward_balance or not membership.last_activity_at:
        return False
    if membership.last_activity_at > timezone.now() - timedelta(days=program.expiry_days):
        return False
    amount = membership.reward_balance
    membership.reward_balance = Decimal('0.00')
    membership.save(update_fields=['reward_balance', 'updated_at'])
    VenueRewardsTransaction.objects.create(
        venue=membership.venue, membership=membership,
        transaction_type=VenueRewardsTransaction.EXPIRE,
        reward_amount=-amount, balance_after=Decimal('0.00'),
    )
    _record_operational_activity(membership.venue, 'rewards_expired', f'Rewards expired for {membership.customer.phone_e164}', details={'amount': str(amount)})
    return True


def _membership_payload(membership, program):
    expires_at = None
    if program.expiry_days and membership.last_activity_at and membership.reward_balance:
        expires_at = membership.last_activity_at + timedelta(days=program.expiry_days)
    return {
        'memberId': membership.public_identifier,
        'name': membership.customer.full_name,
        'phone': membership.customer.phone_e164,
        'rewardBalance': str(membership.reward_balance),
        'stampCount': membership.stamp_count,
        'stampGoal': membership.stamp_goal or program.stamp_goal,
        'rewardsRedeemed': membership.rewards_redeemed,
        'lifetimeEarned': str(membership.lifetime_rewards_earned),
        'lifetimeRedeemed': str(membership.lifetime_rewards_redeemed),
        'lastActivityAt': membership.last_activity_at.isoformat() if membership.last_activity_at else None,
        'expiresAt': expires_at.isoformat() if expires_at else None,
        'isActive': membership.is_active,
    }


def _record_event(request, venue, event_type, target='', dedupe_seconds=3):
    if event_type not in dict(VenueAnalyticsEvent.EVENT_TYPES):
        return False
    safe_target = str(target or '').strip()[:160]
    visitor_hash = _visitor_hash(request, venue)
    if dedupe_seconds:
        timeout = 30 if event_type == 'profile_view' else dedupe_seconds
        cache_key = f'venue-event:{venue.pk}:{event_type}:{visitor_hash}:{safe_target}'
        if not cache.add(cache_key, True, timeout):
            return False
    VenueAnalyticsEvent.objects.create(
        venue=venue, event_type=event_type, target=safe_target,
        visitor_hash=visitor_hash,
    )
    return True


def _payload(request, venue):
    enabled_modules = enabled_organization_modules(venue.organization)
    categories = []
    # Ordering uses the same customer menu as the public profile. A café can
    # sell table ordering without separately exposing the menu-management module.
    for category in (venue.menu_categories.filter(is_active=True) if {'menu', 'ordering'} & enabled_modules else []):
        items = [{
            'id': str(item.public_identifier), 'name': item.name,
            'description': item.description, 'image': _file_url(request, item.image),
            'price': str(item.price), 'originalPrice': str(item.original_price) if item.original_price is not None else '', 'offerLabel': item.offer_label, 'dietaryInfo': item.dietary_info,
            'isVegetarian': item.is_vegetarian, 'isAvailable': item.is_available,
            'addOns': item.add_ons, 'spiceLevels': item.spice_levels,
            'isTodaySpecial': _timed_attribute_active(item.is_today_special, item.special_starts_at, item.special_ends_at),
            'isOffer': _timed_attribute_active(item.is_offer, item.offer_starts_at, item.offer_ends_at),
            'priceVariants': [{'label': variant.label, 'price': str(variant.price)} for variant in item.price_variants.all()],
        } for item in category.items.filter(is_published=True, is_available=True).prefetch_related('price_variants')]
        if items:
            categories.append({'name': category.name, 'slug': category.slug, 'items': items})
    program = VenueRewardsProgram.objects.filter(venue=venue).first()
    return {
        'organization': {'id': venue.organization_id, 'name': venue.organization.name, 'slogan': venue.organization.slogan or ''},
        'venue': {'publicIdentifier': venue.public_identifier, 'type': venue.venue_type, 'description': venue.description or venue.organization.description or '',
                  'logo': _file_url(request, venue.logo or venue.organization.logo), 'coverImage': _file_url(request, venue.cover_image or venue.organization.cover_photo),
                  'primaryColor': venue.primary_color, 'secondaryColor': venue.secondary_color,
                  'phone': venue.organization.phone or '', 'whatsapp': venue.whatsapp, 'email': venue.organization.email or '',
                  'website': venue.organization.website or '', 'address': venue.organization.address or '',
                  'mapUrl': venue.organization.map_url or '', 'googleReviewUrl': venue.google_review_url,
                  'reservationUrl': venue.reservation_url, 'openingHours': venue.opening_hours,
                  'openingSchedule': venue.opening_schedule, 'whatsappSameAsPhone': venue.whatsapp_same_as_phone},
        'links': list(venue.links.filter(is_active=True).order_by('display_order', 'id').values('id', 'link_type', 'label', 'value', 'icon', 'display_order', 'is_active')),
        'rating': {'average': venue.feedback.aggregate(average=Avg('rating'))['average'] or 0, 'count': venue.feedback.count()},
        'categories': categories, 'feedbackEnabled': bool(venue.feedback_enabled and 'feedback' in enabled_modules),
        'loyalty': {
            'enabled': bool('loyalty' in enabled_modules and program and program.is_active and venue.venue_type in {'cafe', 'restaurant'}),
            'programName': program.reward_label if program and program.program_type != 'stamps' else (program.stamp_reward_label if program else f'{venue.organization.name} Rewards'),
            'programType': program.program_type if program else 'rewards',
            'stampGoal': program.stamp_goal if program else 5,
            'pointsToReward': program.points_to_reward if program else 100,
            'pointsPerCurrency': str(program.points_per_currency) if program else '1.00',
        },
        'ordering': {'enabled': 'ordering' in enabled_modules},
    }


@require_http_methods(['GET'])
def venue_public_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    source, entry = _tracking_context(request)
    # Dashboard previews are authenticated and deliberately marked by the UI.
    if not (request.user.is_authenticated and request.GET.get('preview') == 'dashboard'):
        _record_event(request, venue, 'profile_view', _event_target('profile', source, entry))
    return JsonResponse(_payload(request, venue))


@require_http_methods(['POST'])
def venue_track_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile, public_identifier=public_identifier, is_active=True)
    data = _body(request)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    event_type = str(data.get('eventType') or '')
    if event_type not in dict(VenueAnalyticsEvent.EVENT_TYPES) or event_type in {'profile_view', 'feedback_submit'}:
        return JsonResponse({'error': 'Invalid event type.'}, status=400)
    source, entry = _tracking_context(request, data.get('source'), data.get('entry'))
    recorded = _record_event(request, venue, event_type, _event_target(
        data.get('destination') or data.get('target'), source, entry, data.get('detail')
    ))
    return JsonResponse({'ok': True, 'recorded': recorded}, status=201)


@require_http_methods(['POST'])
def venue_feedback_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile, public_identifier=public_identifier, is_active=True, feedback_enabled=True)
    if 'feedback' not in enabled_organization_modules(venue.organization):
        return JsonResponse({'error': 'Feedback is not available for this business.'}, status=404)
    data = _body(request)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    try:
        rating = int(data.get('rating'))
    except (TypeError, ValueError):
        rating = 0
    comment = str(data.get('comment') or '').strip()
    if rating not in range(1, 6) or len(comment) > 2000:
        return JsonResponse({'error': 'Rating must be 1-5 and comment must be at most 2000 characters.'}, status=400)
    # A hidden honeypot catches simple form bots without affecting real customers.
    if str(data.get('company_website') or '').strip():
        return JsonResponse({'ok': True}, status=201)
    share_contact = bool(data.get('shareContact'))
    contact_name = str(data.get('contactName') or '').strip()[:120] if share_contact else ''
    contact_email = str(data.get('contactEmail') or '').strip() if share_contact else ''
    contact_phone = str(data.get('contactPhone') or '').strip()[:40] if share_contact else ''
    if contact_email:
        try:
            validate_email(contact_email)
        except ValidationError:
            return JsonResponse({'error': 'Enter a valid contact email address.'}, status=400)
    if contact_phone and (len(re.sub(r'\D', '', contact_phone)) < 7 or len(re.sub(r'\D', '', contact_phone)) > 18):
        return JsonResponse({'error': 'Enter a valid contact phone number.'}, status=400)
    touchpoint_source = re.sub(r'[^a-zA-Z0-9_:-]', '', str(data.get('source') or 'public_profile'))[:80] or 'public_profile'
    fingerprint = hashlib.sha256(f'{venue.pk}:{request.META.get("REMOTE_ADDR", "")}'.encode()).hexdigest()
    if not cache.add(f'venue-feedback:{fingerprint}', True, 300):
        return JsonResponse({'error': 'Please wait before sending another feedback message.'}, status=429)
    VenueFeedback.objects.create(
        venue=venue, rating=rating, comment=comment, rate_limit_hash=fingerprint,
        touchpoint_source=touchpoint_source, contact_name=contact_name,
        contact_email=contact_email, contact_phone=contact_phone,
    )
    source, entry = _tracking_context(request, touchpoint_source.split(':')[0], touchpoint_source.split(':')[1] if ':' in touchpoint_source else '')
    _record_event(request, venue, 'feedback_submit', _event_target('feedback', source, entry, f'rating-{rating}'), dedupe_seconds=0)
    return JsonResponse({'ok': True}, status=201)


@require_http_methods(['POST'])
def venue_loyalty_join_api(request, public_identifier):
    venue = get_object_or_404(
        VenueProfile,
        public_identifier=public_identifier,
        is_active=True,
        venue_type__in=['cafe', 'restaurant'],
    )
    program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
    if 'loyalty' not in enabled_organization_modules(venue.organization) or not program.is_active:
        return JsonResponse({'error': 'This loyalty program is not active.'}, status=400)
    data = _body(request)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    try:
        phone_e164 = _normalize_loyalty_phone(data.get('phone'))
    except ValidationError as error:
        return JsonResponse({'error': error.messages[0]}, status=400)
    full_name = str(data.get('name') or '').strip()[:120]
    existing_customer = LoyaltyCustomer.objects.filter(phone_e164=phone_e164).first()
    if not existing_customer and not full_name:
        return JsonResponse({'error': 'Enter your name to join rewards.'}, status=400)

    try:
        with transaction.atomic():
            customer, customer_created = LoyaltyCustomer.objects.get_or_create(phone_e164=phone_e164, defaults={'full_name': full_name})
            if not customer_created and full_name and customer.full_name != full_name:
                customer.full_name = full_name
                customer.save(update_fields=['full_name', 'updated_at'])
            membership, created = VenueLoyaltyMembership.objects.get_or_create(
                venue=venue,
                customer=customer,
                defaults={'stamp_goal': program.stamp_goal},
            )
            reopened = False
            update_fields = []
            if membership.stamp_goal != program.stamp_goal:
                membership.stamp_goal = program.stamp_goal
                update_fields.append('stamp_goal')
            if not membership.is_active:
                membership.is_active = True
                reopened = True
                update_fields.append('is_active')
            if update_fields:
                membership.save(update_fields=[*update_fields, 'updated_at'])
            if created:
                _record_operational_activity(venue, 'loyalty_member_joined', f'New loyalty member joined: {phone_e164}', details={'membershipId': membership.public_identifier})
            elif reopened:
                _record_operational_activity(venue, 'loyalty_member_reactivated', f'Loyalty member rejoined: {phone_e164}', details={'membershipId': membership.public_identifier})
    except IntegrityError:
        # A concurrent join for the same number can win the unique constraint.
        customer = LoyaltyCustomer.objects.filter(phone_e164=phone_e164).first()
        membership = VenueLoyaltyMembership.objects.filter(venue=venue, customer=customer).first()
        if not membership:
            return JsonResponse({'error': 'Please try joining rewards again.'}, status=409)
        created = False

    source, entry = _tracking_context(request, data.get('source'), data.get('entry'))
    _record_event(
        request,
        venue,
        'loyalty_join',
        _event_target('loyalty', source, entry, 'created' if created else 'reopened'),
        dedupe_seconds=0,
    )
    return JsonResponse({'ok': True, 'created': created, 'membership': _loyalty_membership_payload(membership)}, status=201 if created else 200)


@require_http_methods(['GET'])
def venue_loyalty_card_api(request, public_identifier, member_identifier):
    """Restore a customer's card using the unguessable identifier stored on their device."""
    venue = get_object_or_404(
        VenueProfile,
        public_identifier=public_identifier,
        is_active=True,
        venue_type__in=['cafe', 'restaurant'],
    )
    program = get_object_or_404(VenueRewardsProgram, venue=venue, is_active=True)
    if 'loyalty' not in enabled_organization_modules(venue.organization):
        return JsonResponse({'error': 'This loyalty program is not available.'}, status=404)
    membership = get_object_or_404(
        VenueLoyaltyMembership.objects.select_related('customer'),
        venue=venue,
        public_identifier=member_identifier,
        is_active=True,
    )
    with transaction.atomic():
        _expire_rewards_if_needed(membership, program)
    membership.refresh_from_db()
    return JsonResponse({
        'membership': _loyalty_membership_payload(membership),
        'program': _rewards_program_payload(program),
    })


def _reward_decimal(data, key, label):
    try:
        value = Decimal(str(data.get(key, '')).strip())
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError(f'Enter a valid {label}.')
    if value < 0:
        raise ValidationError(f'{label.title()} cannot be negative.')
    return value.quantize(Decimal('0.01'))


@require_http_methods(['GET'])
def venue_rewards_members_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'loyalty')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
    rows = venue.loyalty_memberships.filter(is_active=True).select_related('customer').order_by('-last_activity_at', '-created_at')
    query = str(request.GET.get('q') or '').strip()
    if query:
        rows = rows.filter(Q(customer__phone_e164__icontains=query) | Q(customer__full_name__icontains=query) | Q(public_identifier__icontains=query.replace('T2C-LOYALTY:', '')))
    segment = str(request.GET.get('segment') or '').strip()
    if segment == 'needs_visit':
        rows = rows.filter(Q(last_activity_at__isnull=True) | Q(last_activity_at__lt=timezone.now() - timedelta(days=30)))
    elif segment == 'not_redeemed':
        rows = rows.filter(lifetime_rewards_redeemed=Decimal('0.00'))
    members = []
    for membership in rows[:200]:
        with transaction.atomic():
            _expire_rewards_if_needed(membership, program)
        membership.refresh_from_db()
        members.append(_membership_payload(membership, program))
    return JsonResponse({'program': _rewards_program_payload(program), 'members': members})


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def venue_rewards_member_detail_api(request, organization_id, member_identifier):
    venue = _venue_for(request, organization_id, 'loyalty')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method in {'PATCH', 'DELETE'} and organization_role(request.user, venue.organization) != 'owner':
        return JsonResponse({'error': 'Only the owner can edit or archive loyalty members.'}, status=403)
    membership = get_object_or_404(VenueLoyaltyMembership.objects.select_related('customer'), venue=venue, public_identifier=member_identifier)
    if request.method == 'DELETE':
        phone = membership.customer.phone_e164
        membership.is_active = False
        membership.save(update_fields=['is_active', 'updated_at'])
        _record_operational_activity(venue, 'loyalty_member_archived', f'Loyalty member archived: {phone}', request, {'membershipId': membership.public_identifier})
        return JsonResponse({'ok': True})
    if request.method == 'PATCH':
        data = _body(request)
        if not isinstance(data, dict):
            return JsonResponse({'error': 'Invalid member details.'}, status=400)
        full_name = str(data.get('name') or '').strip()[:120]
        if not full_name:
            return JsonResponse({'error': 'Enter the member name.'}, status=400)
        try:
            phone_e164 = _normalize_loyalty_phone(data.get('phone'))
        except ValidationError as error:
            return JsonResponse({'error': error.messages[0]}, status=400)
        if LoyaltyCustomer.objects.filter(phone_e164=phone_e164).exclude(pk=membership.customer_id).exists():
            return JsonResponse({'error': 'Another loyalty customer already uses this phone number.'}, status=409)
        customer = membership.customer
        customer.full_name = full_name
        customer.phone_e164 = phone_e164
        customer.save(update_fields=['full_name', 'phone_e164', 'updated_at'])
        _record_operational_activity(venue, 'loyalty_member_updated', f'Loyalty member updated: {phone_e164}', request)
        program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
        return JsonResponse({'ok': True, 'member': _membership_payload(membership, program)})
    program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
    with transaction.atomic():
        _expire_rewards_if_needed(membership, program)
    membership.refresh_from_db()
    transactions = membership.rewards_transactions.select_related('created_by').all()[:50]
    return JsonResponse({'member': _membership_payload(membership, program), 'transactions': [{
        'id': row.pk, 'type': row.transaction_type, 'amount': str(row.reward_amount), 'balanceAfter': str(row.balance_after),
        'orderAmount': str(row.order_amount) if row.order_amount is not None else None, 'receiptReference': row.receipt_reference,
        'createdAt': row.created_at.isoformat(), 'createdBy': (row.created_by.get_full_name().strip() or row.created_by.username) if row.created_by else 'System',
    } for row in transactions]})


@require_http_methods(['POST'])
def venue_rewards_transaction_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'loyalty')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    data = _body(request)
    if not isinstance(data, dict):
        return JsonResponse({'error': 'Invalid JSON.'}, status=400)
    action = str(data.get('action') or '')
    if action not in {'earn', 'redeem'}:
        return JsonResponse({'error': 'Choose whether to earn or redeem rewards.'}, status=400)
    program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
    if not program.is_active:
        return JsonResponse({'error': 'The rewards program is paused.'}, status=400)
    try:
        bill_amount = _reward_decimal(data, 'billAmount', 'bill amount')
        requested_amount = _reward_decimal(data, 'rewardAmount', 'reward amount') if action == 'redeem' and program.program_type == 'rewards' else None
    except ValidationError as error:
        return JsonResponse({'error': error.messages[0]}, status=400)
    membership_id = str(data.get('memberId') or '').replace('T2C-LOYALTY:', '').strip()
    receipt_reference = str(data.get('receiptReference') or '').strip()[:120]
    idempotency_key = re.sub(r'[^a-zA-Z0-9_-]', '', str(data.get('idempotencyKey') or ''))[:64]
    try:
        with transaction.atomic():
            membership = VenueLoyaltyMembership.objects.select_for_update().select_related('customer').get(venue=venue, public_identifier=membership_id, is_active=True)
            _expire_rewards_if_needed(membership, program)
            membership.refresh_from_db()
            if idempotency_key:
                previous = VenueRewardsTransaction.objects.filter(venue=venue, idempotency_key=idempotency_key).first()
                if previous:
                    return JsonResponse({
                        'ok': True,
                        'duplicate': True,
                        'member': _membership_payload(membership, program),
                        'transaction': {'id': previous.pk, 'amount': str(previous.reward_amount), 'balanceAfter': str(previous.balance_after)},
                    })
            if receipt_reference and VenueRewardsTransaction.objects.filter(venue=venue, receipt_reference=receipt_reference, transaction_type=action).exists():
                return JsonResponse({'error': 'This receipt has already been used for this rewards action.'}, status=409)
            if action == 'earn':
                if bill_amount < program.minimum_order_amount:
                    return JsonResponse({'error': f'Bills must be at least Rs. {program.minimum_order_amount} to collect loyalty credit.'}, status=400)
                if program.program_type == 'stamps':
                    if membership.stamp_goal != program.stamp_goal:
                        membership.stamp_goal = program.stamp_goal
                    membership.stamp_count += 1
                    amount = Decimal('1.00')
                    balance_after = Decimal(membership.stamp_count)
                    summary = f'Added 1 stamp for {membership.customer.phone_e164}'
                else:
                    rate = program.points_per_currency if program.program_type == 'points' else program.reward_rate_percent / Decimal('100')
                    amount = (bill_amount * rate).quantize(Decimal('0.01'))
                    membership.reward_balance += amount
                    membership.lifetime_rewards_earned += amount
                    balance_after = membership.reward_balance
                    unit = 'points' if program.program_type == 'points' else 'rewards'
                    summary = f'Added {amount} {unit} for {membership.customer.phone_e164}'
            elif program.program_type == 'stamps':
                if membership.stamp_goal != program.stamp_goal:
                    membership.stamp_goal = program.stamp_goal
                if membership.stamp_count < program.stamp_goal:
                    remaining = program.stamp_goal - membership.stamp_count
                    return JsonResponse({'error': f'This member needs {remaining} more stamp{"s" if remaining != 1 else ""} before claiming {program.stamp_reward_label}.'}, status=400)
                membership.stamp_count -= program.stamp_goal
                membership.rewards_redeemed += 1
                amount = -Decimal(program.stamp_goal)
                balance_after = Decimal(membership.stamp_count)
                summary = f'Redeemed {program.stamp_reward_label} for {membership.customer.phone_e164}'
            elif program.program_type == 'points':
                required = Decimal(program.points_to_reward)
                if membership.reward_balance < required:
                    remaining = required - membership.reward_balance
                    return JsonResponse({'error': f'This member needs {remaining.normalize()} more points before claiming {program.reward_label}.'}, status=400)
                membership.reward_balance -= required
                membership.lifetime_rewards_redeemed += required
                membership.rewards_redeemed += 1
                amount = -required
                balance_after = membership.reward_balance
                summary = f'Redeemed {program.reward_label} for {membership.customer.phone_e164}'
            else:
                max_for_bill = (bill_amount * program.max_redemption_percent / Decimal('100')).quantize(Decimal('0.01'))
                if not requested_amount or requested_amount <= 0:
                    return JsonResponse({'error': 'Enter the rewards amount to redeem.'}, status=400)
                if requested_amount > membership.reward_balance:
                    return JsonResponse({'error': 'This member does not have enough rewards balance.'}, status=400)
                if requested_amount > max_for_bill:
                    return JsonResponse({'error': f'Redemption is limited to Rs. {max_for_bill} for this bill.'}, status=400)
                amount = -requested_amount
                membership.reward_balance += amount
                membership.lifetime_rewards_redeemed += requested_amount
                balance_after = membership.reward_balance
                summary = f'Redeemed Rs. {requested_amount} rewards for {membership.customer.phone_e164}'
            membership.last_activity_at = timezone.now()
            membership.save(update_fields=['stamp_count', 'stamp_goal', 'reward_balance', 'lifetime_rewards_earned', 'lifetime_rewards_redeemed', 'rewards_redeemed', 'last_activity_at', 'updated_at'])
            row = VenueRewardsTransaction.objects.create(venue=venue, membership=membership, transaction_type=action, reward_amount=amount, balance_after=balance_after, order_amount=bill_amount, receipt_reference=receipt_reference, idempotency_key=idempotency_key, created_by=request.user)
            _record_operational_activity(venue, f'rewards_{action}', summary, request, {'membershipId': membership.public_identifier, 'billAmount': str(bill_amount), 'rewardAmount': str(abs(amount)), 'receiptReference': receipt_reference})
    except VenueLoyaltyMembership.DoesNotExist:
        return JsonResponse({'error': 'Member not found for this business.'}, status=404)
    return JsonResponse({'ok': True, 'member': _membership_payload(membership, program), 'transaction': {'id': row.pk, 'amount': str(row.reward_amount), 'balanceAfter': str(row.balance_after)}})


@require_http_methods(['GET'])
def venue_operational_activity_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'overview')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    rows = venue.operational_activity.select_related('actor').all()[:200]
    return JsonResponse({'activity': [{
        'id': row.pk, 'type': row.event_type, 'summary': row.summary, 'details': row.details,
        'createdAt': row.created_at.isoformat(), 'actor': (row.actor.get_full_name().strip() or row.actor.username) if row.actor else 'System',
    } for row in rows]})


def _venue_for(request, organization_id, capability='overview'):
    if not _authorized(request, organization_id, capability):
        return None
    organization = get_object_or_404(College, pk=organization_id)
    venue, _ = VenueProfile.objects.get_or_create(organization=organization)
    return venue


def _team_payload(member):
    return {
        'id': member.pk, 'name': (member.user.get_full_name().strip() or member.user.username) if member.user_id else 'Pending invitation',
        'email': member.user.email if member.user_id and member.user.email else member.invite_email,
        'role': member.role, 'status': member.status,
        'isCurrentUser': False,
    }


def _service_plan_payload(organization, include_internal=False):
    ensure_organization_modules(organization)
    plan, _ = OrganizationServicePlan.objects.get_or_create(organization=organization)
    modules = {row.module_key: row for row in organization.module_access.all()}
    payload = {
        'name': plan.name,
        'startsOn': plan.starts_on.isoformat() if plan.starts_on else '',
        'endsOn': plan.ends_on.isoformat() if plan.ends_on else '',
        'technicalOwner': {
            'id': plan.technical_owner_id,
            'name': plan.technical_owner.get_full_name().strip() or plan.technical_owner.username,
            'email': plan.technical_owner.email,
        } if plan.technical_owner_id else None,
        'modules': [{
            'key': key,
            'label': label,
            'enabled': bool(modules.get(key) and modules[key].is_enabled and (not modules[key].ends_at or modules[key].ends_at >= timezone.now())),
            'available': key != 'ordering',
        } for key, label in OrganizationModuleAccess.MODULE_CHOICES],
    }
    if include_internal:
        payload['internalNotes'] = plan.internal_notes
    return payload


def _support_staff_payload():
    User = get_user_model()
    return [{
        'id': item.id,
        'name': item.get_full_name().strip() or item.username,
        'email': item.email,
    } for item in User.objects.filter(
        Q(user_permissions__codename='access_platform_organizations') | Q(groups__permissions__codename='access_platform_organizations'),
        is_active=True,
    ).exclude(is_superuser=True).distinct().order_by('first_name', 'last_name', 'username')]


def _hospitality_shell(request, organization, role):
    organizations = accessible_organizations(request.user).filter(organization_type='hospitality').order_by('name')
    venue, _ = VenueProfile.objects.get_or_create(organization=organization)
    return {
        'isSuperAdmin': request.user.is_superuser,
        'role': role,
        'capabilities': sorted(effective_capabilities(request.user, organization)),
        'currentSchool': {'id': organization.pk, 'name': organization.name, 'logo': _file_url(request, organization.logo), 'organizationType': organization.organization_type, 'themePrimary': organization.theme_primary, 'publicIdentifier': venue.public_identifier},
        'schools': [{'id': item.pk, 'name': item.name} for item in organizations],
        'user': {'displayName': request.user.get_full_name().strip() or request.user.username},
    }


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_settings_api(request, organization_id):
    organization = get_object_or_404(College, pk=organization_id, organization_type='hospitality')
    role = organization_role(request.user, organization)
    if not role:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    ensure_organization_owner(organization)
    if request.method == 'GET':
        preference, _ = OrganizationNotificationPreference.objects.get_or_create(organization=organization, user=request.user)
        response = {'shell': _hospitality_shell(request, organization, role), 'settings': {
            'role': role,
            'notifications': {
                'newFeedbackEmail': preference.new_feedback_email,
                'lowRatingFeedbackEmail': preference.low_rating_feedback_email,
                'weeklySummaryEmail': preference.weekly_summary_email,
            },
            'organizationCode': organization.organization_code or '',
        }}
        response['subscription'] = _service_plan_payload(organization, include_internal=request.user.is_superuser)
        if request.user.is_superuser:
            response['supportStaff'] = _support_staff_payload()
        if role == 'owner' or request.user.is_superuser:
            venue, _ = VenueProfile.objects.get_or_create(organization=organization)
            program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
            response['rewardsProgram'] = _rewards_program_payload(program)
            response['team'] = [{**_team_payload(member), 'isCurrentUser': member.user_id == request.user.id} for member in organization.team_members.select_related('user').all()]
        return JsonResponse(response)
    if request.method == 'PATCH':
        data = _body(request) or {}
        if data.get('action') == 'subscription':
            if not request.user.is_superuser:
                return JsonResponse({'error': 'Only Super Admins can change a service plan.'}, status=403)
            module_keys = data.get('modules')
            if not isinstance(module_keys, list):
                return JsonResponse({'error': 'Choose the modules included in this plan.'}, status=400)
            valid_keys = set(MODULE_CAPABILITIES)
            requested_keys = {str(key) for key in module_keys}
            if not requested_keys.issubset(valid_keys):
                return JsonResponse({'error': 'The plan contains an unknown module.'}, status=400)
            # A hospitality workspace always needs its landing screen and public profile editor.
            requested_keys.update({'overview', 'profile'})
            support_id = data.get('technicalOwnerId') or None
            support_user = None
            if support_id:
                try:
                    support_user = get_user_model().objects.get(pk=int(support_id), is_active=True)
                except (TypeError, ValueError, get_user_model().DoesNotExist):
                    return JsonResponse({'error': 'Choose an active technical support person.'}, status=400)
            try:
                starts_on = date.fromisoformat(str(data.get('startsOn') or '')) if data.get('startsOn') else None
                ends_on = date.fromisoformat(str(data.get('endsOn') or '')) if data.get('endsOn') else None
            except ValueError:
                return JsonResponse({'error': 'Use valid service-plan dates.'}, status=400)
            if starts_on and ends_on and ends_on < starts_on:
                return JsonResponse({'error': 'The plan end date must be after its start date.'}, status=400)
            plan, _ = OrganizationServicePlan.objects.get_or_create(organization=organization)
            if 'name' in data:
                plan.name = str(data.get('name') or '').strip()[:120]
            if 'internalNotes' in data:
                plan.internal_notes = str(data.get('internalNotes') or '').strip()
            if 'startsOn' in data:
                plan.starts_on = starts_on
            if 'endsOn' in data:
                plan.ends_on = ends_on
            plan.technical_owner, plan.updated_by = support_user, request.user
            plan.save()
            ensure_organization_modules(organization)
            now = timezone.now()
            for access in organization.module_access.all():
                enabled = access.module_key in requested_keys
                access.is_enabled = enabled
                access.enabled_at = now if enabled and not access.enabled_at else (None if not enabled else access.enabled_at)
                access.ends_at = None
                access.configured_by = request.user
                access.save(update_fields=['is_enabled', 'enabled_at', 'ends_at', 'configured_by', 'updated_at'])
            return JsonResponse({'ok': True, 'subscription': _service_plan_payload(organization, include_internal=True)})
        if data.get('action') == 'rewards_program':
            if not can_access_organization(request.user, organization, 'loyalty'):
                return JsonResponse({'error': 'Loyalty is not included in this organization’s plan.'}, status=403)
            if role != 'owner' and not request.user.is_superuser:
                return JsonResponse({'error': 'Only owners can update the rewards program.'}, status=403)
            venue, _ = VenueProfile.objects.get_or_create(organization=organization)
            program, _ = VenueRewardsProgram.objects.get_or_create(venue=venue)
            previous_type = program.program_type
            try:
                program.is_active = bool(data.get('isActive', program.is_active))
                program.program_type = str(data.get('programType', program.program_type))
                program.reward_rate_percent = Decimal(str(data.get('rewardRatePercent', program.reward_rate_percent)))
                program.minimum_order_amount = Decimal(str(data.get('minimumOrderAmount', program.minimum_order_amount)))
                program.max_redemption_percent = Decimal(str(data.get('maxRedemptionPercent', program.max_redemption_percent)))
                program.reward_label = str(data.get('rewardLabel', program.reward_label)).strip() or 'Rewards balance'
                program.points_per_currency = Decimal(str(data.get('pointsPerCurrency', program.points_per_currency)))
                program.points_to_reward = int(data.get('pointsToReward', program.points_to_reward))
                program.stamp_goal = int(data.get('stampGoal', program.stamp_goal))
                program.stamp_reward_label = str(data.get('stampRewardLabel', program.stamp_reward_label)).strip() or 'Free reward'
                expiry = data.get('expiryDays', program.expiry_days)
                program.expiry_days = int(expiry) if expiry not in (None, '', 0, '0') else None
                program.full_clean()
            except (InvalidOperation, TypeError, ValueError, ValidationError) as error:
                messages = getattr(error, 'messages', [str(error)])
                return JsonResponse({'error': '; '.join(messages)}, status=400)
            outstanding = venue.loyalty_memberships.filter(Q(reward_balance__gt=0) | Q(stamp_count__gt=0))
            affected_members = outstanding.count()
            if previous_type != program.program_type and affected_members and not bool(data.get('resetExistingBalances')):
                return JsonResponse({
                    'error': 'Members still have loyalty balances. Confirm that you want to reset them before changing the loyalty system.',
                    'code': 'loyalty_balance_reset_required',
                    'affectedMembers': affected_members,
                }, status=409)
            with transaction.atomic():
                if previous_type != program.program_type:
                    for membership in outstanding.select_for_update():
                        old_balance = Decimal(membership.stamp_count) if previous_type == 'stamps' else membership.reward_balance
                        membership.stamp_count = 0
                        membership.reward_balance = Decimal('0.00')
                        membership.save(update_fields=['stamp_count', 'reward_balance', 'updated_at'])
                        VenueRewardsTransaction.objects.create(
                            venue=venue, membership=membership,
                            transaction_type=VenueRewardsTransaction.EXPIRE,
                            reward_amount=-old_balance, balance_after=Decimal('0.00'),
                            created_by=request.user,
                        )
                    _record_operational_activity(
                        venue, 'rewards_program_reset',
                        f'Reset {affected_members} member balances while changing loyalty system', request,
                        {'from': previous_type, 'to': program.program_type},
                    )
                program.save()
                venue.loyalty_memberships.exclude(stamp_goal=program.stamp_goal).update(stamp_goal=program.stamp_goal)
            _record_operational_activity(venue, 'rewards_program_updated', 'Updated loyalty program rules', request, {'active': program.is_active, 'programType': program.program_type, 'expiryDays': program.expiry_days})
            return JsonResponse({'ok': True, 'rewardsProgram': _rewards_program_payload(program)})
        if data.get('action') == 'notifications':
            preference, _ = OrganizationNotificationPreference.objects.get_or_create(organization=organization, user=request.user)
            for api_key, field in {'newFeedbackEmail': 'new_feedback_email', 'lowRatingFeedbackEmail': 'low_rating_feedback_email', 'weeklySummaryEmail': 'weekly_summary_email'}.items():
                if api_key in data:
                    setattr(preference, field, bool(data[api_key]))
            preference.save()
            return JsonResponse({'ok': True})
        if data.get('action') == 'organization_code':
            if role != 'owner' and not request.user.is_superuser:
                return JsonResponse({'error': 'Only owners can change internal organization settings.'}, status=403)
            organization.organization_code = str(data.get('organizationCode') or '').strip()
            try:
                organization.full_clean(exclude=['admin_user']); organization.save(update_fields=['organization_code'])
            except ValidationError as error:
                return JsonResponse({'error': '; '.join(error.messages)}, status=400)
            return JsonResponse({'ok': True, 'organizationCode': organization.organization_code or ''})
    if role != 'owner' and not request.user.is_superuser:
        return JsonResponse({'error': 'Only owners can manage team access.'}, status=403)
    data = _body(request) or {}
    action = str(data.get('action') or '')
    if request.method == 'POST' and action == 'invite':
        email = str(data.get('email') or '').strip().lower()
        invite_role = str(data.get('role') or 'manager')
        if invite_role not in {'owner', 'manager', 'waiter', 'kitchen', 'reception'}:
            return JsonResponse({'error': 'Choose a valid team role.'}, status=400)
        try: validate_email(email)
        except ValidationError: return JsonResponse({'error': 'Enter a valid email address.'}, status=400)
        user = get_user_model().objects.filter(email__iexact=email).first()
        member = OrganizationTeamMember.objects.filter(organization=organization, invite_email__iexact=email).first()
        if not member and user:
            member = OrganizationTeamMember.objects.filter(organization=organization, user=user).first()
        if not member:
            member = OrganizationTeamMember(organization=organization)
        member.user, member.invite_email, member.role = user, email, invite_role
        member.status = 'active' if user else 'invited'
        member.save()
        return JsonResponse({'ok': True, 'member': _team_payload(member)}, status=201)
    member = get_object_or_404(OrganizationTeamMember, pk=data.get('id'), organization=organization)
    if request.method == 'PATCH' and action == 'role':
        new_role = str(data.get('role') or '')
        if new_role not in {'owner', 'manager', 'waiter', 'kitchen', 'reception'}:
            return JsonResponse({'error': 'Choose a valid team role.'}, status=400)
        if member.role == 'owner' and new_role != 'owner' and organization.team_members.filter(role='owner', status='active').count() <= 1:
            return JsonResponse({'error': 'Assign another owner before changing the last owner.'}, status=400)
        member.role = new_role; member.save(update_fields=['role', 'updated_at'])
        return JsonResponse({'ok': True})
    if request.method == 'DELETE' or action == 'remove':
        if member.role == 'owner' and member.status == 'active' and organization.team_members.filter(role='owner', status='active').count() <= 1:
            return JsonResponse({'error': 'You cannot remove the last owner.'}, status=400)
        member.delete()
        return JsonResponse({'ok': True})
    return JsonResponse({'error': 'Choose a valid settings action.'}, status=400)


def _ensure_default_categories(venue):
    if venue.menu_categories.exists():
        return
    if venue.venue_type == 'hotel':
        names = ['Rooms', 'Dining', 'Services']
    elif venue.venue_type in {'cafe', 'restaurant', 'bar'}:
        names = ['Breakfast', 'Main Course', 'Snacks', 'Beverages', 'Desserts']
    else:
        names = ['Menu']
    VenueMenuCategory.objects.bulk_create([
        VenueMenuCategory(venue=venue, name=name, slug=f'default-{index}-{slugify(name)}', display_order=index)
        for index, name in enumerate(names)
    ])


@require_http_methods(['GET', 'POST', 'PATCH'])
def venue_profile_manage_api(request, organization_id):
    # Menu editors need only enough read context to label their menu. They
    # cannot update public-profile fields.
    capability = 'profile' if request.method != 'GET' else ('profile' if _authorized(request, organization_id, 'profile') else 'menu')
    venue = _venue_for(request, organization_id, capability)
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method in {'POST', 'PATCH'}:
        data = (_body(request) if request.content_type.startswith('application/json') else request.POST) or {}
        try:
            with transaction.atomic():
                organization = venue.organization
                organization_fields = {'name': 'name', 'slogan': 'slogan', 'address': 'address', 'phone': 'phone', 'email': 'email', 'website': 'website', 'map_url': 'map_url'}
                for api_key, model_key in organization_fields.items():
                    if api_key in data:
                        value = str(data.get(api_key) or '').strip()
                        if api_key in {'website', 'map_url'}:
                            value = _web_url(value, api_key.replace('_', ' ').title())
                        setattr(organization, model_key, value)
                venue_fields = {'venue_type', 'description', 'primary_color', 'secondary_color', 'google_review_url', 'reservation_url', 'opening_hours'}
                for key in venue_fields:
                    if key in data:
                        value = str(data.get(key) or '').strip()
                        if key.endswith('_url'):
                            value = _web_url(value, key.replace('_', ' ').title())
                        setattr(venue, key, value)
                for key in {'feedback_enabled', 'is_active', 'whatsapp_same_as_phone'}:
                    if key in data:
                        value = data.get(key)
                        if isinstance(value, str):
                            value = value.strip().lower() in {'1', 'true', 'yes', 'on'}
                        setattr(venue, key, bool(value))
                if 'whatsapp' in data or 'whatsapp_same_as_phone' in data:
                    venue.whatsapp = organization.phone if venue.whatsapp_same_as_phone else str(data.get('whatsapp') or '').strip()
                if 'opening_schedule' in data:
                    venue.opening_schedule = _validate_schedule(_json_field(data, 'opening_schedule', {}))
                if request.FILES.get('logo'):
                    venue.logo = request.FILES['logo']
                elif str(data.get('remove_logo', '')).lower() in {'1', 'true', 'yes', 'on'}:
                    venue.logo = None
                elif not venue.logo and organization.logo:
                    venue.logo = organization.logo
                if request.FILES.get('cover_image'):
                    venue.cover_image = request.FILES['cover_image']
                elif str(data.get('remove_cover_image', '')).lower() in {'1', 'true', 'yes', 'on'}:
                    venue.cover_image = None
                elif not venue.cover_image and organization.cover_photo:
                    venue.cover_image = organization.cover_photo
                venue.full_clean()
                organization.full_clean(exclude=['admin_user'])
                organization.save()
                venue.save()

                if 'links' in data:
                    links = _json_field(data, 'links', [])
                    if not isinstance(links, list) or len(links) > 30:
                        raise ValidationError('Social links are invalid.')
                    keep_ids = []
                    for order, row in enumerate(links):
                        if not isinstance(row, dict):
                            raise ValidationError('Social link is invalid.')
                        value = _safe_url(str(row.get('value') or '').strip())
                        label = str(row.get('label') or row.get('link_type') or '').strip()[:120]
                        link_type = str(row.get('link_type') or 'website').strip()[:40]
                        icon = str(row.get('icon') or '').strip()[:500000]
                        if icon and not icon.startswith('data:image/'):
                            icon = _web_url(icon, 'Social icon')
                        link = venue.links.filter(pk=row.get('id')).first() if row.get('id') else VenueLink(venue=venue)
                        if link is None:
                            raise ValidationError('A social link no longer exists.')
                        link.link_type, link.label, link.value, link.icon = link_type, label, value, icon
                        link.display_order, link.is_active = order, bool(row.get('is_active', True))
                        link.full_clean(); link.save(); keep_ids.append(link.pk)
                    venue.links.exclude(pk__in=keep_ids).delete()

                # Keep older organization copies aligned only after the owner approves this profile save.
                organization.description = venue.description
                organization.theme_primary = venue.primary_color
                organization.theme_ternary = venue.secondary_color
                organization.logo = venue.logo
                organization.cover_photo = venue.cover_image
                sync_fields = ['description', 'theme_primary', 'theme_ternary', 'logo', 'cover_photo']
                if 'links' in data:
                    social_values = {link.link_type: link.value for link in venue.links.all()}
                    organization.facebook = social_values.get('facebook', '')
                    organization.instagram = social_values.get('instagram', '')
                    organization.linkedin = social_values.get('linkedin', '')
                    organization.twitter = social_values.get('x', social_values.get('twitter', ''))
                    sync_fields += ['facebook', 'instagram', 'linkedin', 'twitter']
                organization.save(update_fields=sync_fields)
                _record_operational_activity(venue, 'business_profile_updated', 'Updated business profile', request)
        except ValidationError as exc:
            return JsonResponse({'message': '; '.join(exc.messages)}, status=400)
    response = _payload(request, venue)
    response['links'] = _management_links(venue)
    response['sourceConflicts'] = _source_conflicts(venue)
    return JsonResponse(response)


def _timed_attribute_active(enabled, starts_at, ends_at):
    if not enabled:
        return False
    now = timezone.now()
    return (not starts_at or starts_at <= now) and (not ends_at or ends_at >= now)


def _menu_item_payload(request, item):
    return {
        'id': item.id, 'category_id': item.category_id, 'name': item.name,
        'description': item.description, 'price': str(item.price),
        'original_price': str(item.original_price) if item.original_price is not None else '',
        'offer_label': item.offer_label, 'dietary_info': item.dietary_info,
        'add_ons': item.add_ons, 'spice_levels': item.spice_levels,
        'is_vegetarian': item.is_vegetarian, 'is_available': item.is_available,
        'is_published': item.is_published, 'is_today_special': item.is_today_special,
        'is_offer': item.is_offer, 'image': _file_url(request, item.image),
        'display_order': item.display_order,
        'special_starts_at': item.special_starts_at.isoformat() if item.special_starts_at else '',
        'special_ends_at': item.special_ends_at.isoformat() if item.special_ends_at else '',
        'offer_starts_at': item.offer_starts_at.isoformat() if item.offer_starts_at else '',
        'offer_ends_at': item.offer_ends_at.isoformat() if item.offer_ends_at else '',
        'price_variants': list(item.price_variants.values('id', 'label', 'price', 'display_order')),
    }


def _validation_message(exc):
    if hasattr(exc, 'message_dict'):
        return '; '.join(f'{field.replace("_", " ").title()}: {" ".join(messages)}' for field, messages in exc.message_dict.items())
    return '; '.join(exc.messages)


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_menu_categories_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'menu')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET':
        _ensure_default_categories(venue)
        return JsonResponse({'categories': list(venue.menu_categories.order_by('display_order', 'id').values('id', 'name', 'slug', 'display_order', 'is_active'))})
    data = _body(request) or {}
    if request.method == 'DELETE':
        category = get_object_or_404(VenueMenuCategory, pk=data.get('id'), venue=venue)
        item_count = category.items.count()
        target_id = data.get('target_category_id')
        if item_count and not target_id:
            return JsonResponse({'message': 'Move these items to another category before deleting.', 'itemCount': item_count}, status=409)
        if target_id:
            target = get_object_or_404(VenueMenuCategory, pk=target_id, venue=venue)
            if target.pk == category.pk:
                return JsonResponse({'message': 'Choose a different destination category.'}, status=400)
            category.items.update(category=target)
        category.delete()
        _record_operational_activity(venue, 'menu_category_deleted', 'Deleted a menu category', request)
        return JsonResponse({'ok': True})
    category = get_object_or_404(VenueMenuCategory, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuCategory(venue=venue)
    try:
        for key in ('name', 'slug', 'display_order', 'is_active'):
            if key in data: setattr(category, key, data[key])
        category.full_clean(); category.save()
    except ValidationError as exc:
        return JsonResponse({'message': _validation_message(exc)}, status=400)
    _record_operational_activity(venue, 'menu_category_created' if request.method == 'POST' else 'menu_category_updated', f'{"Added" if request.method == "POST" else "Updated"} menu category: {category.name}', request)
    return JsonResponse({'id': category.pk, 'name': category.name, 'slug': category.slug}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_menu_items_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'menu')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET':
        items = [_menu_item_payload(request, menu_item) for menu_item in venue.menu_items.select_related('category').prefetch_related('price_variants')]
        return JsonResponse({'items': items})
    data = _body(request) if request.content_type.startswith('application/json') else request.POST
    data = data or {}
    if request.method == 'DELETE':
        deleted_item = get_object_or_404(VenueMenuItem, pk=data.get('id'), venue=venue)
        deleted_name = deleted_item.name; deleted_item.delete()
        _record_operational_activity(venue, 'menu_item_deleted', f'Deleted menu item: {deleted_name}', request)
        return JsonResponse({'ok': True})
    action = data.get('action')
    if action == 'bulk_availability':
        ids = data.get('ids', [])
        if not isinstance(ids, list):
            return JsonResponse({'message': 'Select one or more valid items.'}, status=400)
        updated = venue.menu_items.filter(pk__in=ids).update(is_available=bool(data.get('is_available')))
        return JsonResponse({'ok': True, 'updated': updated})
    if action == 'reorder':
        order = data.get('items', [])
        if not isinstance(order, list):
            return JsonResponse({'message': 'Item order is invalid.'}, status=400)
        with transaction.atomic():
            scoped = {item.pk: item for item in venue.menu_items.filter(pk__in=[row.get('id') for row in order if isinstance(row, dict)])}
            if len(scoped) != len(order):
                return JsonResponse({'message': 'One or more menu items do not belong to this organization.'}, status=400)
            for index, row in enumerate(order):
                item = scoped.get(row.get('id')); item.display_order = index; item.save(update_fields=['display_order'])
        return JsonResponse({'ok': True})
    if action == 'duplicate':
        source = get_object_or_404(VenueMenuItem.objects.prefetch_related('price_variants'), pk=data.get('id'), venue=venue)
        with transaction.atomic():
            duplicate = VenueMenuItem.objects.create(
                venue=venue, category=source.category, name=f'{source.name} copy', description=source.description,
                image=source.image, price=source.price, original_price=source.original_price, offer_label=source.offer_label,
                dietary_info=source.dietary_info, add_ons=source.add_ons, spice_levels=source.spice_levels, is_vegetarian=source.is_vegetarian, is_available=source.is_available,
                is_published=False, is_today_special=source.is_today_special, is_offer=source.is_offer,
                special_starts_at=source.special_starts_at, special_ends_at=source.special_ends_at,
                offer_starts_at=source.offer_starts_at, offer_ends_at=source.offer_ends_at,
                display_order=venue.menu_items.count(),
            )
            VenueMenuItemVariant.objects.bulk_create([VenueMenuItemVariant(item=duplicate, label=row.label, price=row.price, display_order=row.display_order) for row in source.price_variants.all()])
        return JsonResponse({'item': _menu_item_payload(request, duplicate)}, status=201)
    item_id = data.get('id')
    item = get_object_or_404(VenueMenuItem, pk=item_id, venue=venue) if item_id else VenueMenuItem(venue=venue)
    boolean_fields = {'is_vegetarian', 'is_available', 'is_published', 'is_today_special', 'is_offer'}
    try:
        with transaction.atomic():
            for key in ('category_id', 'name', 'description', 'price', 'original_price', 'offer_label', 'dietary_info', 'is_vegetarian', 'is_available', 'is_published', 'is_today_special', 'is_offer', 'display_order', 'special_starts_at', 'special_ends_at', 'offer_starts_at', 'offer_ends_at'):
                if key in data:
                    value = data[key]
                    if key in boolean_fields and isinstance(value, str):
                        value = value.strip().lower() in {'1', 'true', 'yes', 'on'}
                    if key in {'original_price', 'special_starts_at', 'special_ends_at', 'offer_starts_at', 'offer_ends_at'} and value == '':
                        value = None
                    setattr(item, key, value)
            for key in ('add_ons', 'spice_levels'):
                if key in data:
                    value = _json_field(data, key, [])
                    if not isinstance(value, list) or len(value) > 20:
                        raise ValidationError(f'{key.replace("_", " ").title()} are invalid.')
                    if key == 'add_ons':
                        normalized = []
                        for row in value:
                            if not isinstance(row, dict) or not str(row.get('name') or '').strip():
                                raise ValidationError('Every add-on needs a name.')
                            price = _bill_amount(row.get('price'), 'add-on price')
                            normalized.append({'name': str(row.get('name')).strip()[:80], 'price': str(price)})
                        value = normalized
                    else:
                        value = [str(row).strip()[:80] for row in value if str(row).strip()]
                    setattr(item, key, value)
            if request.FILES.get('image'):
                item.image = request.FILES['image']
            elif str(data.get('remove_image', '')).lower() in {'1', 'true', 'yes', 'on'}:
                item.image = None
            item.full_clean(); item.save()
            if 'price_variants' in data:
                variants = _json_field(data, 'price_variants', [])
                if not isinstance(variants, list) or len(variants) > 20:
                    raise ValidationError('Price variants are invalid.')
                item.price_variants.all().delete()
                for index, row in enumerate(variants):
                    variant = VenueMenuItemVariant(item=item, label=str(row.get('label') or '').strip(), price=row.get('price'), display_order=index)
                    variant.full_clean(); variant.save()
    except (ValidationError, ValueError) as exc:
        message = _validation_message(exc) if isinstance(exc, ValidationError) else str(exc)
        return JsonResponse({'message': message}, status=400)
    _record_operational_activity(venue, 'menu_item_updated' if item_id else 'menu_item_created', f'{"Updated" if item_id else "Added"} menu item: {item.name}', request)
    return JsonResponse({'item': _menu_item_payload(request, item)}, status=200 if item_id else 201)


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_links_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'profile')
    if not venue: return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET': return JsonResponse({'links': list(venue.links.values('id', 'link_type', 'label', 'value', 'icon', 'display_order', 'is_active'))})
    data = _body(request) or {}
    if request.method == 'DELETE':
        get_object_or_404(VenueLink, pk=data.get('id'), venue=venue).delete()
        return JsonResponse({'ok': True})
    link = get_object_or_404(VenueLink, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueLink(venue=venue)
    for key in ('link_type', 'label', 'value', 'icon', 'display_order', 'is_active'):
        if key in data: setattr(link, key, data[key])
    _safe_url(link.value)
    link.full_clean(); link.save()
    return JsonResponse({'id': link.pk}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'PATCH'])
def venue_feedback_manage_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'feedback')
    if not venue: return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'PATCH':
        data = _body(request) or {}
        feedback = get_object_or_404(VenueFeedback, pk=data.get('id'), venue=venue)
        fields = []
        if 'status' in data:
            if data.get('status') not in dict(VenueFeedback.STATUS_CHOICES):
                return JsonResponse({'error': 'Invalid status.'}, status=400)
            feedback.status = data['status']; fields.append('status')
        if 'internal_note' in data:
            note = str(data.get('internal_note') or '').strip()
            if len(note) > 5000:
                return JsonResponse({'error': 'Internal note must be at most 5000 characters.'}, status=400)
            feedback.internal_note = note; fields.append('internal_note')
        if not fields:
            return JsonResponse({'error': 'No feedback changes were supplied.'}, status=400)
        feedback.save(update_fields=[*fields, 'updated_at'])

    feedback_rows = venue.feedback.order_by('-created_at')
    status_filter = request.GET.get('status', '').strip()
    if status_filter and status_filter != 'all':
        if status_filter not in dict(VenueFeedback.STATUS_CHOICES):
            return JsonResponse({'error': 'Invalid status filter.'}, status=400)
        feedback_rows = feedback_rows.filter(status=status_filter)
    rating_filter = request.GET.get('rating', '').strip()
    if rating_filter and rating_filter != 'all':
        try:
            rating_value = int(rating_filter)
        except ValueError:
            rating_value = 0
        if rating_value not in range(1, 6):
            return JsonResponse({'error': 'Invalid rating filter.'}, status=400)
        feedback_rows = feedback_rows.filter(rating=rating_value)
    days_filter = request.GET.get('days', '').strip()
    if days_filter and days_filter != 'all':
        try:
            days_value = int(days_filter)
        except ValueError:
            days_value = 0
        if days_value not in {7, 30, 90}:
            return JsonResponse({'error': 'Invalid date filter.'}, status=400)
        feedback_rows = feedback_rows.filter(created_at__gte=timezone.now() - timedelta(days=days_value))

    all_feedback = venue.feedback.all()
    summary = all_feedback.aggregate(count=Count('id'), average=Avg('rating'))
    status_counts = {key: all_feedback.filter(status=key).count() for key, _ in VenueFeedback.STATUS_CHOICES}
    return JsonResponse({
        'feedback': list(feedback_rows.values(
            'id', 'rating', 'comment', 'status', 'touchpoint_source', 'contact_name',
            'contact_email', 'contact_phone', 'internal_note', 'created_at', 'updated_at',
        )),
        'summary': {
            'count': summary['count'], 'average': summary['average'],
            'unresolved': status_counts['new'] + status_counts['in_progress'],
            'statusCounts': status_counts,
        },
    })


def _staff_link_value(link_type, value):
    value = str(value or '').strip()
    if not value:
        raise ValidationError('Contact link value is required.')
    if link_type == 'email':
        validate_email(value)
    elif link_type in {'website', 'linkedin', 'instagram'}:
        _web_url(value, 'Contact link')
    elif link_type in {'phone', 'whatsapp'}:
        digits = re.sub(r'\D', '', value)
        if len(digits) < 7 or len(digits) > 18:
            raise ValidationError('Enter a valid public phone number.')
    else:
        raise ValidationError('Choose an approved contact link type.')
    return value


def _staff_payload(request, staff, include_private=False):
    assignment = getattr(staff, 'card_assignment', None)
    payload = {
        'id': staff.pk, 'publicIdentifier': staff.public_identifier, 'name': staff.name,
        'position': staff.position, 'bio': staff.bio, 'photo': _file_url(request, staff.photo),
        'isActive': staff.is_active, 'displayOrder': staff.display_order,
        'links': list(staff.links.filter(is_active=True).values('id', 'link_type', 'label', 'value', 'display_order', 'is_active')),
        'publicUrl': request.build_absolute_uri(f'/venue/{staff.venue.public_identifier}/staff/{staff.public_identifier}/'),
        'assignedCard': None,
    }
    if assignment and include_private:
        payload['assignedCard'] = {
            'assignmentId': assignment.pk, 'cardId': assignment.physical_card_id,
            'label': assignment.physical_card.card_label or f'Card #{assignment.physical_card_id}',
            'isActive': assignment.is_active,
            'nfcUrl': request.build_absolute_uri(f'/venue/card/{assignment.public_identifier}/'),
        }
    if include_private:
        payload['links'] = list(staff.links.values('id', 'link_type', 'label', 'value', 'display_order', 'is_active'))
        payload['hasEditorAccess'] = bool(staff.editor_user_id)
        payload['editorUsername'] = staff.editor_user.username if staff.editor_user_id else ''
        payload['editLoginUrl'] = request.build_absolute_uri(f'/venue/{staff.venue.public_identifier}/staff/{staff.public_identifier}/edit-login/')
    return payload


def _staff_editor(request, public_identifier, staff_identifier):
    staff = get_object_or_404(
        VenueStaffProfile.objects.select_related('venue__organization', 'editor_user').prefetch_related('links'),
        venue__public_identifier=public_identifier, public_identifier=staff_identifier,
    )
    return staff if request.user.is_authenticated and staff.editor_user_id == request.user.id else None


@require_http_methods(['GET', 'POST'])
def venue_staff_edit_login_api(request, public_identifier, staff_identifier):
    staff = get_object_or_404(VenueStaffProfile.objects.select_related('venue__organization', 'editor_user'), venue__public_identifier=public_identifier, public_identifier=staff_identifier)
    redirect_path = f'/venue/{public_identifier}/staff/{staff_identifier}/edit/'
    if request.method == 'GET':
        return JsonResponse({'staffName': staff.name, 'organizationName': staff.venue.organization.name, 'hasEditorAccess': bool(staff.editor_user_id), 'authenticated': bool(request.user.is_authenticated and staff.editor_user_id == request.user.id), 'redirectPath': redirect_path})
    data = _body(request) or {}
    user = authenticate(request, username=str(data.get('username') or '').strip(), password=str(data.get('password') or ''))
    if not user or user.pk != staff.editor_user_id:
        return JsonResponse({'error': 'The username or password is not valid for this staff profile.'}, status=403)
    login(request, user)
    return JsonResponse({'redirectPath': redirect_path})


@require_http_methods(['GET', 'POST'])
def venue_staff_editor_api(request, public_identifier, staff_identifier):
    staff = _staff_editor(request, public_identifier, staff_identifier)
    if not staff:
        return JsonResponse({'error': 'Sign in to edit this staff profile.'}, status=403)
    if request.method == 'POST':
        data = ((_body(request) if request.content_type.startswith('application/json') else request.POST) or {})
        try:
            for key in {'name', 'bio'}:
                if key in data:
                    setattr(staff, key, str(data.get(key) or '').strip())
            if request.FILES.get('photo'):
                staff.photo = request.FILES['photo']
            if str(data.get('remove_photo') or '').lower() in {'1', 'true', 'yes', 'on'}:
                staff.photo = None
            staff.full_clean(); staff.save()
            if 'links' in data:
                _replace_staff_links(staff, data.get('links'))
        except ValidationError as exc:
            return JsonResponse({'error': '; '.join(exc.messages)}, status=400)
    return JsonResponse({
        'organization': {'name': staff.venue.organization.name, 'logo': _file_url(request, staff.venue.logo or staff.venue.organization.logo), 'coverImage': _file_url(request, staff.venue.cover_image or staff.venue.organization.cover_photo)},
        'staff': _staff_payload(request, staff, include_private=True),
        'locked': {'position': staff.position, 'message': 'Your role is managed by the café.'},
    })


def _touchpoint_destination(request, touchpoint, entry='qr'):
    tab = {'profile': 'home', 'menu': 'menu', 'feedback': 'home', 'ordering': 'menu'}[touchpoint.destination]
    fragment = '#feedback' if touchpoint.destination == 'feedback' else ''
    order = '&order=1' if touchpoint.destination == 'ordering' else ''
    return request.build_absolute_uri(
        f'/venue/{touchpoint.venue.public_identifier}/?tab={tab}&source={touchpoint.public_identifier}&entry={entry}{order}{fragment}'
    )


def _touchpoint_payload(request, touchpoint):
    assignment = getattr(touchpoint, 'card_assignment', None)
    return {
        'id': touchpoint.pk, 'publicIdentifier': touchpoint.public_identifier,
        'name': touchpoint.name, 'destination': touchpoint.destination, 'isActive': touchpoint.is_active,
        'qrUrl': _touchpoint_destination(request, touchpoint, 'qr'),
        'assignedCard': None if not assignment else {
            'assignmentId': assignment.pk, 'cardId': assignment.physical_card_id,
            'label': assignment.physical_card.card_label or f'Card #{assignment.physical_card_id}',
            'isActive': assignment.is_active,
            'nfcUrl': request.build_absolute_uri(f'/venue/card/{assignment.public_identifier}/'),
        },
    }


def _replace_staff_links(staff, raw_links):
    if raw_links is None:
        return
    if isinstance(raw_links, str):
        try: raw_links = json.loads(raw_links)
        except ValueError as exc: raise ValidationError('Contact links are invalid.') from exc
    if not isinstance(raw_links, list) or len(raw_links) > 8:
        raise ValidationError('Add no more than eight approved public contact links.')
    staff.links.all().delete()
    for order, row in enumerate(raw_links):
        if not isinstance(row, dict):
            raise ValidationError('Contact link is invalid.')
        link_type = str(row.get('link_type') or '').strip()
        VenueStaffLink.objects.create(
            staff=staff, link_type=link_type,
            label=str(row.get('label') or dict(VenueStaffLink.LINK_TYPES).get(link_type, 'Contact')).strip()[:80],
            value=_staff_link_value(link_type, row.get('value')),
            display_order=order, is_active=bool(row.get('is_active', True)),
        )


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_staff_cards_manage_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'staff')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    data = ((_body(request) if request.content_type.startswith('application/json') else request.POST) or {})
    try:
        with transaction.atomic():
            action = str(data.get('action') or '')
            if request.method in {'POST', 'PATCH'} and action in {'create_staff', 'update_staff'}:
                staff = VenueStaffProfile(venue=venue, display_order=venue.staff_profiles.count()) if action == 'create_staff' else get_object_or_404(VenueStaffProfile, pk=data.get('id'), venue=venue)
                for key in {'name', 'position', 'bio'}:
                    if key in data: setattr(staff, key, str(data.get(key) or '').strip())
                if 'is_active' in data:
                    value = data.get('is_active'); staff.is_active = str(value).lower() in {'1', 'true', 'yes', 'on'} if isinstance(value, str) else bool(value)
                if request.FILES.get('photo'): staff.photo = request.FILES['photo']
                if str(data.get('remove_photo') or '').lower() in {'1', 'true', 'yes', 'on'}: staff.photo = None
                editor_username = str(data.get('editor_username') or '').strip()
                editor_password = str(data.get('editor_password') or '')
                if editor_username:
                    User = get_user_model()
                    if staff.editor_user_id:
                        if User.objects.filter(username__iexact=editor_username).exclude(pk=staff.editor_user_id).exists():
                            raise ValidationError('That staff profile username is already in use.')
                        staff.editor_user.username = editor_username
                        if editor_password:
                            staff.editor_user.set_password(editor_password)
                        staff.editor_user.save()
                    else:
                        if not editor_password:
                            raise ValidationError('Set a password to enable staff profile editing.')
                        if User.objects.filter(username__iexact=editor_username).exists():
                            raise ValidationError('That staff profile username is already in use.')
                        staff.editor_user = User.objects.create_user(username=editor_username, password=editor_password)
                staff.full_clean(); staff.save()
                _replace_staff_links(staff, data.get('links'))
                if hasattr(staff, 'card_assignment'):
                    staff.card_assignment.is_active = staff.is_active
                    staff.card_assignment.save(update_fields=['is_active', 'updated_at'])
            elif request.method in {'POST', 'PATCH'} and action in {'create_touchpoint', 'update_touchpoint'}:
                touchpoint = VenueTouchpoint(venue=venue) if action == 'create_touchpoint' else get_object_or_404(VenueTouchpoint, pk=data.get('id'), venue=venue)
                for key in {'name', 'destination'}:
                    if key in data: setattr(touchpoint, key, str(data.get(key) or '').strip())
                if 'is_active' in data:
                    value = data.get('is_active'); touchpoint.is_active = str(value).lower() in {'1', 'true', 'yes', 'on'} if isinstance(value, str) else bool(value)
                touchpoint.full_clean(); touchpoint.save()
                if hasattr(touchpoint, 'card_assignment'):
                    touchpoint.card_assignment.is_active = touchpoint.is_active
                    touchpoint.card_assignment.save(update_fields=['is_active', 'updated_at'])
            elif request.method == 'POST' and action == 'assign_card':
                card = get_object_or_404(CardBatchCard, pk=data.get('card_id'))
                if card.organization_id is None and request.user.is_superuser:
                    card.organization = venue.organization; card.save(update_fields=['organization'])
                target_type, target_id = str(data.get('target_type') or ''), data.get('target_id')
                kwargs = {'staff': get_object_or_404(VenueStaffProfile, pk=target_id, venue=venue)} if target_type == 'staff' else {'touchpoint': get_object_or_404(VenueTouchpoint, pk=target_id, venue=venue)} if target_type == 'touchpoint' else None
                if kwargs is None: raise ValidationError('Choose a staff profile or touchpoint.')
                assignment = VenueCardAssignment(venue=venue, physical_card=card, **kwargs)
                assignment.full_clean(); assignment.save()
            elif request.method == 'DELETE' or action == 'unassign_card':
                assignment = get_object_or_404(VenueCardAssignment, pk=data.get('assignment_id'), venue=venue)
                assignment.delete()
            elif request.method != 'GET':
                return JsonResponse({'error': 'Choose a valid staff or card action.'}, status=400)
    except ValidationError as exc:
        return JsonResponse({'error': '; '.join(exc.messages)}, status=400)

    if request.method != 'GET':
        activity_labels = {
            'create_staff': 'Added a staff profile', 'update_staff': 'Updated a staff profile',
            'create_touchpoint': 'Added a QR touchpoint', 'update_touchpoint': 'Updated a QR touchpoint',
            'assign_card': 'Assigned an NFC card', 'unassign_card': 'Unassigned an NFC card',
        }
        _record_operational_activity(venue, f'staff_{action or "updated"}', activity_labels.get(action, 'Updated staff or card settings'), request)

    staff = venue.staff_profiles.prefetch_related('links').select_related('card_assignment__physical_card', 'editor_user')
    touchpoints = venue.touchpoints.select_related('card_assignment__physical_card')
    eligible_cards = CardBatchCard.objects.filter(
        Q(organization=venue.organization) | (Q(organization__isnull=True) if request.user.is_superuser else Q(pk__in=[])),
        venue_assignment__isnull=True, student_profile__isnull=True, professional_profile__isnull=True,
    ).exclude(status__in=['faulty', 'reprinted']).order_by('card_label', 'id')
    return JsonResponse({
        'staff': [_staff_payload(request, item, include_private=True) for item in staff],
        'touchpoints': [_touchpoint_payload(request, item) for item in touchpoints],
        'availableCards': [{'id': card.pk, 'label': card.card_label or f'Card #{card.pk}', 'status': card.status} for card in eligible_cards],
        'summary': {'staff': staff.count(), 'active': staff.filter(is_active=True).count(), 'assigned': venue.card_assignments.count()},
    })


@require_http_methods(['GET'])
def venue_staff_public_api(request, public_identifier, staff_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    staff = get_object_or_404(VenueStaffProfile.objects.prefetch_related('links'), venue=venue, public_identifier=staff_identifier)
    return JsonResponse({
        'organization': {'name': venue.organization.name, 'logo': _file_url(request, venue.logo or venue.organization.logo), 'publicIdentifier': venue.public_identifier},
        'branding': {'primaryColor': venue.primary_color, 'secondaryColor': venue.secondary_color, 'coverImage': _file_url(request, venue.cover_image or venue.organization.cover_photo)},
        'staff': _staff_payload(request, staff) if staff.is_active else {'name': staff.name, 'position': staff.position, 'isActive': False},
    })


def _order_payload(order):
    return {
        'id': order.pk, 'publicIdentifier': order.public_identifier, 'number': order.order_number,
        'table': order.table.name if order.table_id else 'Counter', 'status': order.status,
        'customerName': order.customer_name, 'customerPhone': order.customer_phone, 'note': order.note,
        'verificationCode': order.verification_code, 'verificationExpiresAt': order.verification_expires_at.isoformat() if order.verification_expires_at else None,
        'verifiedAt': order.verified_at.isoformat() if order.verified_at else None, 'verifiedBy': order.verified_by,
        'cancellationReason': order.cancellation_reason,
        'tableSessionExpiresAt': order.table_session_expires_at.isoformat() if order.table_session_expires_at else None,
        'total': str(order.total), 'taxAmount': str(order.tax_amount),
        'serviceChargeAmount': str(order.service_charge_amount), 'discountAmount': str(order.discount_amount),
        'finalTotal': str(order.final_total), 'paymentStatus': order.payment_status,
        'paidAt': order.paid_at.isoformat() if order.paid_at else None, 'createdAt': order.created_at.isoformat(),
        'items': [{'id': item.pk, 'menuItemId': item.menu_item_id, 'name': item.name, 'unitPrice': str(item.unit_price), 'quantity': item.quantity, 'note': item.note, 'selectedVariant': item.selected_variant, 'addOns': item.add_ons, 'spiceLevel': item.spice_level} for item in order.items.all()],
    }


def _bill_amount(value, label):
    try:
        amount = Decimal(str(value or '0')).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f'Enter a valid {label}.')
    if amount < 0:
        raise ValidationError(f'{label.capitalize()} cannot be negative.')
    return amount


def _refresh_order_bill(order, *, tax_amount=None, service_charge_amount=None, discount_amount=None, payment_status=None):
    """Keep the payable amount consistent whenever an order or its bill changes."""
    tax = _bill_amount(order.tax_amount if tax_amount is None else tax_amount, 'tax amount')
    service = _bill_amount(order.service_charge_amount if service_charge_amount is None else service_charge_amount, 'service charge')
    discount = _bill_amount(order.discount_amount if discount_amount is None else discount_amount, 'discount')
    status = payment_status or order.payment_status
    if status not in dict(VenueOrder.PAYMENT_STATUS_CHOICES):
        raise ValidationError('Choose a valid payment status.')
    before_discount = order.total + tax + service
    if status == 'complimentary':
        discount = before_discount
    if discount > before_discount:
        raise ValidationError('Discount cannot be more than the bill total.')
    order.tax_amount = tax
    order.service_charge_amount = service
    order.discount_amount = discount
    order.final_total = before_discount - discount
    order.payment_status = status
    order.paid_at = timezone.now() if status in {'paid_cash', 'paid_online'} else None


def _expire_pending_orders(venue):
    """A photographed table QR may create a request, never a kitchen order."""
    now = timezone.now()
    return VenueOrder.objects.filter(venue=venue, status='new', verification_expires_at__isnull=False, verification_expires_at__lte=now).update(status='expired')


def _expire_table_sessions(venue):
    """A table QR remains reusable, but an open meal session cannot live forever."""
    now = timezone.now()
    return VenueOrder.objects.filter(
        venue=venue, status__in=['accepted', 'preparing', 'ready'],
        table_session_expires_at__isnull=False, table_session_expires_at__lte=now,
    ).update(status='cancelled', cancellation_reason='Table session expired')


def _kitchen_order_payload(order):
    """The kitchen needs food details, never customer or verification data."""
    return {
        'publicIdentifier': order.public_identifier,
        'number': order.order_number,
        'table': order.table.name if order.table_id else 'Counter',
        'status': order.status,
        'note': order.note,
        'createdAt': order.created_at.isoformat(),
        'items': [{'name': item.name, 'quantity': item.quantity, 'note': item.note, 'selectedVariant': item.selected_variant, 'addOns': item.add_ons, 'spiceLevel': item.spice_level} for item in order.items.all()],
    }


@require_http_methods(['GET', 'PATCH'])
def venue_kitchen_orders_api(request, public_identifier, access_token):
    venue = get_object_or_404(
        VenueProfile.objects.select_related('organization'), public_identifier=public_identifier,
        kitchen_access_token=access_token, is_active=True,
    )
    if 'ordering' not in enabled_organization_modules(venue.organization):
        return JsonResponse({'error': 'Kitchen ordering is not available for this café.'}, status=404)
    _expire_pending_orders(venue); _expire_table_sessions(venue)
    if request.method == 'PATCH':
        data = _body(request) or {}
        order = get_object_or_404(VenueOrder, venue=venue, public_identifier=str(data.get('order') or ''))
        target_status = str(data.get('status') or '')
        allowed_transitions = {'accepted': 'preparing', 'preparing': 'ready'}
        if allowed_transitions.get(order.status) != target_status:
            return JsonResponse({'error': 'Use the next order step shown on the kitchen display.'}, status=400)
        order.status = target_status
        order.save(update_fields=['status', 'updated_at'])
        _record_operational_activity(venue, 'kitchen_order_updated', f'Kitchen marked order #{order.order_number} {order.get_status_display().lower()}', request, {'orderId': order.public_identifier})
    orders = venue.orders.filter(status__in=['accepted', 'preparing']).select_related('table').prefetch_related('items')
    return JsonResponse({
        'organization': {'name': venue.organization.name, 'logo': _file_url(request, venue.logo or venue.organization.logo)},
        'orders': [_kitchen_order_payload(order) for order in orders],
    })


@require_http_methods(['POST'])
def venue_public_order_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    if 'ordering' not in enabled_organization_modules(venue.organization):
        return JsonResponse({'error': 'Online ordering is not available for this café.'}, status=404)
    data = _body(request) or {}
    rows = data.get('items')
    if not isinstance(rows, list) or not rows or len(rows) > 30:
        return JsonResponse({'error': 'Add at least one menu item to place an order.'}, status=400)
    table_identifier = str(data.get('table') or '').strip()
    table = VenueTouchpoint.objects.filter(venue=venue, public_identifier=table_identifier, destination='ordering', is_active=True).first()
    if not table:
        return JsonResponse({'error': 'This table QR code is no longer active. Ask the café for help.'}, status=400)
    try:
        with transaction.atomic():
            _expire_pending_orders(venue); _expire_table_sessions(venue)
            if venue.orders.filter(table=table, status='new', verification_expires_at__gt=timezone.now()).count() >= 3:
                return JsonResponse({'error': 'This table already has orders waiting for waiter verification. Please ask your waiter for help.'}, status=429)
            ordered_items, total = [], Decimal('0.00')
            for row in rows:
                if not isinstance(row, dict): raise ValidationError('One of the order items is invalid.')
                item = VenueMenuItem.objects.filter(venue=venue, public_identifier=str(row.get('id') or ''), is_published=True, is_available=True).first()
                quantity = int(row.get('quantity') or 0)
                if not item or quantity < 1 or quantity > 50: raise ValidationError('Choose available menu items and valid quantities.')
                variant_label = str(row.get('variant') or '').strip()[:80]
                variant_price = item.price
                if variant_label:
                    variant = item.price_variants.filter(label=variant_label).first()
                    if not variant: raise ValidationError('Choose a valid item size or variant.')
                    variant_price = variant.price
                selected_add_ons = row.get('addOns') or []
                if not isinstance(selected_add_ons, list) or len(selected_add_ons) > 20: raise ValidationError('Choose valid add-ons.')
                available_add_ons = {str(option.get('name') or ''): _bill_amount(option.get('price'), 'add-on price') for option in item.add_ons if isinstance(option, dict)}
                clean_add_ons = []
                for add_on in selected_add_ons:
                    name = str(add_on).strip()[:80]
                    if name not in available_add_ons: raise ValidationError('One of the selected add-ons is unavailable.')
                    clean_add_ons.append({'name': name, 'price': str(available_add_ons[name])})
                spice_level = str(row.get('spiceLevel') or '').strip()[:80]
                if spice_level and spice_level not in item.spice_levels: raise ValidationError('Choose a valid spice level.')
                unit_price = variant_price + sum((Decimal(option['price']) for option in clean_add_ons), Decimal('0.00'))
                total += unit_price * quantity
                ordered_items.append((item, unit_price, quantity, str(row.get('note') or '').strip()[:300], variant_label, clean_add_ons, spice_level))
            latest = venue.orders.select_for_update().order_by('-order_number').first()
            order = VenueOrder.objects.create(venue=venue, table=table, order_number=(latest.order_number if latest else 0) + 1, customer_name=str(data.get('customerName') or '').strip()[:120], customer_phone=str(data.get('customerPhone') or '').strip()[:40], note=str(data.get('note') or '').strip()[:1000], total=total, final_total=total, verification_code=f'{secrets.randbelow(10000):04d}', verification_expires_at=timezone.now() + timedelta(minutes=10), table_session_expires_at=timezone.now() + timedelta(hours=4))
            VenueOrderItem.objects.bulk_create([VenueOrderItem(order=order, menu_item=item, name=item.name, unit_price=unit_price, quantity=quantity, note=note, selected_variant=variant, add_ons=add_ons, spice_level=spice) for item, unit_price, quantity, note, variant, add_ons, spice in ordered_items])
    except (ValidationError, ValueError) as exc:
        return JsonResponse({'error': _validation_message(exc) if isinstance(exc, ValidationError) else 'Choose valid order quantities.'}, status=400)
    _record_operational_activity(venue, 'order_created', f'New table order #{order.order_number} from {table.name}', request, {'orderId': order.public_identifier, 'table': table.name})
    return JsonResponse({'order': _order_payload(VenueOrder.objects.prefetch_related('items').select_related('table').get(pk=order.pk))}, status=201)


@require_http_methods(['POST'])
def venue_public_waiter_call_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    if 'ordering' not in enabled_organization_modules(venue.organization):
        return JsonResponse({'error': 'Table service is not available for this café.'}, status=404)
    data = _body(request) or {}
    table = VenueTouchpoint.objects.filter(venue=venue, public_identifier=str(data.get('table') or ''), destination='ordering', is_active=True).first()
    if not table:
        return JsonResponse({'error': 'This table QR code is no longer active. Ask the café for help.'}, status=400)
    cutoff = timezone.now() - timedelta(minutes=3)
    if VenueWaiterCall.objects.filter(venue=venue, table=table, status='pending', created_at__gte=cutoff).exists():
        return JsonResponse({'error': 'Your waiter call is already pending. Someone will be with you shortly.'}, status=429)
    call = VenueWaiterCall.objects.create(venue=venue, table=table, note=str(data.get('note') or '').strip()[:300])
    _record_operational_activity(venue, 'waiter_called', f'Waiter requested at {table.name}', request, {'table': table.name, 'waiterCallId': call.pk})
    return JsonResponse({'ok': True})


@require_http_methods(['GET', 'POST', 'PATCH'])
def venue_orders_manage_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'ordering')
    if not venue:
        return JsonResponse({'error': 'Ordering is not included in this organization’s plan.'}, status=403)
    role = organization_role(request.user, venue.organization)
    if role not in {'owner', 'manager', 'waiter', 'kitchen'}:
        return JsonResponse({'error': 'This role cannot access the order workspace.'}, status=403)
    if request.method == 'POST':
        if role not in {'owner', 'manager'}:
            return JsonResponse({'error': 'Only owners and managers can create table QR codes.'}, status=403)
        data = _body(request) or {}
        name = str(data.get('tableName') or '').strip()
        if not name:
            return JsonResponse({'error': 'Enter a table name.'}, status=400)
        try:
            table = VenueTouchpoint.objects.create(venue=venue, name=name[:120], destination='ordering', is_active=True)
        except IntegrityError:
            return JsonResponse({'error': 'A table with that name already exists.'}, status=409)
        _record_operational_activity(venue, 'ordering_table_created', f'Created table ordering QR for {table.name}', request)
    _expire_pending_orders(venue); _expire_table_sessions(venue)
    if request.method == 'PATCH':
        data = _body(request) or {}
        action = str(data.get('action') or '')
        if role == 'kitchen' and action:
            return JsonResponse({'error': 'Kitchen staff can only update preparation status.'}, status=403)
        if role == 'waiter' and action not in {'', 'approve', 'edit'}:
            return JsonResponse({'error': 'Waiters can verify, edit, and complete orders only.'}, status=403)
        order = None if action == 'acknowledge_waiter_call' else get_object_or_404(VenueOrder, venue=venue, pk=data.get('id'))
        if action == 'acknowledge_waiter_call':
            call = get_object_or_404(VenueWaiterCall, venue=venue, pk=data.get('waiterCallId'), status='pending')
            call.status = 'acknowledged'; call.acknowledged_at = timezone.now()
            call.save(update_fields=['status', 'acknowledged_at'])
            _record_operational_activity(venue, 'waiter_call_acknowledged', f'Waiter call acknowledged at {call.table.name}', request, {'waiterCallId': call.pk, 'table': call.table.name})
        elif action == 'approve':
            code = str(data.get('verificationCode') or '').strip()
            if order.status != 'new':
                return JsonResponse({'error': 'Only pending orders can be verified.'}, status=400)
            if not order.verification_expires_at or order.verification_expires_at <= timezone.now():
                order.status = 'expired'; order.save(update_fields=['status', 'updated_at'])
                return JsonResponse({'error': 'This verification code has expired. Ask the customer to place a new order.'}, status=400)
            if not hmac.compare_digest(order.verification_code, code):
                return JsonResponse({'error': 'That verification code does not match this order.'}, status=400)
            order.status = 'accepted'; order.verified_at = timezone.now(); order.verified_by = request.user.get_full_name() or request.user.username
            order.save(update_fields=['status', 'verified_at', 'verified_by', 'updated_at'])
            _record_operational_activity(venue, 'order_verified', f'Order #{order.order_number} verified at {order.table.name if order.table_id else "Counter"}', request, {'orderId': order.public_identifier})
        elif action == 'reject':
            if order.status != 'new': return JsonResponse({'error': 'Only pending orders can be rejected.'}, status=400)
            reason = str(data.get('cancellationReason') or '').strip()[:300]
            if len(reason) < 3: return JsonResponse({'error': 'Add a short reason for rejecting this order.'}, status=400)
            order.status = 'cancelled'; order.cancellation_reason = reason; order.save(update_fields=['status', 'cancellation_reason', 'updated_at'])
            _record_operational_activity(venue, 'order_rejected', f'Order #{order.order_number} rejected: {reason}', request, {'orderId': order.public_identifier})
        elif action == 'merge':
            source = get_object_or_404(VenueOrder.objects.prefetch_related('items'), venue=venue, pk=data.get('sourceOrderId'))
            if source.pk == order.pk or not order.table_id or source.table_id != order.table_id:
                return JsonResponse({'error': 'Choose another active order from the same table.'}, status=400)
            if order.status not in {'new', 'accepted'} or source.status != order.status:
                return JsonResponse({'error': 'Only orders at the same pending or verified stage can be merged.'}, status=400)
            if order.payment_status != 'unpaid' or source.payment_status != 'unpaid':
                return JsonResponse({'error': 'Only unpaid orders can be merged. Settle the orders separately instead.'}, status=400)
            with transaction.atomic():
                for row in source.items.all():
                    matching = order.items.filter(menu_item_id=row.menu_item_id, name=row.name, unit_price=row.unit_price, note=row.note).first()
                    if matching and matching.quantity + row.quantity <= 50:
                        matching.quantity += row.quantity
                        matching.save(update_fields=['quantity'])
                    else:
                        VenueOrderItem.objects.create(order=order, menu_item=row.menu_item, name=row.name, unit_price=row.unit_price, quantity=row.quantity, note=row.note)
                order.total += source.total
                _refresh_order_bill(order)
                order.save(update_fields=['total', 'tax_amount', 'service_charge_amount', 'discount_amount', 'final_total', 'payment_status', 'paid_at', 'updated_at'])
                source.status = 'cancelled'; source.cancellation_reason = f'Merged into order #{order.order_number}'
                source.save(update_fields=['status', 'cancellation_reason', 'updated_at'])
            _record_operational_activity(venue, 'orders_merged', f'Merged order #{source.order_number} into #{order.order_number} at {order.table.name}', request, {'orderId': order.public_identifier, 'mergedOrderId': source.public_identifier})
        elif action == 'billing':
            if order.status in {'new', 'cancelled', 'expired'}:
                return JsonResponse({'error': 'Verify an active order before updating its bill.'}, status=400)
            try:
                _refresh_order_bill(
                    order,
                    tax_amount=data.get('taxAmount'),
                    service_charge_amount=data.get('serviceChargeAmount'),
                    discount_amount=data.get('discountAmount'),
                    payment_status=str(data.get('paymentStatus') or 'unpaid'),
                )
            except ValidationError as exc:
                return JsonResponse({'error': _validation_message(exc)}, status=400)
            order.save(update_fields=['tax_amount', 'service_charge_amount', 'discount_amount', 'final_total', 'payment_status', 'paid_at', 'updated_at'])
            _record_operational_activity(venue, 'order_billing_updated', f'Billing updated for order #{order.order_number}', request, {'orderId': order.public_identifier, 'paymentStatus': order.payment_status, 'finalTotal': str(order.final_total)})
        elif action == 'loyalty_award':
            if role not in {'owner', 'manager'}:
                return JsonResponse({'error': 'Only owners and managers can award loyalty from an order.'}, status=403)
            if order.status in {'new', 'cancelled', 'expired'} or order.payment_status not in {'paid_cash', 'paid_online'}:
                return JsonResponse({'error': 'Record a paid cash or online payment before awarding loyalty for this order.'}, status=400)
            if 'loyalty' not in enabled_organization_modules(venue.organization):
                return JsonResponse({'error': 'Loyalty is not included in this organization’s plan.'}, status=403)
            program = VenueRewardsProgram.objects.filter(venue=venue, is_active=True).first()
            if not program:
                return JsonResponse({'error': 'Activate the loyalty program before awarding this order.'}, status=400)
            membership_identifier = str(data.get('memberId') or '').replace('T2C-LOYALTY:', '').strip()
            if not membership_identifier:
                return JsonResponse({'error': 'Scan or enter the loyalty member code.'}, status=400)
            reference = f'order:{order.public_identifier}'
            try:
                with transaction.atomic():
                    membership = VenueLoyaltyMembership.objects.select_for_update().select_related('customer').get(
                        venue=venue, public_identifier=membership_identifier, is_active=True,
                    )
                    if VenueRewardsTransaction.objects.filter(venue=venue, transaction_type='earn', receipt_reference=reference).exists():
                        return JsonResponse({'error': 'Loyalty was already awarded for this order.'}, status=409)
                    _expire_rewards_if_needed(membership, program)
                    if order.final_total < program.minimum_order_amount:
                        return JsonResponse({'error': f'This paid order must be at least Rs. {program.minimum_order_amount} to collect loyalty credit.'}, status=400)
                    if program.program_type == 'stamps':
                        membership.stamp_goal = program.stamp_goal
                        membership.stamp_count += 1
                        amount, balance_after = Decimal('1.00'), Decimal(membership.stamp_count)
                        summary = f'Added 1 stamp from order #{order.order_number} for {membership.customer.phone_e164}'
                    else:
                        rate = program.points_per_currency if program.program_type == 'points' else program.reward_rate_percent / Decimal('100')
                        amount = (order.final_total * rate).quantize(Decimal('0.01'))
                        membership.reward_balance += amount
                        membership.lifetime_rewards_earned += amount
                        balance_after = membership.reward_balance
                        unit = 'points' if program.program_type == 'points' else 'rewards'
                        summary = f'Added {amount} {unit} from order #{order.order_number} for {membership.customer.phone_e164}'
                    membership.last_activity_at = timezone.now()
                    membership.save(update_fields=['stamp_count', 'stamp_goal', 'reward_balance', 'lifetime_rewards_earned', 'last_activity_at', 'updated_at'])
                    VenueRewardsTransaction.objects.create(
                        venue=venue, membership=membership, transaction_type='earn', reward_amount=amount,
                        balance_after=balance_after, order_amount=order.final_total, receipt_reference=reference,
                        idempotency_key=f'order-{order.public_identifier[:56]}', created_by=request.user,
                    )
            except VenueLoyaltyMembership.DoesNotExist:
                return JsonResponse({'error': 'This loyalty member was not found for the café.'}, status=404)
            _record_operational_activity(venue, 'order_loyalty_awarded', summary, request, {'orderId': order.public_identifier, 'membershipId': membership.public_identifier, 'amount': str(amount)})
        elif action == 'edit':
            if order.status not in {'new', 'accepted', 'preparing'}:
                return JsonResponse({'error': 'Only pending, verified, or preparing orders can be changed.'}, status=400)
            rows = data.get('items')
            if not isinstance(rows, list) or not rows: return JsonResponse({'error': 'Keep at least one item in the order.'}, status=400)
            existing = {item.pk: item for item in order.items.all()}
            total = Decimal('0.00'); kept = set(); changes = []
            try:
                for row in rows:
                    if not isinstance(row, dict): raise ValueError
                    quantity = int(row.get('quantity'))
                    if quantity < 1 or quantity > 50: raise ValueError
                    note = str(row.get('note') or '').strip()[:300]
                    item_id = row.get('id')
                    if item_id:
                        item = existing.get(int(item_id))
                        if not item: raise ValueError
                        changes.append((item, quantity, note))
                    else:
                        menu_item = VenueMenuItem.objects.filter(
                            venue=venue, pk=int(row.get('menuItemId')), is_published=True, is_available=True,
                        ).first()
                        if not menu_item: raise ValueError
                        item = VenueOrderItem(order=order, menu_item=menu_item, name=menu_item.name, unit_price=menu_item.price)
                        changes.append((item, quantity, note))
                    total += item.unit_price * quantity
            except (TypeError, ValueError):
                return JsonResponse({'error': 'Use available menu items and quantities between 1 and 50.'}, status=400)
            with transaction.atomic():
                for item, quantity, note in changes:
                    item.quantity = quantity; item.note = note
                    if item.pk:
                        item.save(update_fields=['quantity', 'note'])
                    else:
                        item.save()
                    kept.add(item.pk)
                order.items.exclude(pk__in=kept).delete()
                order.note = str(data.get('note') or '').strip()[:1000]
                order.total = total
                _refresh_order_bill(order)
                order.save(update_fields=['note', 'total', 'tax_amount', 'service_charge_amount', 'discount_amount', 'final_total', 'payment_status', 'paid_at', 'updated_at'])
            _record_operational_activity(venue, 'order_edited', f'Order #{order.order_number} edited before verification', request, {'orderId': order.public_identifier})
        else:
            status = str(data.get('status') or '')
            if role == 'kitchen' and (order.status, status) not in {('accepted', 'preparing'), ('preparing', 'ready')}:
                return JsonResponse({'error': 'Kitchen staff can only start preparing or mark an order ready.'}, status=403)
            if role == 'waiter' and (order.status, status) != ('ready', 'completed'):
                return JsonResponse({'error': 'Waiters can only mark ready orders as served.'}, status=403)
            if order.status == 'new' or status == 'accepted':
                return JsonResponse({'error': 'Verify the customer code before changing this order.'}, status=400)
            if status not in dict(VenueOrder.STATUS_CHOICES):
                return JsonResponse({'error': 'Choose a valid order status.'}, status=400)
            allowed_transitions = {
                'accepted': {'preparing', 'cancelled'},
                'preparing': {'ready', 'cancelled'},
                'ready': {'completed', 'cancelled'},
            }
            if status not in allowed_transitions.get(order.status, set()):
                return JsonResponse({'error': 'Use the next order step shown in the queue.'}, status=400)
            if status == 'cancelled':
                reason = str(data.get('cancellationReason') or '').strip()[:300]
                if len(reason) < 3: return JsonResponse({'error': 'Add a short reason for cancelling this order.'}, status=400)
                order.cancellation_reason = reason
            order.status = status; order.save(update_fields=['status', 'cancellation_reason', 'updated_at'])
            _record_operational_activity(venue, 'order_status_updated', f'Order #{order.order_number} marked {order.get_status_display().lower()}', request, {'orderId': order.public_identifier})
    status_filter = request.GET.get('status', '')
    orders = venue.orders.select_related('table').prefetch_related('items')
    if role == 'kitchen':
        orders = orders.filter(status__in=['accepted', 'preparing'])
    if status_filter in dict(VenueOrder.STATUS_CHOICES): orders = orders.filter(status=status_filter)
    menu_items = venue.menu_items.filter(is_published=True, is_available=True).order_by('category__display_order', 'display_order', 'name')
    calls = venue.waiter_calls.filter(status='pending').select_related('table')[:50]
    if role == 'kitchen':
        order_payloads = [{
            'id': order.pk, 'number': order.order_number, 'table': order.table.name if order.table_id else 'Counter',
            'status': order.status, 'note': order.note, 'createdAt': order.created_at.isoformat(),
            'total': '0.00', 'taxAmount': '0.00', 'serviceChargeAmount': '0.00', 'discountAmount': '0.00',
            'finalTotal': '0.00', 'paymentStatus': 'unpaid', 'items': [
                {'id': item.pk, 'name': item.name, 'quantity': item.quantity, 'note': item.note,
                 'selectedVariant': item.selected_variant, 'addOns': item.add_ons, 'spiceLevel': item.spice_level}
                for item in order.items.all()
            ],
        } for order in orders[:100]]
    else:
        rewarded_references = set(venue.rewards_transactions.filter(transaction_type='earn', receipt_reference__startswith='order:').values_list('receipt_reference', flat=True))
        order_payloads = []
        for order in orders[:100]:
            payload = _order_payload(order)
            payload['loyaltyRewarded'] = f'order:{order.public_identifier}' in rewarded_references
            order_payloads.append(payload)
    program = VenueRewardsProgram.objects.filter(venue=venue, is_active=True).first() if 'loyalty' in enabled_organization_modules(venue.organization) else None
    return JsonResponse({
        'orders': order_payloads,
        'tables': [] if role == 'kitchen' else [{'id': item.pk, 'name': item.name, 'publicIdentifier': item.public_identifier, 'qrUrl': request.build_absolute_uri(f'/venue/{venue.public_identifier}/?tab=menu&source={item.public_identifier}&entry=qr&order=1')} for item in venue.touchpoints.filter(destination='ordering').order_by('name')],
        'menuItems': [] if role == 'kitchen' else [{'id': item.pk, 'name': item.name, 'price': str(item.price)} for item in menu_items],
        'kitchenUrl': '' if role == 'kitchen' else request.build_absolute_uri(f'/venue/{venue.public_identifier}/kitchen/{venue.kitchen_access_token}/'),
        'waiterCalls': [] if role == 'kitchen' else [{'id': row.pk, 'table': row.table.name, 'note': row.note, 'createdAt': row.created_at.isoformat()} for row in calls],
        'loyalty': _rewards_program_payload(program) if program and role != 'kitchen' else {'isActive': False},
    })


@require_http_methods(['GET'])
def venue_card_public_api(request, public_identifier):
    assignment = get_object_or_404(VenueCardAssignment.objects.select_related('venue__organization', 'staff', 'touchpoint'), public_identifier=public_identifier)
    active = assignment.is_active and assignment.venue.is_active
    if assignment.staff_id:
        active = active and assignment.staff.is_active
        destination = request.build_absolute_uri(f'/venue/{assignment.venue.public_identifier}/staff/{assignment.staff.public_identifier}/?source={assignment.public_identifier}&entry=nfc')
        label = assignment.staff.name
    else:
        active = active and assignment.touchpoint.is_active
        destination = _touchpoint_destination(request, assignment.touchpoint, 'nfc')
        label = assignment.touchpoint.name
    return JsonResponse({
        'active': active, 'destination': destination if active else '', 'label': label,
        'organization': {'name': assignment.venue.organization.name, 'logo': _file_url(request, assignment.venue.logo or assignment.venue.organization.logo)},
        'message': '' if active else 'This card is inactive. Please contact the business for an updated link.',
    })


@require_http_methods(['GET'])
def venue_analytics_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'analytics')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    try:
        return JsonResponse({'analytics': _analytics_payload(request, venue)})
    except ValueError as error:
        return JsonResponse({'error': str(error)}, status=400)


def _analytics_range(request, venue, overview_days=None):
    tz = _venue_timezone(venue)
    today = timezone.now().astimezone(tz).date()
    if overview_days:
        return 'last_7_days' if overview_days == 7 else f'last_{overview_days}_days', today - timedelta(days=overview_days - 1), today
    preset = str(request.GET.get('range') or 'last_7_days')
    if preset == 'today':
        return preset, today, today
    if preset == 'last_7_days':
        return preset, today - timedelta(days=6), today
    if preset == 'last_30_days':
        return preset, today - timedelta(days=29), today
    if preset != 'custom':
        raise ValueError('Choose Today, Last 7 days, Last 30 days, or a custom date range.')
    try:
        first_day = date.fromisoformat(str(request.GET.get('start') or ''))
        last_day = date.fromisoformat(str(request.GET.get('end') or ''))
    except ValueError:
        raise ValueError('Custom dates must use YYYY-MM-DD.')
    if first_day > last_day or (last_day - first_day).days > 365:
        raise ValueError('Choose a valid custom range of up to 366 days.')
    return preset, first_day, last_day


def _range_bounds(first_day, last_day, tz):
    start = timezone.make_aware(datetime.combine(first_day, time.min), tz)
    end = timezone.make_aware(datetime.combine(last_day + timedelta(days=1), time.min), tz)
    return start, end


def _analytics_payload(request, venue, overview_days=None):
    preset, first_day, last_day = _analytics_range(request, venue, overview_days)
    tz = _venue_timezone(venue)
    start, end = _range_bounds(first_day, last_day, tz)
    length = (last_day - first_day).days + 1
    previous_first_day = first_day - timedelta(days=length)
    previous_start, previous_end = _range_bounds(previous_first_day, first_day - timedelta(days=1), tz)
    events = venue.analytics_events.filter(created_at__gte=start, created_at__lt=end)
    previous_events = venue.analytics_events.filter(created_at__gte=previous_start, created_at__lt=previous_end)
    event_rows = list(events.values('event_type', 'target', 'visitor_hash', 'created_at'))

    def count_event(rows, event_type):
        return sum(1 for row in rows if row['event_type'] == event_type)

    def metric_rows(rows):
        return {
            'profileViews': count_event(rows, 'profile_view'),
            'menuOpens': count_event(rows, 'menu_open'),
            'menuItemDetailViews': count_event(rows, 'menu_item_click'),
            'linkClicks': sum(1 for row in rows if row['event_type'] in {'social_click', 'google_review_click'}),
            'googleReviewClicks': count_event(rows, 'google_review_click'),
            'feedbackSubmissions': count_event(rows, 'feedback_submit'),
        }

    metrics = metric_rows(event_rows)
    previous_metrics = metric_rows(list(previous_events.values('event_type', 'target', 'visitor_hash', 'created_at')))
    identified_profile_views = [row for row in event_rows if row['event_type'] == 'profile_view' and row['visitor_hash']]
    unique_estimate = len({row['visitor_hash'] for row in identified_profile_views}) if identified_profile_views else None
    daily = {str(first_day + timedelta(days=index)): {'profileViews': 0, 'menuOpens': 0, 'linkClicks': 0, 'feedbackSubmissions': 0} for index in range(length)}
    destinations, menu_items, touchpoints = {}, {}, {}
    known_touchpoints = {touchpoint.public_identifier: touchpoint.name for touchpoint in venue.touchpoints.all()}
    for row in event_rows:
        day = timezone.localtime(row['created_at'], tz).date().isoformat()
        row_metrics = daily.get(day)
        if row_metrics:
            if row['event_type'] == 'profile_view': row_metrics['profileViews'] += 1
            elif row['event_type'] == 'menu_open': row_metrics['menuOpens'] += 1
            elif row['event_type'] == 'feedback_submit': row_metrics['feedbackSubmissions'] += 1
            elif row['event_type'] in {'social_click', 'google_review_click'}: row_metrics['linkClicks'] += 1
        parsed = _target_parts(row['target'])
        if row['event_type'] in {'social_click', 'google_review_click'}:
            destination = parsed.get('destination') or ('google_review' if row['event_type'] == 'google_review_click' else row['target'] or 'other')
            destinations[destination] = destinations.get(destination, 0) + 1
        if row['event_type'] == 'menu_item_click':
            item = parsed.get('detail') or row['target'] or 'Menu item'
            menu_items[item] = menu_items.get(item, 0) + 1
        source = parsed.get('source')
        if source and source in known_touchpoints:
            entry = touchpoints.setdefault(source, {'name': known_touchpoints[source], 'profileViews': 0, 'menuOpens': 0, 'linkClicks': 0, 'feedbackSubmissions': 0})
            if row['event_type'] == 'profile_view': entry['profileViews'] += 1
            elif row['event_type'] == 'menu_open': entry['menuOpens'] += 1
            elif row['event_type'] == 'feedback_submit': entry['feedbackSubmissions'] += 1
            elif row['event_type'] in {'social_click', 'google_review_click'}: entry['linkClicks'] += 1
    feedback = venue.feedback.filter(created_at__gte=start, created_at__lt=end)
    feedback_summary = feedback.aggregate(count=Count('id'), average=Avg('rating'))
    rating_breakdown = {str(value): 0 for value in range(1, 6)}
    for row in feedback.values('rating').annotate(count=Count('id')):
        rating_breakdown[str(row['rating'])] = row['count']
    order_rows = list(
        venue.orders.filter(created_at__gte=start, created_at__lt=end)
        .select_related('table').prefetch_related('items__menu_item__category')
    )
    fulfilled_orders = [row for row in order_rows if row.status in {'accepted', 'preparing', 'ready', 'completed'}]
    cancelled_orders = [row for row in order_rows if row.status in {'cancelled', 'expired'}]
    daily_orders = {str(first_day + timedelta(days=index)): {'orders': 0, 'amount': Decimal('0.00')} for index in range(length)}
    tables, ordered_items, categories = {}, {}, {}
    order_total = Decimal('0.00')
    for order in fulfilled_orders:
        day = timezone.localtime(order.created_at, tz).date().isoformat()
        if day in daily_orders:
            daily_orders[day]['orders'] += 1
            daily_orders[day]['amount'] += order.final_total
        order_total += order.final_total
        table_name = order.table.name if order.table_id else 'Counter'
        table = tables.setdefault(table_name, {'name': table_name, 'orders': 0, 'amount': Decimal('0.00')})
        table['orders'] += 1
        table['amount'] += order.final_total
        for item in order.items.all():
            item_row = ordered_items.setdefault(item.name, {'name': item.name, 'quantity': 0, 'amount': Decimal('0.00')})
            item_row['quantity'] += item.quantity
            item_row['amount'] += item.unit_price * item.quantity
            category_name = item.menu_item.category.name if item.menu_item_id and item.menu_item and item.menu_item.category_id else 'Uncategorised'
            category = categories.setdefault(category_name, {'name': category_name, 'quantity': 0, 'amount': Decimal('0.00')})
            category['quantity'] += item.quantity
            category['amount'] += item.unit_price * item.quantity
    order_analytics = {
        'summary': {
            'orders': len(fulfilled_orders),
            'averageOrderValue': str((order_total / len(fulfilled_orders)).quantize(Decimal('0.01')) if fulfilled_orders else Decimal('0.00')),
            'cancelledOrders': len(cancelled_orders),
            'grossSales': str(order_total.quantize(Decimal('0.01'))),
        },
        'daily': [{'date': day, 'orders': values['orders'], 'amount': str(values['amount'].quantize(Decimal('0.01')))} for day, values in daily_orders.items()],
        'tables': [{'name': row['name'], 'orders': row['orders'], 'amount': str(row['amount'].quantize(Decimal('0.01')))} for row in sorted(tables.values(), key=lambda row: (-row['orders'], -row['amount'], row['name']))[:10]],
        'items': [{'name': row['name'], 'quantity': row['quantity'], 'amount': str(row['amount'].quantize(Decimal('0.01')))} for row in sorted(ordered_items.values(), key=lambda row: (-row['quantity'], -row['amount'], row['name']))[:10]],
        'categories': [{'name': row['name'], 'quantity': row['quantity'], 'amount': str(row['amount'].quantize(Decimal('0.01')))} for row in sorted(categories.values(), key=lambda row: (-row['quantity'], -row['amount'], row['name']))[:10]],
    }
    return {
        'range': {'preset': preset, 'startDate': first_day.isoformat(), 'endDate': last_day.isoformat(), 'timezone': str(tz)},
        'metrics': {**metrics, 'estimatedUniqueVisitors': unique_estimate},
        'previousMetrics': previous_metrics,
        'daily': [{'date': day, **values} for day, values in daily.items()],
        'linkDestinations': [{'destination': key, 'count': value} for key, value in sorted(destinations.items(), key=lambda item: (-item[1], item[0]))[:10]],
        'menuItems': [{'name': key, 'count': value} for key, value in sorted(menu_items.items(), key=lambda item: (-item[1], item[0]))[:10]],
        'touchpointActivity': [dict(source=source, **value) for source, value in sorted(touchpoints.items(), key=lambda item: (-sum(item[1][key] for key in ('profileViews', 'menuOpens', 'linkClicks', 'feedbackSubmissions')), item[1]['name']))],
        'feedback': {'count': feedback_summary['count'], 'average': feedback_summary['average'], 'ratingBreakdown': rating_breakdown},
        'orders': order_analytics,
        'definitions': {
            'profileViews': 'Recorded customer public-profile loads. Dashboard previews marked as previews are excluded; rapid repeats are deduplicated.',
            'estimatedUniqueVisitors': 'Estimate from a privacy-preserving browser and network fingerprint. Shared devices and changing networks can affect it.',
            'menuItemDetailViews': 'Customer menu-item detail opens; these are not orders or sales.',
            'googleReviewClicks': 'Google review button clicks only. They do not confirm a posted Google review.',
            'feedbackSubmissions': 'Successful Tap2Connect feedback form submissions. Imported Google reviews are not included.',
        },
    }


@require_http_methods(['GET'])
def venue_overview_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'overview')
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)

    try:
        days = int(request.GET.get('days', '7'))
    except (TypeError, ValueError):
        days = 7
    if days not in {7, 30, 90}:
        return JsonResponse({'error': 'Choose a 7, 30, or 90 day period.'}, status=400)

    analytics = _analytics_payload(request, venue, overview_days=days)
    tz = _venue_timezone(venue)
    start, end = _range_bounds(date.fromisoformat(analytics['range']['startDate']), date.fromisoformat(analytics['range']['endDate']), tz)
    feedback = venue.feedback.all()
    current_feedback = feedback.filter(created_at__gte=start, created_at__lt=end)

    recent_feedback = list(current_feedback.order_by('-created_at').values(
        'id', 'rating', 'comment', 'status', 'created_at'
    )[:5])
    for row in recent_feedback:
        row['created_at'] = row['created_at'].isoformat()

    item_count = venue.menu_items.filter(is_published=True).count()
    enabled_modules = enabled_organization_modules(venue.organization)
    loyalty_metrics = None
    if 'loyalty' in enabled_modules:
        loyalty_activity = venue.rewards_transactions.filter(created_at__gte=start, created_at__lt=end)
        loyalty_metrics = {
            'activeMembers': venue.loyalty_memberships.filter(is_active=True).count(),
            'activityCount': loyalty_activity.count(),
            'earnedCount': loyalty_activity.filter(transaction_type='earn').count(),
            'redeemedCount': loyalty_activity.filter(transaction_type='redeem').count(),
        }
    organizations = College.objects.filter(organization_type='hospitality').order_by('name')
    if not request.user.is_superuser:
        organizations = organizations.filter(admin_user=request.user)
    setup = [
        {'key': 'profile', 'label': 'Profile details published',
         'complete': bool(venue.is_active and venue.description.strip() and (venue.organization.phone or venue.organization.email))},
        {'key': 'menu', 'label': 'Menu has items', 'complete': item_count > 0},
        {'key': 'feedback', 'label': 'Feedback form enabled', 'complete': venue.feedback_enabled},
    ]
    return JsonResponse({
        'days': days,
        'metrics': {key: analytics['metrics'][key] for key in ('profileViews', 'menuOpens', 'googleReviewClicks', 'feedbackSubmissions')},
        'previousMetrics': {key: analytics['previousMetrics'][key] for key in ('profileViews', 'menuOpens', 'googleReviewClicks', 'feedbackSubmissions')},
        'dailyVisits': [{'date': row['date'], 'count': row['profileViews']} for row in analytics['daily']],
        'recentFeedback': recent_feedback,
        'setup': setup,
        'readiness': {
            'profileReady': setup[0]['complete'],
            'menuItemCount': item_count,
            'feedbackEnabled': venue.feedback_enabled,
        },
        'organizations': [{'id': item.pk, 'name': item.name} for item in organizations],
        'trackingNotes': {
            'profileViews': analytics['definitions']['profileViews'],
            'googleReviewClicks': analytics['definitions']['googleReviewClicks'],
        },
        'enabledModules': sorted(enabled_modules),
        'loyaltyMetrics': loyalty_metrics,
    })
