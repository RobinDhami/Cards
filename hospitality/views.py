import hashlib
import hmac
import json
import re
from datetime import date, datetime, time, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.utils.text import slugify

from .models import (
    VenueAnalyticsEvent, VenueCardAssignment, VenueFeedback, VenueLink,
    VenueMenuCategory, VenueMenuItem, VenueMenuItemVariant, VenueProfile,
    VenueStaffLink, VenueStaffProfile, VenueTouchpoint,
)
from django.contrib.auth import get_user_model
from vcards.models import CardBatchCard, College, OrganizationNotificationPreference, OrganizationTeamMember
from vcards.organization_access import ROLE_CAPABILITIES, accessible_organizations, can_access_organization, ensure_organization_owner, organization_role


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
    links = list(venue.links.order_by('display_order', 'id').values('id', 'link_type', 'label', 'value', 'display_order', 'is_active'))
    existing = {link['link_type'] for link in links}
    legacy = [('facebook', 'Facebook', venue.organization.facebook), ('instagram', 'Instagram', venue.organization.instagram), ('linkedin', 'LinkedIn', venue.organization.linkedin), ('x', 'X', venue.organization.twitter)]
    for link_type, label, value in legacy:
        if value and link_type not in existing:
            links.append({'id': 0, 'link_type': link_type, 'label': label, 'value': value, 'display_order': len(links), 'is_active': True, 'legacy': True})
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
    categories = []
    for category in venue.menu_categories.filter(is_active=True):
        items = [{
            'id': str(item.public_identifier), 'name': item.name,
            'description': item.description, 'image': _file_url(request, item.image),
            'price': str(item.price), 'originalPrice': str(item.original_price) if item.original_price is not None else '', 'offerLabel': item.offer_label, 'dietaryInfo': item.dietary_info,
            'isVegetarian': item.is_vegetarian, 'isAvailable': item.is_available,
            'isTodaySpecial': _timed_attribute_active(item.is_today_special, item.special_starts_at, item.special_ends_at),
            'isOffer': _timed_attribute_active(item.is_offer, item.offer_starts_at, item.offer_ends_at),
            'priceVariants': [{'label': variant.label, 'price': str(variant.price)} for variant in item.price_variants.all()],
        } for item in category.items.filter(is_published=True).prefetch_related('price_variants')]
        if items:
            categories.append({'name': category.name, 'slug': category.slug, 'items': items})
    return {
        'organization': {'id': venue.organization_id, 'name': venue.organization.name},
        'venue': {'publicIdentifier': venue.public_identifier, 'type': venue.venue_type, 'description': venue.description or venue.organization.description or '',
                  'logo': _file_url(request, venue.logo or venue.organization.logo), 'coverImage': _file_url(request, venue.cover_image or venue.organization.cover_photo),
                  'primaryColor': venue.primary_color, 'secondaryColor': venue.secondary_color,
                  'phone': venue.organization.phone or '', 'whatsapp': venue.whatsapp, 'email': venue.organization.email or '',
                  'website': venue.organization.website or '', 'address': venue.organization.address or '',
                  'mapUrl': venue.organization.map_url or '', 'googleReviewUrl': venue.google_review_url,
                  'reservationUrl': venue.reservation_url, 'openingHours': venue.opening_hours,
                  'openingSchedule': venue.opening_schedule, 'whatsappSameAsPhone': venue.whatsapp_same_as_phone},
        'links': list(venue.links.filter(is_active=True).order_by('display_order', 'id').values('id', 'link_type', 'label', 'value', 'display_order', 'is_active')),
        'rating': {'average': venue.feedback.aggregate(average=Avg('rating'))['average'] or 0, 'count': venue.feedback.count()},
        'categories': categories, 'feedbackEnabled': venue.feedback_enabled,
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


def _hospitality_shell(request, organization, role):
    organizations = accessible_organizations(request.user).filter(organization_type='hospitality').order_by('name')
    return {
        'isSuperAdmin': request.user.is_superuser,
        'role': role,
        'capabilities': sorted({'overview', 'profile', 'menu', 'feedback', 'staff', 'analytics', 'settings', 'team'} & ({'overview', 'profile', 'menu', 'feedback', 'staff', 'analytics', 'settings', 'team'} if request.user.is_superuser else ROLE_CAPABILITIES.get(role, set()))),
        'currentSchool': {'id': organization.pk, 'name': organization.name, 'logo': _file_url(request, organization.logo), 'organizationType': organization.organization_type, 'themePrimary': organization.theme_primary},
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
        if role == 'owner' or request.user.is_superuser:
            response['team'] = [{**_team_payload(member), 'isCurrentUser': member.user_id == request.user.id} for member in organization.team_members.select_related('user').all()]
        return JsonResponse(response)
    if request.method == 'PATCH':
        data = _body(request) or {}
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
        if invite_role not in {'owner', 'manager', 'menu_editor'}:
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
        if new_role not in {'owner', 'manager', 'menu_editor'}:
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
                organization_fields = {'name': 'name', 'address': 'address', 'phone': 'phone', 'email': 'email', 'website': 'website', 'map_url': 'map_url'}
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
                        value = _web_url(row.get('value'), 'Social link')
                        label = str(row.get('label') or row.get('link_type') or '').strip()[:120]
                        link_type = str(row.get('link_type') or 'website').strip()[:40]
                        link = venue.links.filter(pk=row.get('id')).first() if row.get('id') else VenueLink(venue=venue)
                        if link is None:
                            raise ValidationError('A social link no longer exists.')
                        link.link_type, link.label, link.value = link_type, label, value
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
        return JsonResponse({'ok': True})
    category = get_object_or_404(VenueMenuCategory, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuCategory(venue=venue)
    try:
        for key in ('name', 'slug', 'display_order', 'is_active'):
            if key in data: setattr(category, key, data[key])
        category.full_clean(); category.save()
    except ValidationError as exc:
        return JsonResponse({'message': _validation_message(exc)}, status=400)
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
        get_object_or_404(VenueMenuItem, pk=data.get('id'), venue=venue).delete()
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
                dietary_info=source.dietary_info, is_vegetarian=source.is_vegetarian, is_available=source.is_available,
                is_published=False, is_today_special=source.is_today_special, is_offer=source.is_offer,
                special_starts_at=source.special_starts_at, special_ends_at=source.special_ends_at,
                offer_starts_at=source.offer_starts_at, offer_ends_at=source.offer_ends_at,
                display_order=venue.menu_items.count(),
            )
            VenueMenuItemVariant.objects.bulk_create([VenueMenuItemVariant(item=duplicate, label=row.label, price=row.price, display_order=row.display_order) for row in source.price_variants.all()])
        return JsonResponse({'item': _menu_item_payload(request, duplicate)}, status=201)
    item = get_object_or_404(VenueMenuItem, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuItem(venue=venue)
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
    return JsonResponse({'item': _menu_item_payload(request, item)}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def venue_links_api(request, organization_id):
    venue = _venue_for(request, organization_id, 'profile')
    if not venue: return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET': return JsonResponse({'links': list(venue.links.values('id', 'link_type', 'label', 'value', 'display_order', 'is_active'))})
    data = _body(request) or {}
    if request.method == 'DELETE':
        get_object_or_404(VenueLink, pk=data.get('id'), venue=venue).delete()
        return JsonResponse({'ok': True})
    link = get_object_or_404(VenueLink, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueLink(venue=venue)
    for key in ('link_type', 'label', 'value', 'display_order', 'is_active'):
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
    return payload


def _touchpoint_destination(request, touchpoint, entry='qr'):
    tab = {'profile': 'home', 'menu': 'menu', 'feedback': 'home'}[touchpoint.destination]
    fragment = '#feedback' if touchpoint.destination == 'feedback' else ''
    return request.build_absolute_uri(
        f'/venue/{touchpoint.venue.public_identifier}/?tab={tab}&source={touchpoint.public_identifier}&entry={entry}{fragment}'
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

    staff = venue.staff_profiles.prefetch_related('links').select_related('card_assignment__physical_card')
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
    return {
        'range': {'preset': preset, 'startDate': first_day.isoformat(), 'endDate': last_day.isoformat(), 'timezone': str(tz)},
        'metrics': {**metrics, 'estimatedUniqueVisitors': unique_estimate},
        'previousMetrics': previous_metrics,
        'daily': [{'date': day, **values} for day, values in daily.items()],
        'linkDestinations': [{'destination': key, 'count': value} for key, value in sorted(destinations.items(), key=lambda item: (-item[1], item[0]))[:10]],
        'menuItems': [{'name': key, 'count': value} for key, value in sorted(menu_items.items(), key=lambda item: (-item[1], item[0]))[:10]],
        'touchpointActivity': [dict(source=source, **value) for source, value in sorted(touchpoints.items(), key=lambda item: (-sum(item[1][key] for key in ('profileViews', 'menuOpens', 'linkClicks', 'feedbackSubmissions')), item[1]['name']))],
        'feedback': {'count': feedback_summary['count'], 'average': feedback_summary['average'], 'ratingBreakdown': rating_breakdown},
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

    item_count = venue.menu_items.count()
    staff_count = venue.staff_profiles.filter(is_active=True).count()
    organizations = College.objects.filter(organization_type='hospitality').order_by('name')
    if not request.user.is_superuser:
        organizations = organizations.filter(admin_user=request.user)
    setup = [
        {'key': 'profile', 'label': 'Complete business profile',
         'complete': bool(venue.description.strip() and (venue.organization.phone or venue.organization.email))},
        {'key': 'menu', 'label': 'Add at least 5 menu items', 'complete': item_count >= 5},
        {'key': 'staff', 'label': 'Publish a staff profile', 'complete': staff_count > 0},
        {'key': 'feedback', 'label': 'Receive your first 10 customer feedback entries',
         'complete': feedback.count() >= 10},
    ]
    return JsonResponse({
        'days': days,
        'metrics': {key: analytics['metrics'][key] for key in ('profileViews', 'menuOpens', 'googleReviewClicks', 'feedbackSubmissions')},
        'previousMetrics': {key: analytics['previousMetrics'][key] for key in ('profileViews', 'menuOpens', 'googleReviewClicks', 'feedbackSubmissions')},
        'dailyVisits': [{'date': row['date'], 'count': row['profileViews']} for row in analytics['daily']],
        'recentFeedback': recent_feedback,
        'setup': setup,
        'organizations': [{'id': item.pk, 'name': item.name} for item in organizations],
        'trackingNotes': {
            'profileViews': analytics['definitions']['profileViews'],
            'googleReviewClicks': analytics['definitions']['googleReviewClicks'],
        },
    })
