import hashlib
import json
from datetime import timedelta
from urllib.parse import urlparse

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.utils.text import slugify

from .models import VenueAnalyticsEvent, VenueFeedback, VenueLink, VenueMenuCategory, VenueMenuItem, VenueProfile
from vcards.models import College


def _body(request):
    try:
        return json.loads(request.body or '{}')
    except (TypeError, ValueError):
        return None


def _authorized(request, organization_id):
    user = request.user
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return College.objects.filter(pk=organization_id).filter(
        admin_user=user
    ).exists() or user.managed_schools.filter(pk=organization_id).exists()


def _safe_url(value):
    if not value:
        return value
    parsed = urlparse(value)
    if parsed.scheme and parsed.scheme.lower() not in {'http', 'https', 'mailto', 'tel'}:
        raise ValidationError('Only safe web, mail and telephone links are allowed.')
    return value


def _file_url(request, field):
    if not field:
        return None
    url = field.url
    return request.build_absolute_uri(url) if request else url


def _record_event(request, venue, event_type, target=''):
    if event_type not in dict(VenueAnalyticsEvent.EVENT_TYPES):
        return False
    safe_target = str(target or '').strip()[:160]
    if event_type == 'profile_view':
        fingerprint = hashlib.sha256(
            f'{venue.pk}:{request.META.get("REMOTE_ADDR", "")}:{request.META.get("HTTP_USER_AGENT", "")}'.encode()
        ).hexdigest()
        if not cache.add(f'venue-view:{fingerprint}', True, 30):
            return False
    VenueAnalyticsEvent.objects.create(venue=venue, event_type=event_type, target=safe_target)
    return True


def _payload(request, venue):
    categories = []
    for category in venue.menu_categories.filter(is_active=True):
        items = [{
            'id': str(item.public_identifier), 'name': item.name,
            'description': item.description, 'image': _file_url(request, item.image),
            'price': str(item.price), 'originalPrice': str(item.original_price) if item.original_price is not None else '', 'offerLabel': item.offer_label, 'dietaryInfo': item.dietary_info,
            'isVegetarian': item.is_vegetarian, 'isTodaySpecial': item.is_today_special, 'isOffer': item.is_offer,
        } for item in category.items.filter(is_available=True)]
        categories.append({'name': category.name, 'slug': category.slug, 'items': items})
    return {
        'organization': {'id': venue.organization_id, 'name': venue.organization.name},
        'venue': {'publicIdentifier': venue.public_identifier, 'type': venue.venue_type, 'description': venue.description,
                  'logo': _file_url(request, venue.logo), 'coverImage': _file_url(request, venue.cover_image),
                  'primaryColor': venue.primary_color, 'secondaryColor': venue.secondary_color,
                  'phone': venue.phone, 'whatsapp': venue.whatsapp, 'email': venue.email,
                  'website': venue.website, 'address': venue.address, 'mapUrl': venue.map_url,
                  'googleReviewUrl': venue.google_review_url},
        'links': list(venue.links.filter(is_active=True).values('link_type', 'label', 'value', 'display_order')),
        'rating': {'average': venue.feedback.filter(status__in=['new', 'reviewed', 'resolved']).aggregate(average=Avg('rating'))['average'] or 0, 'count': venue.feedback.filter(status__in=['new', 'reviewed', 'resolved']).count()},
        'categories': categories, 'feedbackEnabled': venue.feedback_enabled,
    }


@require_http_methods(['GET'])
def venue_public_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    _record_event(request, venue, 'profile_view')
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
    _record_event(request, venue, event_type, data.get('target'))
    return JsonResponse({'ok': True}, status=201)


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
    fingerprint = hashlib.sha256(f'{venue.pk}:{request.META.get("REMOTE_ADDR", "")}'.encode()).hexdigest()
    if not cache.add(f'venue-feedback:{fingerprint}', True, 300):
        return JsonResponse({'error': 'Please wait before sending another feedback message.'}, status=429)
    VenueFeedback.objects.create(venue=venue, rating=rating, comment=comment, rate_limit_hash=fingerprint)
    VenueAnalyticsEvent.objects.create(venue=venue, event_type='feedback_submit', target=str(rating))
    return JsonResponse({'ok': True}, status=201)


def _venue_for(request, organization_id):
    if not _authorized(request, organization_id):
        return None
    organization = get_object_or_404(College, pk=organization_id)
    venue, _ = VenueProfile.objects.get_or_create(organization=organization)
    return venue


def _ensure_default_categories(venue):
    if venue.menu_categories.exists():
        return
    if venue.venue_type == 'hotel':
        names = ['Rooms', 'Dining', 'Services', "Today's Special", 'Offers']
    elif venue.venue_type in {'cafe', 'restaurant', 'bar'}:
        names = ['Breakfast', 'Main Course', 'Snacks', 'Beverages', 'Desserts', "Today's Special", 'Offers']
    else:
        names = ['Menu', "Today's Special", 'Offers']
    VenueMenuCategory.objects.bulk_create([
        VenueMenuCategory(venue=venue, name=name, slug=f'default-{index}-{slugify(name)}', display_order=index)
        for index, name in enumerate(names)
    ])


@require_http_methods(['GET', 'PATCH'])
def venue_profile_manage_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'PATCH':
        data = _body(request) or {}
        allowed = {'venue_type', 'description', 'primary_color', 'secondary_color', 'phone', 'whatsapp', 'email', 'website', 'address', 'map_url', 'google_review_url', 'feedback_enabled', 'is_active'}
        for key, value in data.items():
            if key in allowed:
                if key.endswith('_url') or key == 'website':
                    _safe_url(value)
                setattr(venue, key, value)
        venue.full_clean(); venue.save()
    return JsonResponse(_payload(request, venue))


@require_http_methods(['GET', 'POST', 'PATCH'])
def venue_menu_categories_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET':
        _ensure_default_categories(venue)
        return JsonResponse({'categories': list(venue.menu_categories.values('id', 'name', 'slug', 'display_order', 'is_active'))})
    data = _body(request) or {}
    category = get_object_or_404(VenueMenuCategory, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuCategory(venue=venue)
    for key in ('name', 'slug', 'display_order', 'is_active'):
        if key in data: setattr(category, key, data[key])
    category.full_clean(); category.save()
    return JsonResponse({'id': category.pk, 'name': category.name, 'slug': category.slug}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'POST', 'PATCH'])
def venue_menu_items_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET':
        items = []
        for menu_item in venue.menu_items.all():
            items.append({'id': menu_item.id, 'category_id': menu_item.category_id, 'name': menu_item.name, 'description': menu_item.description, 'price': str(menu_item.price), 'original_price': str(menu_item.original_price) if menu_item.original_price is not None else '', 'offer_label': menu_item.offer_label, 'dietary_info': menu_item.dietary_info, 'is_vegetarian': menu_item.is_vegetarian, 'is_available': menu_item.is_available, 'is_today_special': menu_item.is_today_special, 'is_offer': menu_item.is_offer, 'image': _file_url(request, menu_item.image), 'display_order': menu_item.display_order})
        return JsonResponse({'items': items})
    data = _body(request) if request.content_type.startswith('application/json') else request.POST
    data = data or {}
    item = get_object_or_404(VenueMenuItem, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuItem(venue=venue)
    boolean_fields = {'is_vegetarian', 'is_available', 'is_today_special', 'is_offer'}
    for key in ('category_id', 'name', 'description', 'price', 'original_price', 'offer_label', 'dietary_info', 'is_vegetarian', 'is_available', 'is_today_special', 'is_offer', 'display_order'):
        if key in data:
            value = data[key]
            if key in boolean_fields and isinstance(value, str):
                value = value.strip().lower() in {'1', 'true', 'yes', 'on'}
            if key == 'original_price' and value == '':
                value = None
            setattr(item, key, value)
    if request.FILES.get('image'):
        item.image = request.FILES['image']
    item.full_clean(); item.save()
    return JsonResponse({'id': item.pk, 'name': item.name}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'POST', 'PATCH'])
def venue_links_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue: return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'GET': return JsonResponse({'links': list(venue.links.values('id', 'link_type', 'label', 'value', 'display_order', 'is_active'))})
    data = _body(request) or {}
    link = get_object_or_404(VenueLink, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueLink(venue=venue)
    for key in ('link_type', 'label', 'value', 'display_order', 'is_active'):
        if key in data: setattr(link, key, data[key])
    _safe_url(link.value) if link.link_type in {'website', 'instagram', 'facebook', 'google_review', 'map'} else None
    link.full_clean(); link.save()
    return JsonResponse({'id': link.pk}, status=201 if request.method == 'POST' else 200)


@require_http_methods(['GET', 'PATCH'])
def venue_feedback_manage_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue: return JsonResponse({'error': 'Not authorized.'}, status=403)
    if request.method == 'PATCH':
        data = _body(request) or {}
        feedback = get_object_or_404(VenueFeedback, pk=data.get('id'), venue=venue)
        if data.get('status') not in dict(VenueFeedback.STATUS_CHOICES): return JsonResponse({'error': 'Invalid status.'}, status=400)
        feedback.status = data['status']; feedback.save(update_fields=['status'])
    return JsonResponse({'feedback': list(venue.feedback.order_by('-created_at').values('id', 'rating', 'comment', 'status', 'created_at'))})


@require_http_methods(['GET'])
def venue_analytics_api(request, organization_id):
    venue = _venue_for(request, organization_id)
    if not venue:
        return JsonResponse({'error': 'Not authorized.'}, status=403)
    events = venue.analytics_events.all()
    totals = {event_type: 0 for event_type, _ in VenueAnalyticsEvent.EVENT_TYPES}
    for row in events.values('event_type').annotate(count=Count('id')):
        totals[row['event_type']] = row['count']
    feedback_summary = venue.feedback.aggregate(count=Count('id'), average=Avg('rating'))
    rating_breakdown = {str(value): 0 for value in range(1, 6)}
    for row in venue.feedback.values('rating').annotate(count=Count('id')):
        rating_breakdown[str(row['rating'])] = row['count']
    since = timezone.now() - timedelta(days=13)
    daily = list(events.filter(created_at__gte=since).annotate(day=TruncDate('created_at')).values('day').annotate(count=Count('id')).order_by('day'))
    social = list(events.filter(event_type='social_click').values('target').annotate(count=Count('id')).order_by('-count', 'target')[:10])
    menu_items = list(events.filter(event_type='menu_item_click').values('target').annotate(count=Count('id')).order_by('-count', 'target')[:10])
    return JsonResponse({'analytics': {
        'totals': totals,
        'feedback': {'count': feedback_summary['count'], 'average': feedback_summary['average'] or 0, 'ratingBreakdown': rating_breakdown},
        'daily': [{'date': row['day'], 'count': row['count']} for row in daily],
        'socialClicks': social,
        'menuItems': menu_items,
    }})
