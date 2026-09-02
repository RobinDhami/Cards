from io import BytesIO
import json
import re
from urllib.parse import quote

import qrcode
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, update_session_auth_hash
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import slugify

from .forms import (
    LOOKING_FOR_CHOICES,
    ProfessionalDocumentFormSet,
    ProfessionalPortfolioFormSet,
    ProfessionalProfileForm,
    ProfessionalProfileOwnerForm,
    ProfessionalServiceFormSet,
    ProfessionalTestimonialFormSet,
    _style_formset,
)
from .models import ProfessionalProfile, ProfessionalService


def legacy_react_response(request, *args, **kwargs):
    """Retired Django screens now resolve to the React application."""
    from vcard_backend.react_views import react_app

    return react_app(request)


PROFESSION_SUGGESTIONS = [
    'Student',
    'College Student',
    'Computer Science Student',
    'Engineering Student',
    'Business Student',
    'Design Student',
    'Marketing Student',
    'Intern',
    'Graduate Trainee',
    'Software Developer',
    'Web Developer',
    'Mobile App Developer',
    'Data Analyst',
    'UI/UX Designer',
    'Graphic Designer',
    'Digital Marketer',
    'Content Creator',
    'Photographer',
    'Consultant',
    'Teacher',
    'Founder',
    'Entrepreneur',
    'Sales Executive',
    'Accountant',
    'Real Estate Advisor',
    'Financial Advisor',
]

LOOKING_FOR_LABELS = dict(LOOKING_FOR_CHOICES)


def platform_admin_required(user):
    return user.is_authenticated and user.is_superuser


def can_manage_professional_profile(user, profile):
    return bool(
        platform_admin_required(user)
        or (user.is_authenticated and profile.owner_id and profile.owner_id == user.id)
    )


def _is_profile_login_user(user):
    return bool(user and not user.is_staff and not user.is_superuser)


def _profile_login_owner(profile):
    if not profile.owner_id:
        return None
    return User.objects.filter(pk=profile.owner_id, is_staff=False, is_superuser=False).first()


def _validate_profile_login_user(profile, form):
    username = (form.cleaned_data.get('login_username') or '').strip()
    if not username:
        return ''
    owner = _profile_login_owner(profile)
    existing = User.objects.filter(username=username).first()
    if existing and (not owner or existing.id != owner.id):
        return 'This username is already in use.'
    return ''


def _sync_profile_login_user(request, profile, form):
    username = (form.cleaned_data.get('login_username') or '').strip()
    password = form.cleaned_data.get('login_password') or ''
    if not username:
        return

    owner = _profile_login_owner(profile)
    if owner is None:
        owner = User(username=username, is_staff=False, is_superuser=False)
    else:
        owner.username = username

    owner.first_name = profile.full_name
    owner.email = profile.email or ''
    owner.is_staff = False
    owner.is_superuser = False
    if password:
        owner.set_password(password)
    owner.save()

    if profile.owner_id != owner.id:
        profile.owner = owner
        profile.save(update_fields=['owner'])

    if password and request.user.is_authenticated and request.user.id == owner.id:
        update_session_auth_hash(request, owner)


def _admin_context(active_module='professional_cards'):
    return {
        'active_module': active_module,
        'current_school': None,
        'school_options': [],
        'nav_school_query': '',
        'is_super_admin': True,
    }


def _absolute_public_url(request, profile):
    if settings.SITE_URL:
        return f"{settings.SITE_URL}{profile.public_url_path}"
    return request.build_absolute_uri(profile.public_url_path)


def _normalize_phone(number):
    return re.sub(r'\D+', '', number or '')


def _vcard_value(value):
    return (
        str(value or '')
        .replace('\\', '\\\\')
        .replace(';', r'\;')
        .replace(',', r'\,')
        .replace('\r\n', r'\n')
        .replace('\n', r'\n')
        .strip()
    )


def _vcard_line(name, value):
    value = _vcard_value(value)
    return f'{name}:{value}' if value else ''


def _google_maps_search_url(query):
    query = (query or '').strip()
    if not query:
        return ''
    return f'https://www.google.com/maps/search/?api=1&query={quote(query)}'


def _public_map_url(profile):
    return (profile.google_maps_url or '').strip() or _google_maps_search_url(
        profile.office_address or profile.location
    )


def _file_url(file_field):
    if not file_field:
        return ''
    try:
        return file_field.url
    except ValueError:
        return ''


def _looking_for_labels(profile):
    values = [
        value.strip()
        for value in (profile.looking_for or '').split(',')
        if value.strip()
    ]
    return [LOOKING_FOR_LABELS.get(value, value) for value in values]


def _profile_completion(profile):
    service_count = profile.services.count()
    if profile.profile_focus == 'organization':
        has_logo = bool(profile.organization_logo or profile.personal_logo)
        checks = [
            has_logo,
            bool(profile.company_name),
            bool(profile.organization_tagline),
            bool(profile.industry),
            bool(profile.about or profile.short_tagline),
            service_count >= 3,
            bool(profile.phone or profile.whatsapp_number or profile.email),
            bool(profile.website or profile.linkedin_url or profile.facebook_url or profile.instagram_url),
        ]
        completed = sum(1 for item in checks if item)
        percent = round((completed / len(checks)) * 100)
        if not has_logo:
            suggestion = 'Add the logo used by this template.'
        elif not profile.company_name or not profile.organization_tagline:
            suggestion = 'Complete the organization name and tagline.'
        elif service_count < 3:
            suggestion = 'Add at least three organization offerings.'
        elif not profile.phone and not profile.whatsapp_number and not profile.email:
            suggestion = 'Add one business contact method.'
        else:
            suggestion = 'Your organization profile has the key details visitors need.'
        return {'percent': percent, 'suggestion': suggestion}

    checks = [
        bool(profile.profile_photo),
        bool(profile.full_name),
        bool(profile.profession),
        bool(profile.designation or profile.academic_title or profile.industry),
        bool(profile.company_name or profile.academic_institution),
        bool(profile.location),
        bool(profile.current_status),
        service_count >= 3,
        bool(profile.about),
        profile.portfolio_items.exists(),
        bool(profile.phone or profile.whatsapp_number or profile.email),
    ]
    completed = sum(1 for item in checks if item)
    percent = round((completed / len(checks)) * 100)
    if not profile.current_status:
        suggestion = 'Add your opportunity status to help visitors understand how to connect.'
    elif service_count < 3:
        suggestion = 'Add at least three strong skills to improve your profile.'
    elif not profile.portfolio_items.exists():
        suggestion = 'Add one highlight to strengthen your profile.'
    elif not profile.phone and not profile.whatsapp_number and not profile.email:
        suggestion = 'Add one professional contact method.'
    else:
        suggestion = 'Your profile has the key details visitors need.'
    return {'percent': percent, 'suggestion': suggestion}


def _build_public_actions(profile, whatsapp_digits):
    map_url = _public_map_url(profile)
    primary_defs = [
        {
            'enabled': bool(profile.phone),
            'href': f'tel:{profile.phone}',
            'label': 'Call',
            'icon': 'phone',
            'brand_class': 'brand-call',
        },
        {
            'enabled': bool(whatsapp_digits),
            'href': f'https://wa.me/{whatsapp_digits}',
            'label': 'WhatsApp',
            'icon': 'message-circle',
            'brand_class': 'brand-whatsapp',
            'external': True,
        },
        {
            'enabled': bool(profile.email),
            'href': f'mailto:{profile.email}',
            'label': 'Email',
            'icon': 'mail',
            'brand_class': 'brand-email',
        },
        {
            'enabled': bool(map_url),
            'href': map_url,
            'label': 'Map',
            'icon': 'map-pin',
            'brand_class': 'brand-map',
            'external': True,
        },
    ]
    extra_defs = [
        {
            'enabled': bool(profile.linkedin_url),
            'href': profile.linkedin_url,
            'label': 'LinkedIn',
            'icon': 'linkedin',
            'brand_class': 'brand-linkedin',
            'external': True,
        },
        {
            'enabled': bool(profile.facebook_url),
            'href': profile.facebook_url,
            'label': 'Facebook',
            'icon': 'facebook',
            'brand_class': 'brand-facebook',
            'external': True,
        },
        {
            'enabled': bool(profile.instagram_url),
            'href': profile.instagram_url,
            'label': 'Instagram',
            'icon': 'instagram',
            'brand_class': 'brand-instagram',
            'external': True,
        },
        {
            'enabled': bool(profile.tiktok_url),
            'href': profile.tiktok_url,
            'label': 'TikTok',
            'icon': 'tiktok',
            'brand_class': 'brand-tiktok',
            'external': True,
        },
        {
            'enabled': bool(profile.youtube_url),
            'href': profile.youtube_url,
            'label': 'YouTube',
            'icon': 'youtube',
            'brand_class': 'brand-youtube',
            'external': True,
        },
        {
            'enabled': bool(profile.github_url),
            'href': profile.github_url,
            'label': 'GitHub',
            'icon': 'github',
            'brand_class': 'brand-github',
            'external': True,
        },
        {
            'enabled': bool(profile.booking_url),
            'href': profile.booking_url,
            'label': 'Book',
            'icon': 'calendar-check',
            'brand_class': 'brand-booking',
            'external': True,
        },
    ]
    primary_actions = [action for action in primary_defs if action['enabled']]
    extra_actions = [action for action in extra_defs if action['enabled']]
    return primary_actions, extra_actions


def _build_organization_links(profile, whatsapp_digits):
    map_url = _public_map_url(profile)
    links = [
        {
            'enabled': bool(whatsapp_digits),
            'href': f'https://wa.me/{whatsapp_digits}',
            'label': 'WhatsApp',
            'icon': 'message-circle',
            'brand_class': 'brand-whatsapp',
            'external': True,
        },
        {
            'enabled': bool(profile.email),
            'href': f'mailto:{profile.email}',
            'label': 'Email',
            'icon': 'mail',
            'brand_class': 'brand-email',
        },
        {
            'enabled': bool(profile.website),
            'href': profile.website,
            'label': 'Website',
            'icon': 'globe',
            'brand_class': 'brand-website',
            'external': True,
        },
        {
            'enabled': bool(map_url),
            'href': map_url,
            'label': 'Map',
            'icon': 'map-pin',
            'brand_class': 'brand-map',
            'external': True,
        },
    ]
    return [item for item in links if item['enabled']]


def _build_primary_cta(profile, whatsapp_digits):
    if not profile.show_primary_cta:
        return None

    def action(href, label, icon, brand_class, external=False):
        if not href:
            return None
        return {
            'href': href,
            'label': (profile.primary_cta_label or label).strip()[:80],
            'icon': icon,
            'brand_class': brand_class,
            'external': external,
        }

    cta_type = profile.primary_cta_type or 'contact'
    if cta_type == 'website':
        selected = action(profile.website, 'Visit Website', 'globe', 'brand-website', True)
    elif cta_type == 'apply':
        selected = action(profile.primary_cta_url or profile.website, 'Apply Now', 'external-link', 'brand-apply', True)
    elif cta_type == 'shop':
        selected = action(profile.primary_cta_url or profile.website, 'Shop Collection', 'external-link', 'brand-shop', True)
    elif cta_type == 'training':
        selected = action(profile.primary_cta_url or profile.booking_url or profile.website, 'Join Training', 'calendar-check', 'brand-training', True)
    elif cta_type == 'demo':
        selected = action(profile.primary_cta_url or profile.booking_url or profile.website, 'Request Demo', 'calendar-check', 'brand-demo', True)
    elif cta_type == 'call':
        selected = action(f'tel:{profile.phone}' if profile.phone else '', 'Make Call', 'phone', 'brand-call')
    elif cta_type == 'booking':
        selected = action(profile.booking_url, 'Book a Meeting', 'calendar-check', 'brand-booking', True)
    elif cta_type == 'save_contact':
        selected = action(reverse('professional_cards:vcard', args=[profile.slug]), 'Save Contact', 'user-plus', 'brand-save')
    elif cta_type == 'custom':
        selected = action(profile.primary_cta_url, 'Open Link', 'external-link', 'brand-custom', True)
    else:
        contact_href = ''
        contact_icon = 'message-circle'
        contact_external = False
        if whatsapp_digits:
            contact_href = f'https://wa.me/{whatsapp_digits}'
            contact_external = True
        elif profile.phone:
            contact_href = f'tel:{profile.phone}'
            contact_icon = 'phone'
        elif profile.email:
            contact_href = f'mailto:{profile.email}'
            contact_icon = 'mail'
        selected = action(contact_href, 'Contact Us', contact_icon, 'brand-contact', contact_external)

    if selected:
        return selected
    for fallback in (
        action(profile.website, 'Visit Website', 'globe', 'brand-website', True),
        action(profile.booking_url, 'Book a Meeting', 'calendar-check', 'brand-booking', True),
        action(reverse('professional_cards:vcard', args=[profile.slug]), 'Save Contact', 'user-plus', 'brand-save'),
    ):
        if fallback:
            return fallback
    return None


def _profile_formsets(profile, data=None, files=None):
    kwargs = {'instance': profile}
    if data is not None:
        kwargs.update({'data': data, 'files': files})
    return {
        'services': _style_formset(ProfessionalServiceFormSet(prefix='services', **kwargs)),
        'portfolio': _style_formset(ProfessionalPortfolioFormSet(prefix='portfolio', **kwargs)),
        'testimonials': _style_formset(ProfessionalTestimonialFormSet(prefix='testimonials', **kwargs)),
        'documents': _style_formset(ProfessionalDocumentFormSet(prefix='documents', **kwargs)),
    }


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_list(request):
    query = (request.GET.get('q') or '').strip()
    profiles = ProfessionalProfile.objects.all().order_by('-updated_at')
    if query:
        profiles = (
            profiles.filter(full_name__icontains=query)
            | profiles.filter(company_name__icontains=query)
            | profiles.filter(profession__icontains=query)
            | profiles.filter(designation__icontains=query)
        )
    context = {
        **_admin_context(),
        'profiles': profiles,
        'query': query,
        'active_count': ProfessionalProfile.objects.filter(is_active=True).count(),
        'total_count': ProfessionalProfile.objects.count(),
    }
    return legacy_react_response(request, 'professional_cards/profile_list.html', context)


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_create(request):
    profile = ProfessionalProfile(owner=request.user)
    if request.method == 'POST':
        form = ProfessionalProfileForm(request.POST, request.FILES, instance=profile)
        formsets = _profile_formsets(profile, request.POST, request.FILES)
        if form.is_valid() and all(formset.is_valid() for formset in formsets.values()):
            login_error = _validate_profile_login_user(profile, form)
            if login_error:
                form.add_error('login_username', login_error)
            else:
                with transaction.atomic():
                    profile = form.save(commit=False)
                    if not profile.owner:
                        profile.owner = request.user
                    if not profile.slug:
                        profile.slug = slugify(profile.full_name)
                    profile.save()
                    _sync_profile_login_user(request, profile, form)
                    for formset in formsets.values():
                        formset.instance = profile
                        formset.save()
                messages.success(request, 'Professional profile created.')
                return redirect('professional_cards:edit', pk=profile.pk)
    else:
        form = ProfessionalProfileForm(instance=profile)
        formsets = _profile_formsets(profile)
    return legacy_react_response(request, 'professional_cards/profile_form.html', {
        **_admin_context(),
        'form': form,
        'formsets': formsets,
        'profile': profile,
        'mode': 'create',
        'profession_suggestions': PROFESSION_SUGGESTIONS,
    })


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_edit(request, pk):
    profile = get_object_or_404(ProfessionalProfile, pk=pk)
    if request.method == 'POST':
        form = ProfessionalProfileForm(request.POST, request.FILES, instance=profile)
        formsets = _profile_formsets(profile, request.POST, request.FILES)
        if form.is_valid() and all(formset.is_valid() for formset in formsets.values()):
            login_error = _validate_profile_login_user(profile, form)
            if login_error:
                form.add_error('login_username', login_error)
            else:
                with transaction.atomic():
                    profile = form.save()
                    _sync_profile_login_user(request, profile, form)
                    for formset in formsets.values():
                        formset.instance = profile
                        formset.save()
                messages.success(request, 'Professional profile updated.')
                return redirect('professional_cards:edit', pk=profile.pk)
    else:
        form = ProfessionalProfileForm(instance=profile)
        formsets = _profile_formsets(profile)
    return legacy_react_response(request, 'professional_cards/profile_form.html', {
        **_admin_context(),
        'form': form,
        'formsets': formsets,
        'profile': profile,
        'mode': 'edit',
        'public_url': _absolute_public_url(request, profile),
        'profession_suggestions': PROFESSION_SUGGESTIONS,
    })


@login_required
def professional_profile_owner_edit(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    if platform_admin_required(request.user):
        return redirect('professional_cards:edit', pk=profile.pk)
    if not (profile.owner_id and profile.owner_id == request.user.id):
        messages.error(request, 'Please log in with the account that manages this profile.')
        return redirect('professional_cards:edit_login', slug=profile.slug)

    if request.method == 'POST':
        form = ProfessionalProfileOwnerForm(request.POST, request.FILES, instance=profile)
        formsets = _profile_formsets(profile, request.POST, request.FILES)
        if form.is_valid() and all(formset.is_valid() for formset in formsets.values()):
            login_error = _validate_profile_login_user(profile, form)
            if login_error:
                form.add_error('login_username', login_error)
            else:
                with transaction.atomic():
                    profile = form.save()
                    _sync_profile_login_user(request, profile, form)
                    for formset in formsets.values():
                        formset.instance = profile
                        formset.save()
                messages.success(request, 'Profile updated.')
                return redirect('professional_cards:owner_edit', slug=profile.slug)
    else:
        form = ProfessionalProfileOwnerForm(instance=profile)
        formsets = _profile_formsets(profile)

    return legacy_react_response(request, 'professional_cards/profile_owner_form.html', {
        **_admin_context(),
        'form': form,
        'formsets': formsets,
        'profile': profile,
        'mode': 'edit',
        'public_url': _absolute_public_url(request, profile),
        'profession_suggestions': PROFESSION_SUGGESTIONS,
        'is_profile_owner_editor': True,
        'profile_completion': _profile_completion(profile),
    })


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_delete(request, pk):
    profile = get_object_or_404(ProfessionalProfile, pk=pk)
    if request.method == 'POST':
        profile.delete()
        messages.success(request, 'Professional profile deleted.')
        return redirect('professional_cards:list')
    return legacy_react_response(request, 'professional_cards/profile_confirm_delete.html', {
        **_admin_context(),
        'profile': profile,
    })


def public_professional_profile(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(views=profile.views + 1)
    whatsapp_digits = _normalize_phone(profile.whatsapp_number or profile.phone)
    primary_actions, extra_actions = _build_public_actions(profile, whatsapp_digits)
    featured_cta = _build_primary_cta(profile, whatsapp_digits)
    public_url = _absolute_public_url(request, profile)
    seo_description = (
        profile.short_tagline
        or profile.networking_statement
        or profile.about
        or f'{profile.full_name} digital profile on Tap2Connect Nepal.'
    )[:160]
    is_profile_owner_view = bool(
        request.user.is_authenticated
        and profile.owner_id
        and profile.owner_id == request.user.id
    )
    context = {
        'profile': profile,
        'public_url': public_url,
        'seo_description': seo_description,
        'profile_schema_json': json.dumps({
            '@context': 'https://schema.org',
            '@type': 'Person',
            'name': profile.full_name,
            'jobTitle': profile.designation or profile.profession,
            'worksFor': profile.company_name,
            'url': public_url,
            'email': profile.email,
            'telephone': profile.phone,
            'address': profile.location or profile.office_address,
        }, separators=(',', ':')),
        'public_map_url': _public_map_url(profile),
        'whatsapp_digits': whatsapp_digits,
        'primary_actions': primary_actions,
        'extra_actions': extra_actions,
        'featured_cta': featured_cta,
        'looking_for_labels': _looking_for_labels(profile),
        'edit_login_url': reverse('professional_cards:edit_login', args=[profile.slug]),
        'is_profile_owner_view': is_profile_owner_view,
        'public_documents': profile.documents.filter(is_public=True).exclude(file='')[:2],
    }
    template_path = {
        'modern_identity': 'professional_cards/modern_identity.html',
        'organization_focus': 'professional_cards/organization_focus.html',
    }.get(profile.template_name, 'professional_cards/modern_identity.html')
    return legacy_react_response(request, template_path, context)


def _public_profile_payload(request, profile):
    whatsapp_digits = _normalize_phone(profile.whatsapp_number or profile.phone)
    primary_actions, extra_actions = _build_public_actions(profile, whatsapp_digits)
    organization_links = _build_organization_links(profile, whatsapp_digits)
    featured_cta = _build_primary_cta(profile, whatsapp_digits)
    if featured_cta:
        if profile.profile_focus == 'organization':
            extra_actions = [item for item in extra_actions if item['href'] != featured_cta['href']]
        featured_cta = {
            **featured_cta,
            'href': reverse('professional_cards:primary_cta', args=[profile.slug]),
        }
    public_url = _absolute_public_url(request, profile)
    seo_description = (
        profile.short_tagline
        or profile.networking_statement
        or profile.about
        or f'{profile.full_name} digital profile on Tap2Connect Nepal.'
    )[:160]
    is_profile_owner_view = bool(
        request.user.is_authenticated
        and profile.owner_id
        and profile.owner_id == request.user.id
    )
    can_edit_profile = can_manage_professional_profile(request.user, profile)
    unified_logo_url = _file_url(profile.organization_logo or profile.personal_logo)

    return {
        'seo': {
            'title': f'{profile.full_name} | Tap2Connect Nepal Digital Profile',
            'description': seo_description,
            'publicUrl': public_url,
            'schema': {
                '@context': 'https://schema.org',
                '@type': 'Person',
                'name': profile.full_name,
                'jobTitle': profile.designation or profile.profession,
                'worksFor': profile.company_name,
                'url': public_url,
                'email': profile.email,
                'telephone': profile.phone,
                'address': profile.location or profile.office_address,
            },
        },
        'profile': {
            'id': profile.id,
            'slug': profile.slug,
            'templateName': profile.template_name,
            'profileFocus': 'organization',
            'profileType': profile.profile_type,
            'fullName': profile.full_name,
            'initials': (profile.full_name[:2] or 'P').upper(),
            'profilePhotoUrl': _file_url(profile.profile_photo),
            'coverPhotoUrl': _file_url(profile.cover_photo),
            'profession': profile.profession,
            'designation': profile.designation,
            'companyName': profile.company_name,
            'headerIdentity': 'organization',
            'organizationLogoUrl': unified_logo_url,
            'organizationTagline': profile.organization_tagline,
            'personalLogoUrl': unified_logo_url,
            'brandName': profile.brand_name,
            'brandTagline': profile.brand_tagline,
            'profileIdentifierLabel': profile.profile_identifier_label,
            'profileIdentifier': profile.profile_identifier,
            'industry': profile.industry,
            'workRole': profile.work_role,
            'workOrganization': profile.work_organization,
            'workExperience': profile.work_experience,
            'workAddress': profile.work_address,
            'academicSection': profile.academic_section,
            'academicTitle': profile.academic_title,
            'academicInstitution': profile.academic_institution,
            'academicLevel': profile.academic_level,
            'academicYear': profile.academic_year,
            'academicSpecialization': profile.academic_specialization,
            'academicStatus': profile.academic_status,
            'academicCertification': profile.academic_certification,
            'academicAddress': profile.academic_address,
            'shortTagline': profile.short_tagline,
            'about': profile.about,
            'currentFocus': profile.current_focus,
            'featuredInterest': profile.featured_interest,
            'currentStatus': profile.current_status,
            'currentStatusLabel': profile.get_current_status_display() if profile.current_status else '',
            'lookingForLabels': _looking_for_labels(profile),
            'preferredWorkMode': profile.preferred_work_mode,
            'preferredWorkModeLabel': profile.get_preferred_work_mode_display() if profile.preferred_work_mode else '',
            'networkingStatement': profile.networking_statement,
            'phone': profile.phone,
            'whatsappNumber': profile.whatsapp_number,
            'email': profile.email,
            'website': profile.website,
            'bookingUrl': profile.booking_url,
            'officeAddress': profile.office_address,
            'publicMapUrl': _public_map_url(profile),
            'businessHours': profile.business_hours,
            'yearsOfExperience': profile.years_of_experience,
            'location': profile.location,
            'isVerified': profile.is_verified,
            'accentColor': profile.accent_color or '#3154d7',
        },
        'actions': {
            'primary': primary_actions[:4],
            'organizationLinks': organization_links,
            'extra': extra_actions,
            'featuredCta': featured_cta,
            'qrCodeUrl': reverse('professional_cards:qr_code', args=[profile.slug]),
            'vcardUrl': reverse('professional_cards:vcard', args=[profile.slug]),
            'editLoginUrl': reverse('professional_cards:edit_login', args=[profile.slug]),
            'analyticsUrl': (
                f"{reverse('professional_cards:owner_edit', args=[profile.slug])}#owner-analytics-title"
                if is_profile_owner_view
                else ''
            ),
            'isProfileOwnerView': is_profile_owner_view,
            'canEditProfile': can_edit_profile,
        },
        'services': [
            {
                'id': service.id,
                'title': service.title,
                'description': service.description,
                'icon': service.icon,
                'href': reverse('professional_cards:offering', args=[profile.slug, service.id]) if service.link else '',
                'displayOrder': service.display_order,
            }
            for service in profile.services.all()
        ],
        'highlights': [
            {
                'id': item.id,
                'title': item.title,
                'highlightType': item.highlight_type,
                'highlightTypeLabel': item.get_highlight_type_display(),
                'organization': item.organization,
                'period': item.period,
                'description': item.description,
                'imageUrl': _file_url(item.image),
                'link': item.link,
                'displayOrder': item.display_order,
            }
            for item in profile.portfolio_items.all()
        ],
        'testimonials': [
            {
                'id': testimonial.id,
                'clientName': testimonial.client_name,
                'clientRole': testimonial.client_role,
                'organization': testimonial.organization,
                'profilePhotoUrl': _file_url(testimonial.profile_photo),
                'reviewText': testimonial.review_text,
                'rating': testimonial.rating,
                'displayOrder': testimonial.display_order,
            }
            for testimonial in profile.testimonials.all()
        ],
        'documents': [
            {
                'id': document.id,
                'title': document.title,
                'url': document.file.url,
                'documentType': document.document_type,
                'documentTypeLabel': document.get_document_type_display(),
                'displayOrder': document.display_order,
            }
            for document in profile.documents.filter(is_public=True).exclude(file='')
        ],
    }


def public_professional_profile_api(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    if not can_manage_professional_profile(request.user, profile):
        ProfessionalProfile.objects.filter(pk=profile.pk).update(views=F('views') + 1)
    return JsonResponse(_public_profile_payload(request, profile))


def professional_primary_cta(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    whatsapp_digits = _normalize_phone(profile.whatsapp_number or profile.phone)
    action = _build_primary_cta(profile, whatsapp_digits)
    if not action:
        return redirect('professional_cards:public_profile', slug=profile.slug)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(cta_clicks=F('cta_clicks') + 1)
    return redirect(action['href'])


def professional_offering_action(request, slug, service_id):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    service = get_object_or_404(ProfessionalService, pk=service_id, profile=profile)
    if not service.link:
        return redirect('professional_cards:public_profile', slug=profile.slug)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(offering_clicks=F('offering_clicks') + 1)
    return redirect(service.link)


def professional_profile_edit_login(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    if platform_admin_required(request.user):
        return redirect('professional_cards:edit', pk=profile.pk)
    if request.user.is_authenticated and profile.owner_id == request.user.id:
        return redirect('professional_cards:owner_edit', slug=profile.slug)

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            messages.error(request, 'Invalid username or password.')
        elif not can_manage_professional_profile(user, profile):
            messages.error(request, 'This account does not have permission to edit this profile.')
        else:
            login(request, user)
            if platform_admin_required(user):
                return redirect('professional_cards:edit', pk=profile.pk)
            return redirect('professional_cards:owner_edit', slug=profile.slug)

    return legacy_react_response(request, 'professional_cards/profile_edit_login.html', {'profile': profile})


def profession_suggestions_api(request):
    query = (request.GET.get('q') or '').strip().lower()
    suggestions = PROFESSION_SUGGESTIONS
    if query:
        suggestions = [item for item in suggestions if query in item.lower()]
    return JsonResponse({'results': suggestions})


def professional_vcard(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(downloads=F('downloads') + 1)
    public_url = _absolute_public_url(request, profile)
    organization = (
        profile.company_name
        or profile.work_organization
        or profile.academic_institution
        or profile.brand_name
    )
    note_parts = [f'Tap2Connect profile: {public_url}']
    if profile.whatsapp_number:
        note_parts.append(f'WhatsApp: {profile.whatsapp_number}')
    lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        _vcard_line('FN', profile.full_name),
        _vcard_line('ORG', organization),
        _vcard_line('TITLE', profile.designation or profile.profession or profile.work_role),
        _vcard_line('TEL;TYPE=CELL,VOICE', profile.phone),
        _vcard_line('TEL;TYPE=CELL,WHATSAPP', profile.whatsapp_number),
        _vcard_line('EMAIL;TYPE=INTERNET', profile.email),
        _vcard_line('URL;TYPE=Tap2Connect', public_url),
        _vcard_line('URL;TYPE=WORK', profile.website),
        f'ADR;TYPE=WORK:;;{_vcard_value(profile.office_address)}' if profile.office_address else '',
        _vcard_line('NOTE', ' | '.join(note_parts)),
        'END:VCARD',
        '',
    ]
    vcard = '\r\n'.join(line for line in lines if line)
    filename = slugify(profile.full_name) or 'professional-contact'
    response = HttpResponse(vcard, content_type='text/vcard; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}.vcf"'
    return response


def professional_qr_code(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    image = qrcode.make(_absolute_public_url(request, profile))
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return HttpResponse(buffer.getvalue(), content_type='image/png')
