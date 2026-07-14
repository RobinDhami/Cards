from io import BytesIO
import re
from urllib.parse import quote

import qrcode
from django.contrib import messages
from django.contrib.auth import authenticate, login, update_session_auth_hash
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import slugify

from .forms import (
    ProfessionalDocumentFormSet,
    ProfessionalPortfolioFormSet,
    ProfessionalProfileForm,
    ProfessionalProfileOwnerForm,
    ProfessionalServiceFormSet,
    ProfessionalTestimonialFormSet,
    _style_formset,
)
from .models import ProfessionalProfile


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


def platform_admin_required(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


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
    return request.build_absolute_uri(profile.public_url_path)


def _normalize_phone(number):
    return re.sub(r'\D+', '', number or '')


def _google_maps_search_url(query):
    query = (query or '').strip()
    if not query:
        return ''
    return f'https://www.google.com/maps/search/?api=1&query={quote(query)}'


def _public_map_url(profile):
    return (profile.google_maps_url or '').strip() or _google_maps_search_url(
        profile.office_address or profile.location
    )


def _build_public_actions(profile, whatsapp_digits):
    map_url = _public_map_url(profile)
    action_defs = [
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
        {
            'enabled': bool(profile.website),
            'href': profile.website,
            'label': 'Website',
            'icon': 'globe',
            'brand_class': 'brand-website',
            'external': True,
        },
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
    actions = [action for action in action_defs if action['enabled']]
    return actions[:8], actions[8:]


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
    return render(request, 'professional_cards/profile_list.html', context)


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
    return render(request, 'professional_cards/profile_form.html', {
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
    return render(request, 'professional_cards/profile_form.html', {
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

    return render(request, 'professional_cards/profile_owner_form.html', {
        **_admin_context(),
        'form': form,
        'formsets': formsets,
        'profile': profile,
        'mode': 'edit',
        'public_url': _absolute_public_url(request, profile),
        'profession_suggestions': PROFESSION_SUGGESTIONS,
        'is_profile_owner_editor': True,
    })


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_delete(request, pk):
    profile = get_object_or_404(ProfessionalProfile, pk=pk)
    if request.method == 'POST':
        profile.delete()
        messages.success(request, 'Professional profile deleted.')
        return redirect('professional_cards:list')
    return render(request, 'professional_cards/profile_confirm_delete.html', {
        **_admin_context(),
        'profile': profile,
    })


def public_professional_profile(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(views=profile.views + 1)
    whatsapp_digits = _normalize_phone(profile.whatsapp_number or profile.phone)
    primary_actions, extra_actions = _build_public_actions(profile, whatsapp_digits)
    is_profile_owner_view = bool(
        request.user.is_authenticated
        and profile.owner_id
        and profile.owner_id == request.user.id
    )
    context = {
        'profile': profile,
        'public_url': _absolute_public_url(request, profile),
        'whatsapp_digits': whatsapp_digits,
        'primary_actions': primary_actions,
        'extra_actions': extra_actions,
        'edit_login_url': reverse('professional_cards:edit_login', args=[profile.slug]),
        'is_profile_owner_view': is_profile_owner_view,
        'public_documents': profile.documents.filter(is_public=True),
    }
    template_path = {
        'modern_identity': 'professional_cards/modern_identity.html',
    }.get(profile.template_name, 'professional_cards/modern_identity.html')
    return render(request, template_path, context)


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

    return render(request, 'professional_cards/profile_edit_login.html', {'profile': profile})


def profession_suggestions_api(request):
    query = (request.GET.get('q') or '').strip().lower()
    suggestions = PROFESSION_SUGGESTIONS
    if query:
        suggestions = [item for item in suggestions if query in item.lower()]
    return JsonResponse({'results': suggestions})


def professional_vcard(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(downloads=profile.downloads + 1)
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{profile.full_name}
ORG:{profile.company_name}
TITLE:{profile.designation or profile.profession}
TEL;TYPE=CELL:{profile.phone}
EMAIL;TYPE=INTERNET:{profile.email}
URL:{profile.website}
ADR;TYPE=WORK:;;{profile.office_address}
END:VCARD
"""
    filename = slugify(profile.full_name) or 'professional-contact'
    response = HttpResponse(vcard, content_type='text/vcard')
    response['Content-Disposition'] = f'attachment; filename="{filename}.vcf"'
    return response


def professional_qr_code(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    image = qrcode.make(_absolute_public_url(request, profile))
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return HttpResponse(buffer.getvalue(), content_type='image/png')
