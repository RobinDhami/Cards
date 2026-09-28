import hashlib
import json
from urllib.parse import urlparse

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from .models import VenueFeedback, VenueLink, VenueMenuCategory, VenueMenuItem, VenueProfile
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


def _payload(request, venue):
    categories = []
    for category in venue.menu_categories.filter(is_active=True):
        items = [{
            'id': str(item.public_identifier), 'name': item.name,
            'description': item.description, 'image': _file_url(request, item.image),
            'price': str(item.price), 'dietaryInfo': item.dietary_info,
            'isVegetarian': item.is_vegetarian, 'isTodaySpecial': item.is_today_special,
        } for item in category.items.filter(is_available=True)]
        categories.append({'name': category.name, 'slug': category.slug, 'items': items})
    return {
        'organization': {'id': venue.organization_id, 'name': venue.organization.name},
        'venue': {'type': venue.venue_type, 'description': venue.description,
                  'logo': _file_url(request, venue.logo), 'coverImage': _file_url(request, venue.cover_image),
                  'primaryColor': venue.primary_color, 'secondaryColor': venue.secondary_color,
                  'phone': venue.phone, 'whatsapp': venue.whatsapp, 'email': venue.email,
                  'website': venue.website, 'address': venue.address, 'mapUrl': venue.map_url,
                  'googleReviewUrl': venue.google_review_url},
        'links': list(venue.links.filter(is_active=True).values('link_type', 'label', 'value', 'display_order')),
        'categories': categories, 'feedbackEnabled': venue.feedback_enabled,
    }


@require_http_methods(['GET'])
def venue_public_api(request, public_identifier):
    venue = get_object_or_404(VenueProfile.objects.select_related('organization'), public_identifier=public_identifier, is_active=True)
    return JsonResponse(_payload(request, venue))


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
    return JsonResponse({'ok': True}, status=201)


def _venue_for(request, organization_id):
    if not _authorized(request, organization_id):
        return None
    organization = get_object_or_404(College, pk=organization_id)
    venue, _ = VenueProfile.objects.get_or_create(organization=organization)
    return venue


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
        return JsonResponse({'items': list(venue.menu_items.values('id', 'category_id', 'name', 'description', 'price', 'dietary_info', 'is_vegetarian', 'is_available', 'is_today_special', 'display_order'))})
    data = _body(request) or {}
    item = get_object_or_404(VenueMenuItem, pk=data.get('id'), venue=venue) if request.method == 'PATCH' else VenueMenuItem(venue=venue)
    for key in ('category_id', 'name', 'description', 'price', 'dietary_info', 'is_vegetarian', 'is_available', 'is_today_special', 'display_order'):
        if key in data: setattr(item, key, data[key])
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
