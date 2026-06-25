from io import BytesIO
import re

import qrcode
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import slugify

from .forms import (
    ProfessionalDocumentFormSet,
    ProfessionalPortfolioFormSet,
    ProfessionalProfileForm,
    ProfessionalServiceFormSet,
    ProfessionalTestimonialFormSet,
    _style_formset,
)
from .models import ProfessionalProfile


def platform_admin_required(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


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
        profiles = profiles.filter(full_name__icontains=query) | profiles.filter(company_name__icontains=query)
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
            with transaction.atomic():
                profile = form.save(commit=False)
                if not profile.owner:
                    profile.owner = request.user
                if not profile.slug:
                    profile.slug = slugify(profile.full_name)
                profile.save()
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
    })


@login_required
@user_passes_test(platform_admin_required)
def professional_profile_edit(request, pk):
    profile = get_object_or_404(ProfessionalProfile, pk=pk)
    if request.method == 'POST':
        form = ProfessionalProfileForm(request.POST, request.FILES, instance=profile)
        formsets = _profile_formsets(profile, request.POST, request.FILES)
        if form.is_valid() and all(formset.is_valid() for formset in formsets.values()):
            with transaction.atomic():
                profile = form.save()
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
    context = {
        'profile': profile,
        'public_url': _absolute_public_url(request, profile),
        'whatsapp_digits': _normalize_phone(profile.whatsapp_number or profile.phone),
        'public_documents': profile.documents.filter(is_public=True),
    }
    return render(request, 'professional_cards/professional_premium.html', context)


def professional_vcard(request, slug):
    profile = get_object_or_404(ProfessionalProfile, slug=slug, is_active=True)
    ProfessionalProfile.objects.filter(pk=profile.pk).update(downloads=profile.downloads + 1)
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{profile.full_name}
ORG:{profile.company_name}
TITLE:{profile.designation}
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
