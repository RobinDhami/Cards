import json
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse, QueryDict
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods

from professional_cards.forms import (
    LOOKING_FOR_CHOICES,
    ProfessionalProfileForm,
    ProfessionalProfileOwnerForm,
    SERVICE_ICON_CHOICES,
)
from professional_cards.models import (
    ProfessionalDocument,
    ProfessionalPortfolioItem,
    ProfessionalProfile,
    ProfessionalService,
    ProfessionalTestimonial,
)
from professional_cards.views import (
    PROFESSION_SUGGESTIONS,
    _profile_completion,
    _sync_profile_login_user,
    _validate_profile_login_user,
    can_manage_professional_profile,
    platform_admin_required,
)
from shops.models import (
    Category,
    DeliverySetting,
    Discount,
    Order,
    OrderItem,
    PaymentSetting,
    Product,
    ProductImage,
    ShopCustomer,
    Store,
)
from shops.views import (
    _can_manage_store,
    _cart_session_key,
    _cart_summary,
    _published_store,
)
from vcards.models import College, ProfileActivity, Skill, StudentCard, StudentProfile
from vcards.views import (
    ACADEMIC_LEVEL_CHOICES,
    GENDER_CHOICES,
    PRINT_BACK_THEMES,
    PRINT_CARD_TYPES,
    PRINT_FRONT_THEMES,
    PRINT_ORIENTATIONS,
    SCHOOL_ROLE_CHOICES,
    SOCIAL_CHOICES,
    _build_dashboard_query,
    _calculate_profile_completion,
    _can_manage_profile,
    _can_view_private_student_data,
    _generate_profile_password,
    _get_user_role,
    _is_student_edit_authorized,
    _is_super_admin,
    _log_profile_activity,
    _media_url,
    _profile_supports_self_service,
    _school_analytics,
    _school_card_context,
    _school_member_queryset,
    _school_username_prefix,
    _student_edit_session_key,
    _suggest_school_username,
    _sync_profile_auth_user,
    _sync_school_admin_user,
    _unique_sections_for_school,
)


def _json_error(message, status=400, errors=None):
    payload = {'ok': False, 'message': message}
    if errors:
        payload['errors'] = errors
    return JsonResponse(payload, status=status)


def _json_body(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}
    return request.POST


def _bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _decimal(value, default=None):
    if value in (None, ''):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _datetime(value):
    if not value:
        return None
    parsed = parse_datetime(str(value))
    if parsed and timezone.is_naive(parsed):
        return timezone.make_aware(parsed)
    return parsed


def _file_url(file_field):
    if not file_field:
        return ''
    try:
        return file_field.url
    except (ValueError, AttributeError):
        return ''


def _asset_url(value):
    value = str(value or '').strip()
    if not value:
        return ''
    if value.startswith(('http://', 'https://', '/', 'data:')):
        return value
    return f'/static/{value}'


def _choice_list(choices):
    return [{'value': value, 'label': label} for value, label in choices]


def _form_errors(form):
    return {
        field: [str(message) for message in messages]
        for field, messages in form.errors.items()
    }


def _require_login(request):
    if not request.user.is_authenticated:
        return _json_error('Please sign in to continue.', status=401)
    return None


def _require_platform_admin(request):
    login_error = _require_login(request)
    if login_error:
        return login_error
    if not platform_admin_required(request.user):
        return _json_error('You do not have access to this workspace.', status=403)
    return None


def _session_payload(request):
    user = request.user
    role = _get_user_role(user) if user.is_authenticated else 'public'
    redirect_path = '/dashboard/'
    if user.is_authenticated:
        professional = ProfessionalProfile.objects.filter(owner=user, is_active=True).first()
        student = StudentProfile.objects.filter(auth_user=user).first()
        if professional and role == 'public':
            redirect_path = f'/p/{professional.slug}/edit/'
        elif student and role in {'student', 'teacher'}:
            redirect_path = f'/student/{student.id}/manage/'
    return {
        'ok': True,
        'csrfToken': get_token(request),
        'authenticated': user.is_authenticated,
        'user': {
            'id': user.id if user.is_authenticated else None,
            'username': user.username if user.is_authenticated else '',
            'displayName': (
                user.get_full_name().strip() or user.username
                if user.is_authenticated else ''
            ),
            'isStaff': bool(user.is_authenticated and user.is_staff),
            'isSuperuser': bool(user.is_authenticated and user.is_superuser),
            'role': role,
        },
        'redirectPath': redirect_path,
    }


@require_http_methods(['GET'])
def session_api(request):
    return JsonResponse(_session_payload(request))


@require_http_methods(['POST'])
def session_login_api(request):
    payload = _json_body(request)
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return _json_error('Invalid username or password.', status=400)
    login(request, user)
    return JsonResponse(_session_payload(request))


@require_http_methods(['POST'])
def session_logout_api(request):
    logout(request)
    return JsonResponse({'ok': True, 'redirectPath': '/login/'})


PROFESSIONAL_FIELDS = list(ProfessionalProfileForm.Meta.fields)
PROFESSIONAL_FILE_FIELDS = {
    'profile_photo',
    'cover_photo',
    'organization_logo',
    'personal_logo',
}


def _professional_value(profile, field_name):
    if field_name in PROFESSIONAL_FILE_FIELDS:
        return _file_url(getattr(profile, field_name))
    value = getattr(profile, field_name)
    return value


def _professional_options():
    return {
        'profileTypes': _choice_list(ProfessionalProfile.PROFILE_TYPE_CHOICES),
        'headerIdentities': _choice_list(ProfessionalProfile.HEADER_IDENTITY_CHOICES),
        'statuses': _choice_list(ProfessionalProfile.CURRENT_STATUS_CHOICES),
        'workModes': _choice_list(ProfessionalProfile.WORK_MODE_CHOICES),
        'templates': _choice_list(ProfessionalProfile.TEMPLATE_CHOICES),
        'lookingFor': _choice_list(LOOKING_FOR_CHOICES),
        'serviceIcons': _choice_list(SERVICE_ICON_CHOICES),
        'highlightTypes': _choice_list(ProfessionalPortfolioItem.HIGHLIGHT_TYPES),
        'documentTypes': _choice_list(ProfessionalDocument.DOCUMENT_TYPES),
        'professionSuggestions': PROFESSION_SUGGESTIONS,
    }


def _professional_payload(profile, detailed=True):
    data = {
        'id': profile.id,
        'fullName': profile.full_name,
        'slug': profile.slug,
        'profession': profile.profession,
        'companyName': profile.company_name,
        'templateName': profile.template_name,
        'isActive': profile.is_active,
        'isVerified': profile.is_verified,
        'views': profile.views,
        'downloads': profile.downloads,
        'updatedAt': profile.updated_at.isoformat(),
        'publicUrl': reverse('professional_cards:public_profile', args=[profile.slug]),
        'editUrl': f'/dashboard/professional-cards/{profile.id}/edit/',
    }
    if not detailed:
        return data

    data.update({
        'fields': {
            field_name: _professional_value(profile, field_name)
            for field_name in PROFESSIONAL_FIELDS
        },
        'loginUsername': (
            profile.owner.username
            if profile.owner_id and not profile.owner.is_staff and not profile.owner.is_superuser
            else ''
        ),
        'completion': _profile_completion(profile),
        'services': [
            {
                'id': item.id,
                'title': item.title,
                'description': item.description,
                'icon': item.icon,
                'display_order': item.display_order,
            }
            for item in profile.services.all()
        ],
        'portfolio': [
            {
                'id': item.id,
                'title': item.title,
                'highlight_type': item.highlight_type,
                'organization': item.organization,
                'period': item.period,
                'description': item.description,
                'image': _file_url(item.image),
                'link': item.link,
                'display_order': item.display_order,
            }
            for item in profile.portfolio_items.all()
        ],
        'testimonials': [
            {
                'id': item.id,
                'review_text': item.review_text,
                'client_name': item.client_name,
                'client_role': item.client_role,
                'organization': item.organization,
                'profile_photo': _file_url(item.profile_photo),
                'rating': item.rating,
                'display_order': item.display_order,
            }
            for item in profile.testimonials.all()
        ],
        'documents': [
            {
                'id': item.id,
                'title': item.title,
                'file': _file_url(item.file),
                'document_type': item.document_type,
                'is_public': item.is_public,
                'display_order': item.display_order,
            }
            for item in profile.documents.all()
        ],
        'options': _professional_options(),
    })
    return data


def _professional_form_data(request):
    if request.content_type and 'application/json' in request.content_type:
        payload = _json_body(request)
        query = QueryDict('', mutable=True)
        for key, value in payload.get('fields', payload).items():
            if isinstance(value, list):
                query.setlist(key, [str(item) for item in value])
            elif value is not None:
                query[key] = str(value)
        if payload.get('loginUsername') is not None:
            query['login_username'] = str(payload.get('loginUsername') or '')
        if payload.get('loginPassword') is not None:
            query['login_password'] = str(payload.get('loginPassword') or '')
        return query, {}, payload.get('collections', {})
    collections = {}
    try:
        collections = json.loads(request.POST.get('collections') or '{}')
    except json.JSONDecodeError:
        pass
    return request.POST, request.FILES, collections


def _sync_professional_collections(profile, collections, files):
    services = collections.get('services', [])
    portfolio = collections.get('portfolio', [])
    testimonials = collections.get('testimonials', [])
    documents = collections.get('documents', [])

    public_documents = [
        item for item in documents
        if not item.get('_delete') and _bool(item.get('is_public'), True)
    ]
    if len(public_documents) > 2:
        raise ValidationError('Keep public documents limited to two.')

    def keep_ids(rows):
        return {
            _int(row.get('id'))
            for row in rows
            if _int(row.get('id')) and not row.get('_delete')
        }

    profile.services.exclude(id__in=keep_ids(services)).delete()
    for index, row in enumerate(services):
        if row.get('_delete') or not str(row.get('title') or '').strip():
            continue
        item = profile.services.filter(id=_int(row.get('id'))).first() or ProfessionalService(profile=profile)
        item.title = str(row.get('title') or '').strip()
        item.description = str(row.get('description') or '').strip()
        item.icon = str(row.get('icon') or '').strip()
        item.display_order = _int(row.get('display_order'), index)
        item.full_clean()
        item.save()

    profile.portfolio_items.exclude(id__in=keep_ids(portfolio)).delete()
    for index, row in enumerate(portfolio):
        if row.get('_delete') or not str(row.get('title') or '').strip():
            continue
        item = profile.portfolio_items.filter(id=_int(row.get('id'))).first() or ProfessionalPortfolioItem(profile=profile)
        item.title = str(row.get('title') or '').strip()
        item.highlight_type = str(row.get('highlight_type') or 'project')
        item.organization = str(row.get('organization') or '').strip()
        item.period = str(row.get('period') or '').strip()
        item.description = str(row.get('description') or '').strip()
        item.link = str(row.get('link') or '').strip()
        item.display_order = _int(row.get('display_order'), index)
        upload = files.get(f"portfolio_file_{row.get('uploadKey', index)}")
        if upload:
            item.image = upload
        item.full_clean()
        item.save()

    profile.testimonials.exclude(id__in=keep_ids(testimonials)).delete()
    for index, row in enumerate(testimonials):
        if row.get('_delete') or not str(row.get('client_name') or '').strip():
            continue
        item = profile.testimonials.filter(id=_int(row.get('id'))).first() or ProfessionalTestimonial(profile=profile)
        item.review_text = str(row.get('review_text') or '').strip()
        item.client_name = str(row.get('client_name') or '').strip()
        item.client_role = str(row.get('client_role') or '').strip()
        item.organization = str(row.get('organization') or '').strip()
        item.rating = _int(row.get('rating')) or None
        item.display_order = _int(row.get('display_order'), index)
        upload = files.get(f"testimonial_file_{row.get('uploadKey', index)}")
        if upload:
            item.profile_photo = upload
        item.full_clean()
        item.save()

    profile.documents.exclude(id__in=keep_ids(documents)).delete()
    for index, row in enumerate(documents):
        if row.get('_delete') or not str(row.get('title') or '').strip():
            continue
        item = profile.documents.filter(id=_int(row.get('id'))).first() or ProfessionalDocument(profile=profile)
        item.title = str(row.get('title') or '').strip()
        item.document_type = str(row.get('document_type') or 'other')
        item.is_public = _bool(row.get('is_public'), True)
        item.display_order = _int(row.get('display_order'), index)
        upload = files.get(f"document_file_{row.get('uploadKey', index)}")
        if upload:
            item.file = upload
        if not item.file:
            raise ValidationError(f'Choose a file for {item.title}.')
        item.full_clean()
        item.save()


@require_http_methods(['GET', 'POST'])
def professional_profiles_manage_api(request):
    permission_error = _require_platform_admin(request)
    if permission_error:
        return permission_error

    if request.method == 'GET':
        query = str(request.GET.get('q') or '').strip()
        profiles = ProfessionalProfile.objects.select_related('owner').order_by('-updated_at')
        if query:
            profiles = profiles.filter(
                Q(full_name__icontains=query)
                | Q(company_name__icontains=query)
                | Q(profession__icontains=query)
                | Q(designation__icontains=query)
            )
        return JsonResponse({
            'ok': True,
            'profiles': [_professional_payload(profile, detailed=False) for profile in profiles],
            'counts': {
                'total': ProfessionalProfile.objects.count(),
                'active': ProfessionalProfile.objects.filter(is_active=True).count(),
            },
            'options': _professional_options(),
        })

    form_data, files, collections = _professional_form_data(request)
    profile = ProfessionalProfile(owner=request.user)
    form = ProfessionalProfileForm(form_data, files, instance=profile)
    if not form.is_valid():
        return _json_error('Please correct the highlighted fields.', errors=_form_errors(form))
    login_error = _validate_profile_login_user(profile, form)
    if login_error:
        return _json_error(login_error, errors={'login_username': [login_error]})
    try:
        with transaction.atomic():
            profile = form.save(commit=False)
            if not profile.slug:
                profile.slug = slugify(profile.full_name)
            profile.owner = request.user
            profile.save()
            _sync_profile_login_user(request, profile, form)
            _sync_professional_collections(profile, collections, files)
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'profile': _professional_payload(profile)}, status=201)


def _professional_for_request(request, pk=None, slug=None):
    query = ProfessionalProfile.objects.select_related('owner')
    profile = get_object_or_404(query, pk=pk) if pk is not None else get_object_or_404(query, slug=slug)
    if not can_manage_professional_profile(request.user, profile):
        return None, _json_error('You do not have permission to manage this profile.', status=403)
    return profile, None


@require_http_methods(['GET', 'POST', 'DELETE'])
def professional_profile_manage_api(request, pk):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    profile, permission_error = _professional_for_request(request, pk=pk)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'profile': _professional_payload(profile)})
    if request.method == 'DELETE':
        if not platform_admin_required(request.user):
            return _json_error('Only platform administrators can delete profiles.', status=403)
        profile.delete()
        return JsonResponse({'ok': True})

    form_data, files, collections = _professional_form_data(request)
    form_class = ProfessionalProfileForm if platform_admin_required(request.user) else ProfessionalProfileOwnerForm
    form = form_class(form_data, files, instance=profile)
    if not form.is_valid():
        return _json_error('Please correct the highlighted fields.', errors=_form_errors(form))
    login_error = _validate_profile_login_user(profile, form)
    if login_error:
        return _json_error(login_error, errors={'login_username': [login_error]})
    try:
        with transaction.atomic():
            profile = form.save()
            _sync_profile_login_user(request, profile, form)
            _sync_professional_collections(profile, collections, files)
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'profile': _professional_payload(profile)})


@require_http_methods(['GET'])
def professional_profile_owner_api(request, slug):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    profile, permission_error = _professional_for_request(request, slug=slug)
    if permission_error:
        return permission_error
    return JsonResponse({'ok': True, 'profile': _professional_payload(profile)})


@require_http_methods(['POST'])
def professional_profile_login_api(request, slug):
    profile = get_object_or_404(ProfessionalProfile.objects.select_related('owner'), slug=slug, is_active=True)
    payload = _json_body(request)
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')
    user = authenticate(request, username=username, password=password)
    if not user or not profile.owner_id or profile.owner_id != user.id:
        return _json_error('Invalid profile username or password.')
    login(request, user)
    return JsonResponse({'ok': True, 'redirectPath': f'/p/{slug}/edit/'})


def _student_fields(student):
    fields = [
        'name', 'phone', 'email', 'bio', 'username', 'profile_category', 'member_type',
        'organization_name', 'role', 'address', 'emergency_contact_name',
        'emergency_contact_phone', 'map_url', 'academic_level', 'section',
        'roll_number', 'blood_group', 'gender', 'about_intro', 'about_featured',
        'about_current', 'additional_info_heading', 'additional_info_description',
        'social_stack', 'facebook', 'messenger', 'whatsapp', 'instagram', 'twitter',
        'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website',
        'show_contact_card', 'print_card_type', 'print_orientation',
        'print_front_design', 'print_back_design', 'print_calendar',
        'print_valid_till', 'print_label', 'print_custom_note',
    ]
    return {field: getattr(student, field) for field in fields}


def _student_manage_payload(request, student):
    managed_school = College.objects.filter(admin_user=request.user).first() if request.user.is_authenticated else None
    can_manage_school_fields = bool(
        request.user.is_authenticated
        and (_is_super_admin(request.user) or (managed_school and managed_school.id == student.college_id))
    )
    return {
        'id': student.id,
        'fields': _student_fields(student),
        'collegeId': student.college_id,
        'collegeName': student.college.name if student.college else '',
        'uniqueIdentifier': student.unique_identifier or '',
        'profilePhoto': _file_url(student.profile_photo),
        'coverPhoto': _file_url(student.cover_photo),
        'cv': _file_url(student.cv),
        'birthCertificate': _file_url(student.birth_certificate),
        'skills': list(student.skills.order_by('name').values_list('name', flat=True)),
        'canManageSchoolFields': can_manage_school_fields,
        'completion': _calculate_profile_completion(student),
        'publicUrl': reverse('student_contact_card', args=[student.id]),
        'options': {
            'colleges': [
                {'value': college.id, 'label': college.name}
                for college in College.objects.order_by('name')
            ],
            'profileCategories': _choice_list(StudentProfile.PROFILE_CATEGORY_CHOICES),
            'memberTypes': _choice_list(StudentProfile.MEMBER_TYPE_CHOICES),
            'academicLevels': _choice_list(ACADEMIC_LEVEL_CHOICES),
            'genders': _choice_list(GENDER_CHOICES),
            'schoolRoles': [{'value': value, 'label': value} for value in SCHOOL_ROLE_CHOICES],
            'socials': [{'value': value, 'label': value.replace('_', ' ').title()} for value in SOCIAL_CHOICES],
            'printCardTypes': PRINT_CARD_TYPES,
            'printOrientations': PRINT_ORIENTATIONS,
            'frontDesigns': [
                {'value': key, **meta}
                for key, meta in PRINT_FRONT_THEMES.items()
            ],
            'backDesigns': [
                {'value': key, **meta}
                for key, meta in PRINT_BACK_THEMES.items()
            ],
        },
    }


def _public_student_payload(request, student):
    context = _school_card_context(request, student)
    return {
        'id': student.id,
        'name': student.name,
        'email': student.email if context['can_view_private_details'] else '',
        'phone': student.phone if context['can_view_private_details'] else '',
        'school': {
            'name': context['school_name'],
            'website': context['school_website'],
            'websiteUrl': context['school_website_url'],
            'phone': context['school_phone'],
            'address': context['school_address'],
            'logo': context['school_logo_url'],
        },
        'profilePhoto': context['student_photo_url'],
        'coverPhoto': context['cover_photo_url'],
        'memberType': context['member_type_label'],
        'gradeLabel': context['grade_label'],
        'section': context['section_label'],
        'gradeSection': context['grade_section'],
        'identifier': context['student_identifier'],
        'identifierLabel': context['student_identifier_label'],
        'role': student.role or context['member_type_label'],
        'organization': student.organization_name or context['school_name'],
        'address': context['student_address'] or context['school_address'],
        'guardianLabel': context['parent_label'],
        'guardianName': context['parent_name'] if context['can_view_private_details'] else '',
        'emergencyPhone': context['emergency_contact_phone'] if context['can_view_private_details'] else '',
        'bloodGroup': context['blood_group'] if context['can_view_private_details'] else '',
        'additionalInfoHeading': context['additional_info_heading'],
        'additionalInfoDescription': context['additional_info_description'],
        'intro': context['public_intro'],
        'featured': context['public_featured'],
        'current': context['public_current'],
        'skills': [skill.name for skill in context['public_skills']],
        'socials': context['social_links'],
        'actions': {
            'phone': context['phone_action_url'],
            'whatsapp': context['whatsapp_action_url'],
            'map': context['navigate_url'],
            'website': context['website_url'],
            'vcard': context['download_vcard_url'],
            'qr': context['qr_code_url'],
            'edit': context['edit_profile_url'],
            'birthCertificate': context['birth_certificate_url'] if context['has_birth_certificate'] else '',
        },
        'canViewPrivateDetails': context['can_view_private_details'],
        'publicUrl': context['public_card_url'],
    }


@require_http_methods(['GET'])
def student_public_api(request, student_id):
    student = get_object_or_404(StudentProfile.objects.select_related('college'), pk=student_id)
    if not student.show_contact_card and not _can_manage_profile(request.user, student):
        return _json_error('This profile is currently unavailable.', status=403)
    StudentProfile.objects.filter(pk=student.pk).update(views=student.views + 1)
    _log_profile_activity(student, 'view', 'react-digital-card')
    return JsonResponse({'ok': True, 'profile': _public_student_payload(request, student)})


@require_http_methods(['POST'])
def student_login_api(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)
    if not _profile_supports_self_service(student):
        return _json_error('This profile is managed by the school.', status=403)
    payload = _json_body(request)
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')
    if username != student.username or not check_password(password, student.password):
        return _json_error('Invalid username or password.')
    profile_user = _sync_profile_auth_user(student, password)
    student.save(update_fields=['auth_user', 'username'])
    login(request, profile_user, backend='django.contrib.auth.backends.ModelBackend')
    request.session[_student_edit_session_key(student.id)] = True
    return JsonResponse({'ok': True, 'redirectPath': f'/student/{student.id}/manage/'})


def _student_permission(request, student):
    if not (
        _can_manage_profile(request.user, student)
        or _is_student_edit_authorized(request, student.id)
    ):
        return _json_error('Please sign in to manage this profile.', status=403)
    return None


STUDENT_MUTABLE_FIELDS = [
    'name', 'phone', 'email', 'bio', 'username', 'profile_category', 'member_type',
    'organization_name', 'role', 'address', 'emergency_contact_name',
    'emergency_contact_phone', 'map_url', 'academic_level', 'section',
    'roll_number', 'blood_group', 'gender', 'about_intro', 'about_featured',
    'about_current', 'additional_info_heading', 'additional_info_description',
    'facebook', 'messenger', 'whatsapp', 'instagram', 'twitter', 'linkedin',
    'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website',
    'print_card_type', 'print_orientation', 'print_front_design',
    'print_back_design', 'print_calendar', 'print_valid_till', 'print_label',
    'print_custom_note',
]


def _update_student_from_request(request, student, allow_school_fields):
    payload = _json_body(request)
    source = payload.get('fields', payload) if isinstance(payload, dict) else payload
    protected_school_fields = {'profile_category', 'member_type', 'academic_level', 'section', 'roll_number'}
    for field in STUDENT_MUTABLE_FIELDS:
        if field in protected_school_fields and not allow_school_fields:
            continue
        if field in source:
            setattr(student, field, source.get(field) or '')
    if 'show_contact_card' in source:
        student.show_contact_card = _bool(source.get('show_contact_card'), student.show_contact_card)
    if allow_school_fields and 'college' in source:
        college_id = _int(source.get('college'))
        student.college = College.objects.filter(pk=college_id).first() if college_id else None
    for field in ['profile_photo', 'cover_photo', 'cv', 'birth_certificate']:
        if request.FILES.get(field):
            setattr(student, field, request.FILES[field])

    raw_skills = source.get('skills') if hasattr(source, 'get') else None
    if raw_skills is not None:
        if isinstance(raw_skills, str):
            try:
                raw_skills = json.loads(raw_skills)
            except json.JSONDecodeError:
                raw_skills = [item.strip() for item in raw_skills.split(',') if item.strip()]
        skill_objects = []
        for skill_name in raw_skills or []:
            skill, _ = Skill.objects.get_or_create(name=str(skill_name).strip())
            skill_objects.append(skill)
        student.skills.set(skill_objects)

    raw_socials = source.get('social_stack') if hasattr(source, 'get') else None
    if raw_socials is not None:
        if isinstance(raw_socials, list):
            student.social_stack = ','.join(str(item) for item in raw_socials)
        else:
            student.social_stack = str(raw_socials)

    student.contact_template = 'student_digital_card.html'
    student.full_clean(exclude=['password'])
    student.save()
    _sync_profile_auth_user(student)
    student.save(update_fields=['auth_user', 'username'])
    return student


@require_http_methods(['GET', 'POST', 'DELETE'])
def student_manage_api(request, student_id):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    student = get_object_or_404(StudentProfile.objects.select_related('college', 'auth_user'), pk=student_id)
    permission_error = _student_permission(request, student)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'profile': _student_manage_payload(request, student)})
    if request.method == 'DELETE':
        if not (_is_super_admin(request.user) or College.objects.filter(admin_user=request.user, id=student.college_id).exists()):
            return _json_error('Only school administrators can delete profiles.', status=403)
        student.delete()
        return JsonResponse({'ok': True})

    managed_school = College.objects.filter(admin_user=request.user).first()
    allow_school_fields = _is_super_admin(request.user) or bool(
        managed_school and managed_school.id == student.college_id
    )
    try:
        with transaction.atomic():
            student = _update_student_from_request(request, student, allow_school_fields)
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'profile': _student_manage_payload(request, student)})


@require_http_methods(['GET', 'POST'])
def student_owner_dashboard_api(request, student_id):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    student = get_object_or_404(StudentProfile.objects.select_related('college'), pk=student_id)
    permission_error = _student_permission(request, student)
    if permission_error:
        return permission_error
    if not _profile_supports_self_service(student):
        return _json_error('This profile is managed by the school.', status=403)

    if request.method == 'POST':
        payload = _json_body(request)
        action = payload.get('action')
        if action == 'toggle_contact_card':
            student.show_contact_card = not student.show_contact_card
            student.save(update_fields=['show_contact_card'])
        elif action == 'change_password':
            current_password = str(payload.get('currentPassword') or '')
            new_password = str(payload.get('newPassword') or '')
            if not check_password(current_password, student.password):
                return _json_error('Current password is incorrect.')
            if len(new_password) < 6:
                return _json_error('New password must be at least 6 characters long.')
            if new_password != str(payload.get('confirmPassword') or ''):
                return _json_error('New passwords do not match.')
            student.password = new_password
            student.save(update_fields=['password'])
            user = _sync_profile_auth_user(student, new_password)
            student.save(update_fields=['password', 'auth_user', 'username'])
            update_session_auth_hash(request, user)
        else:
            return _json_error('Unknown dashboard action.')

    seven_days_ago = timezone.now() - timedelta(days=6)
    activity_rows = (
        student.activities.filter(created_at__date__gte=seven_days_ago.date())
        .annotate(day=TruncDate('created_at'))
        .values('day', 'event_type')
        .annotate(total=Count('id'))
        .order_by('day', 'event_type')
    )
    activity_map = {}
    for row in activity_rows:
        activity_map.setdefault(row['day'], {'view': 0, 'download': 0, 'contact': 0})
        activity_map[row['day']][row['event_type']] = row['total']
    daily = []
    for offset in range(6, -1, -1):
        day = (timezone.now() - timedelta(days=offset)).date()
        counts = activity_map.get(day, {'view': 0, 'download': 0, 'contact': 0})
        daily.append({'day': day.isoformat(), **counts})
    recent = [
        {
            'id': item.id,
            'type': item.get_event_type_display(),
            'action': item.action,
            'createdAt': item.created_at.isoformat(),
        }
        for item in student.activities.all()[:8]
    ]
    return JsonResponse({
        'ok': True,
        'dashboard': {
            'profile': _student_manage_payload(request, student),
            'organization': student.organization_name or (student.college.name if student.college else 'Personal Brand'),
            'stats': {
                'views': student.views,
                'downloads': student.downloads,
                'contacts': student.contact_clicks,
                'totalEngagement': student.views + student.downloads + student.contact_clicks,
                'completion': _calculate_profile_completion(student),
                'isVisible': student.show_contact_card,
            },
            'daily': daily,
            'recent': recent,
        },
    })


def _dashboard_school(request, required=True):
    role = _get_user_role(request.user)
    if role not in {'super_admin', 'school_admin'}:
        return None, role
    if role == 'super_admin':
        school_id = _int(request.GET.get('school') or request.POST.get('school'))
        school = College.objects.filter(pk=school_id).first() if school_id else College.objects.order_by('name').first()
    else:
        school = College.objects.filter(admin_user=request.user).first()
    return school, role


def _school_payload(school, with_stats=False):
    payload = {
        'id': school.id,
        'name': school.name,
        'slogan': school.slogan or '',
        'address': school.address or '',
        'logo': _file_url(school.logo),
        'principalName': school.principal_name or '',
        'principalSignature': _file_url(school.principal_signature),
        'website': school.website or '',
        'email': school.email or '',
        'phone': school.phone or '',
        'usernamePrefix': school.student_username_prefix or '',
        'effectiveUsernamePrefix': _school_username_prefix(school),
        'themePrimary': school.theme_primary,
        'themeLightPrimary': school.theme_light_primary,
        'themeSecondary': school.theme_secondary,
        'themeTernary': school.theme_ternary,
        'description': school.description or '',
        'adminUsername': school.admin_user.username if school.admin_user else '',
    }
    if with_stats:
        student_query = school.students.filter(profile_category='school', member_type='student')
        payload['stats'] = {
            'students': student_query.count(),
            'teachers': school.students.filter(profile_category='school', member_type='teacher').count(),
            'live': student_query.filter(show_contact_card=True).count(),
        }
    return payload


def _dashboard_shell(request, active, school=None):
    schools = College.objects.order_by('name')
    role = _get_user_role(request.user)
    return {
        'active': active,
        'role': role,
        'isSuperAdmin': role == 'super_admin',
        'currentSchool': _school_payload(school) if school else None,
        'schools': [{'id': item.id, 'name': item.name} for item in schools],
        'user': {
            'username': request.user.username,
            'displayName': request.user.get_full_name().strip() or request.user.username,
        },
    }


@require_http_methods(['GET', 'POST'])
def dashboard_schools_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    if not _is_super_admin(request.user):
        return _json_error('Only platform administrators can manage schools.', status=403)
    if request.method == 'GET':
        schools = College.objects.select_related('admin_user').order_by('name')
        return JsonResponse({
            'ok': True,
            'shell': _dashboard_shell(request, 'schools'),
            'schools': [_school_payload(school, with_stats=True) for school in schools],
        })

    payload = _json_body(request)
    source = payload.get('fields', payload) if isinstance(payload, dict) else payload
    name = str(source.get('name') or '').strip()
    username = str(source.get('adminUsername') or source.get('admin_username') or '').strip()
    password = str(source.get('adminPassword') or source.get('admin_password') or '').strip()
    if not name or not username or not password:
        return _json_error('School name, admin username, and password are required.')
    try:
        with transaction.atomic():
            school = College(name=name)
            _apply_school_fields(request, school, source)
            school.save()
            _sync_school_admin_user(school, username, password)
            school.save()
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'school': _school_payload(school, True)}, status=201)


def _apply_school_fields(request, school, source):
    mapping = {
        'name': 'name',
        'slogan': 'slogan',
        'address': 'address',
        'principalName': 'principal_name',
        'principal_name': 'principal_name',
        'website': 'website',
        'email': 'email',
        'phone': 'phone',
        'usernamePrefix': 'student_username_prefix',
        'student_username_prefix': 'student_username_prefix',
        'themePrimary': 'theme_primary',
        'themeLightPrimary': 'theme_light_primary',
        'themeSecondary': 'theme_secondary',
        'themeTernary': 'theme_ternary',
        'description': 'description',
    }
    for key, field in mapping.items():
        if key in source:
            setattr(school, field, source.get(key) or '')
    if request.FILES.get('logo'):
        school.logo = request.FILES['logo']
    if request.FILES.get('principal_signature'):
        school.principal_signature = request.FILES['principal_signature']
    school.full_clean(exclude=['admin_user'])


@require_http_methods(['GET', 'POST', 'DELETE'])
def dashboard_school_api(request, school_id):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school = get_object_or_404(College.objects.select_related('admin_user'), pk=school_id)
    if not (_is_super_admin(request.user) or school.admin_user_id == request.user.id):
        return _json_error('You do not have access to this school.', status=403)
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'school': _school_payload(school, True)})
    if request.method == 'DELETE':
        if not _is_super_admin(request.user):
            return _json_error('Only platform administrators can delete schools.', status=403)
        school.delete()
        return JsonResponse({'ok': True})

    payload = _json_body(request)
    source = payload.get('fields', payload) if isinstance(payload, dict) else payload
    try:
        with transaction.atomic():
            _apply_school_fields(request, school, source)
            username = str(source.get('adminUsername') or source.get('admin_username') or '').strip()
            password = str(source.get('adminPassword') or source.get('admin_password') or '').strip()
            if username:
                _sync_school_admin_user(school, username, password)
            school.save()
            StudentProfile.objects.filter(
                college=school,
                profile_category='school',
                member_type='student',
            ).update(organization_name=school.name)
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'school': _school_payload(school, True)})


def _member_row(member):
    return {
        'id': member.id,
        'name': member.name,
        'username': member.username,
        'phone': member.phone,
        'email': member.email,
        'role': member.role or member.get_member_type_display(),
        'memberType': member.member_type,
        'academicLevel': member.academic_level,
        'academicLabel': member.get_academic_level_display() if member.academic_level else '',
        'section': member.section,
        'rollNumber': member.roll_number,
        'identifier': member.unique_identifier or '',
        'photo': _file_url(member.profile_photo),
        'isVisible': member.show_contact_card,
        'views': member.views,
        'contacts': member.contact_clicks,
        'downloads': member.downloads,
        'publicUrl': reverse('student_contact_card', args=[member.id]),
    }


@require_http_methods(['GET', 'POST'])
def dashboard_members_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school, role = _dashboard_school(request)
    if role not in {'super_admin', 'school_admin'}:
        return _json_error('You do not have access to school members.', status=403)
    if not school:
        return _json_error('Select a school first.', status=404)

    if request.method == 'GET':
        member_type = str(request.GET.get('type') or 'student')
        query = _school_member_queryset(school, member_type)
        search = str(request.GET.get('q') or '').strip()
        academic_level = str(request.GET.get('academic_level') or '').strip()
        section = str(request.GET.get('section') or '').strip()
        role_filter = str(request.GET.get('role') or '').strip()
        if search:
            query = query.filter(
                Q(name__icontains=search)
                | Q(username__icontains=search)
                | Q(phone__icontains=search)
                | Q(roll_number__icontains=search)
            )
        if academic_level:
            query = query.filter(academic_level=academic_level)
        if section:
            query = query.filter(section=section)
        if role_filter:
            query = query.filter(role=role_filter)
        return JsonResponse({
            'ok': True,
            'shell': _dashboard_shell(request, 'teachers' if member_type == 'teacher' else 'students', school),
            'members': [_member_row(member) for member in query],
            'filters': {
                'sections': _unique_sections_for_school(school),
                'academicLevels': _choice_list(ACADEMIC_LEVEL_CHOICES),
                'roles': list(
                    _school_member_queryset(school, 'teacher')
                    .exclude(role='')
                    .values_list('role', flat=True)
                    .distinct()
                    .order_by('role')
                ),
            },
        })

    payload = _json_body(request)
    source = payload.get('fields', payload) if isinstance(payload, dict) else payload
    name = str(source.get('name') or '').strip()
    phone = str(source.get('phone') or '').strip()
    member_type = str(source.get('member_type') or source.get('memberType') or 'student')
    if not name or not phone:
        return _json_error('Name and phone are required.')
    roll_number = str(source.get('roll_number') or source.get('rollNumber') or '').strip()
    username = str(source.get('username') or '').strip() or _suggest_school_username(school, name, roll_number)
    raw_password = str(source.get('password') or '') or _generate_profile_password(name)
    student = StudentProfile(
        name=name,
        phone=phone,
        email=str(source.get('email') or ''),
        username=username,
        college=school,
        profile_category='school',
        member_type=member_type,
        organization_name=school.name,
        role=str(source.get('role') or ('Teacher' if member_type == 'teacher' else 'Student')),
        password=raw_password,
    )
    try:
        with transaction.atomic():
            student.save()
            _update_student_from_request(request, student, True)
            if _profile_supports_self_service(student):
                _sync_profile_auth_user(student, raw_password)
                student.save(update_fields=['auth_user', 'username'])
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({
        'ok': True,
        'member': _member_row(student),
        'generatedPassword': raw_password,
    }, status=201)


@require_http_methods(['GET', 'POST'])
def dashboard_reports_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school, role = _dashboard_school(request)
    if role not in {'super_admin', 'school_admin'}:
        return _json_error('You do not have access to reports.', status=403)
    if not school:
        return _json_error('Select a school first.', status=404)
    analytics = _school_analytics(school)
    activities = ProfileActivity.objects.filter(student__college=school)
    recent = activities.filter(created_at__gte=timezone.now() - timedelta(days=30))
    breakdown = {
        item['event_type']: item['total']
        for item in recent.values('event_type').annotate(total=Count('id'))
    }
    top_profiles = (
        analytics['students'].annotate(interactions=Count('activities'))
        .order_by('-interactions', 'name')[:8]
    )
    return JsonResponse({
        'ok': True,
        'shell': _dashboard_shell(request, 'reports', school),
        'report': {
            'memberCount': analytics['members'].count(),
            'studentCount': analytics['students'].count(),
            'liveProfileCount': analytics['students'].filter(show_contact_card=True).count(),
            'activeCardCount': analytics['active_card_count'],
            'interactionCount': recent.count(),
            'profileViews': breakdown.get('view', 0),
            'contactActions': breakdown.get('contact', 0),
            'vcardDownloads': breakdown.get('download', 0),
            'classRows': analytics['class_rows'],
            'topProfiles': [
                {**_member_row(item), 'interactions': item.interactions}
                for item in top_profiles
            ],
            'recentActivities': [
                {
                    'id': item.id,
                    'student': item.student.name,
                    'type': item.get_event_type_display(),
                    'action': item.action,
                    'createdAt': item.created_at.isoformat(),
                }
                for item in recent.select_related('student')[:12]
            ],
        },
    })


@require_http_methods(['GET', 'POST'])
def dashboard_settings_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school, role = _dashboard_school(request)
    if role not in {'super_admin', 'school_admin'}:
        return _json_error('You do not have access to school settings.', status=403)
    if not school:
        return _json_error('Select a school first.', status=404)
    if request.method == 'GET':
        return JsonResponse({
            'ok': True,
            'shell': _dashboard_shell(request, 'settings', school),
            'school': _school_payload(school, True),
        })
    return dashboard_school_api(request, school.id)


@require_http_methods(['GET', 'POST'])
def dashboard_credentials_api(request, student_id):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    student = get_object_or_404(StudentProfile.objects.select_related('college', 'auth_user'), pk=student_id)
    managed = _is_super_admin(request.user) or (
        student.college_id
        and College.objects.filter(pk=student.college_id, admin_user=request.user).exists()
    )
    if not managed:
        return _json_error('You do not have access to these credentials.', status=403)
    suggested = _suggest_school_username(
        student.college,
        student.name,
        student.roll_number or student.unique_identifier,
        student,
    )
    if request.method == 'GET':
        return JsonResponse({
            'ok': True,
            'credentials': {
                'studentId': student.id,
                'name': student.name,
                'username': student.username,
                'suggestedUsername': suggested,
                'usernamePrefix': _school_username_prefix(student.college),
            },
        })
    payload = _json_body(request)
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('newPassword') or '')
    if not username:
        return _json_error('Username is required.')
    if password and len(password) < 8:
        return _json_error('New passwords must be at least 8 characters long.')
    if StudentProfile.objects.exclude(pk=student.pk).filter(username=username).exists():
        return _json_error('That username is already in use.')
    student.username = username
    if password:
        student.password = password
    student.save()
    _sync_profile_auth_user(student, password or None)
    student.save(update_fields=['auth_user', 'username'])
    return JsonResponse({'ok': True, 'credentials': {'username': student.username}})


@require_http_methods(['POST'])
def dashboard_bulk_upload_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school, role = _dashboard_school(request)
    if role not in {'super_admin', 'school_admin'}:
        return _json_error('You do not have access to bulk upload.', status=403)
    if not school:
        return _json_error('Select a school first.')
    upload = request.FILES.get('file')
    if not upload:
        return _json_error('Choose a CSV or Excel file.')
    try:
        import pandas as pd
        dataframe = pd.read_csv(upload) if upload.name.lower().endswith('.csv') else pd.read_excel(upload)
    except Exception as exc:
        return _json_error(f'Could not read the uploaded file: {exc}')
    missing = [column for column in ['name', 'phone'] if column not in dataframe.columns]
    if missing:
        return _json_error(f"Missing required columns: {', '.join(missing)}")
    member_type = str(request.POST.get('role_type') or 'student')
    created = 0
    skipped = []
    credentials = []
    for index, row in dataframe.fillna('').iterrows():
        name = str(row.get('name') or '').strip()
        phone = str(row.get('phone') or '').strip()
        if not name or not phone:
            skipped.append(index + 2)
            continue
        roll_number = str(row.get('roll_number') or '').strip()
        username = str(row.get('username') or '').strip() or _suggest_school_username(school, name, roll_number)
        password = _generate_profile_password(name)
        try:
            student = StudentProfile.objects.create(
                name=name,
                phone=phone,
                email=str(row.get('email') or '').strip(),
                username=username,
                college=school,
                profile_category='school',
                member_type=member_type,
                role=str(row.get('role') or ('Teacher' if member_type == 'teacher' else 'Student')).strip(),
                address=str(row.get('address') or '').strip(),
                emergency_contact_name=str(row.get('emergency_contact_name') or '').strip(),
                emergency_contact_phone=str(row.get('emergency_contact_phone') or '').strip(),
                academic_level=str(row.get('academic_level') or '').strip(),
                section=str(row.get('section') or '').strip(),
                roll_number=roll_number,
                blood_group=str(row.get('blood_group') or '').strip(),
                gender=str(row.get('gender') or '').strip(),
                organization_name=school.name,
                password=password,
            )
            if _profile_supports_self_service(student):
                _sync_profile_auth_user(student, password)
                student.save(update_fields=['auth_user', 'username'])
            created += 1
            credentials.append({'name': name, 'username': username, 'password': password})
        except (ValidationError, IntegrityError):
            skipped.append(index + 2)
    return JsonResponse({
        'ok': True,
        'summary': {
            'createdCount': created,
            'skippedRows': skipped,
            'filename': upload.name,
            'credentials': credentials,
        },
    })


@require_http_methods(['GET'])
def dashboard_print_controls_api(request):
    permission_error = _require_login(request)
    if permission_error:
        return permission_error
    school, role = _dashboard_school(request)
    if role not in {'super_admin', 'school_admin'}:
        return _json_error('You do not have access to print tools.', status=403)
    if not school:
        return _json_error('Select a school first.', status=404)
    members = _school_member_queryset(school)
    query = _build_dashboard_query(school)
    return JsonResponse({
        'ok': True,
        'shell': _dashboard_shell(request, 'print', school),
        'members': [_member_row(member) for member in members],
        'sections': _unique_sections_for_school(school),
        'academicLevels': _choice_list(ACADEMIC_LEVEL_CHOICES),
        'frontDesigns': [{'value': key, **meta} for key, meta in PRINT_FRONT_THEMES.items()],
        'backDesigns': [{'value': key, **meta} for key, meta in PRINT_BACK_THEMES.items()],
        'orientations': PRINT_ORIENTATIONS,
        'cardTypes': PRINT_CARD_TYPES,
        'endpoints': {
            'preview': f"{reverse('dashboard_print_preview')}{query}",
            'pdf': f"{reverse('dashboard_print_export_pdf')}{query}",
            'qrZip': f"{reverse('dashboard_qr_export_download')}{query}",
        },
    })


def _store_payload(store):
    return {
        'id': store.id,
        'name': store.name,
        'slug': store.slug,
        'logo': _file_url(store.logo),
        'favicon': _file_url(store.favicon),
        'description': store.description,
        'phone': store.phone,
        'email': store.email,
        'address': store.address,
        'city': store.city,
        'country': store.country,
        'primaryColor': store.primary_color,
        'secondaryColor': store.secondary_color,
        'selectedTheme': store.selected_theme,
        'subdomain': store.subdomain,
        'customDomain': store.custom_domain,
        'subscriptionPlan': store.subscription_plan,
        'subscriptionStatus': store.subscription_status,
        'isActive': store.is_active,
        'isPublished': store.is_published,
        'heroTitle': store.hero_title,
        'heroSubtitle': store.hero_subtitle,
        'heroLabel': store.hero_label,
        'heroImage': _asset_url(store.hero_image),
        'promoTitle': store.promo_title,
        'promoCode': store.promo_code,
        'promoImage': _asset_url(store.promo_image),
        'websiteConfig': store.website_config or {},
    }


def _category_payload(category):
    return {
        'id': category.id,
        'name': category.name,
        'slug': category.slug,
        'image': _asset_url(category.image),
        'parentId': category.parent_id,
        'displayOrder': category.display_order,
        'isActive': category.is_active,
        'productCount': getattr(category, 'product_count', category.products.count()),
    }


def _product_image(product):
    first_upload = product.images.first() if hasattr(product, 'images') else None
    return _file_url(first_upload.image) if first_upload else _asset_url(product.image)


def _product_payload(product, detailed=False):
    regular = product.regular_price
    current = product.current_price
    payload = {
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'brand': product.brand,
        'categoryId': product.category_id,
        'category': product.category.name if product.category else '',
        'shortDescription': product.short_description,
        'regularPrice': str(regular),
        'discountedPrice': str(product.discounted_price) if product.discounted_price is not None else '',
        'currentPrice': str(current),
        'discountPercent': (
            int((regular - current) * 100 / regular)
            if regular and current < regular else 0
        ),
        'sku': product.sku,
        'stockQuantity': product.stock_quantity,
        'lowStockThreshold': product.low_stock_threshold,
        'status': product.status,
        'isFeatured': product.is_featured,
        'isTrending': product.is_trending,
        'isNewArrival': product.is_new_arrival,
        'isBestSeller': product.is_best_seller,
        'isInStock': product.is_in_stock,
        'image': _product_image(product),
        'updatedAt': product.updated_at.isoformat(),
    }
    if detailed:
        payload.update({
            'fullDescription': product.full_description,
            'costPrice': str(product.cost_price) if product.cost_price is not None else '',
            'barcode': product.barcode,
            'videoUrl': product.video_url,
            'weight': str(product.weight) if product.weight is not None else '',
            'shippingInformation': product.shipping_information,
            'seoTitle': product.seo_title,
            'seoDescription': product.seo_description,
            'images': [
                {'id': image.id, 'url': _file_url(image.image), 'altText': image.alt_text}
                for image in product.images.all()
            ],
            'options': [
                {
                    'id': option.id,
                    'name': option.name,
                    'values': [
                        {'id': value.id, 'value': value.value}
                        for value in option.values.all()
                    ],
                }
                for option in product.options.all()
            ],
        })
    return payload


def _cart_payload(request, store):
    cart = _cart_summary(request, store)
    return {
        'items': [
            {
                'product': _product_payload(item['product']),
                'quantity': item['quantity'],
                'unitPrice': str(item['unit_price']),
                'lineTotal': str(item['line_total']),
            }
            for item in cart['items']
        ],
        'subtotal': str(cart['subtotal']),
        'discount': str(cart['discount']),
        'deliveryCharge': str(cart['delivery_charge']),
        'grandTotal': str(cart['grand_total']),
        'count': cart['count'],
        'couponCode': cart['coupon_code'],
        'couponApplied': cart['coupon_applied'],
        'freeDeliveryMinimum': (
            str(cart['free_delivery_minimum'])
            if cart['free_delivery_minimum'] is not None else ''
        ),
    }


@require_http_methods(['GET'])
def shop_public_api(request, store_slug):
    store = _published_store(store_slug)
    products = (
        store.products.filter(status='active')
        .select_related('category')
        .prefetch_related('images')
    )
    query = str(request.GET.get('q') or '').strip()
    category_slug = str(request.GET.get('category') or '').strip()
    sort = str(request.GET.get('sort') or 'featured')
    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(brand__icontains=query)
            | Q(category__name__icontains=query)
            | Q(sku__icontains=query)
        )
    if category_slug:
        products = products.filter(
            Q(category__slug=category_slug)
            | Q(category__parent__slug=category_slug)
        )
    sort_map = {
        'featured': ('-is_featured', '-is_trending', 'name'),
        'newest': ('-created_at',),
        'price_low': ('discounted_price', 'regular_price'),
        'price_high': ('-discounted_price', '-regular_price'),
        'name': ('name',),
    }
    products = products.order_by(*sort_map.get(sort, sort_map['featured']))
    categories = (
        store.categories.filter(is_active=True)
        .annotate(product_count=Count('products', filter=Q(products__status='active')))
        .order_by('display_order', 'name')
    )
    product_rows = list(products)
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'categories': [_category_payload(category) for category in categories],
        'products': [_product_payload(product) for product in product_rows],
        'collections': {
            'featured': [_product_payload(item) for item in product_rows if item.is_featured][:8],
            'trending': [_product_payload(item) for item in product_rows if item.is_trending][:8],
            'newArrivals': [_product_payload(item) for item in product_rows if item.is_new_arrival][:8],
            'bestSellers': [_product_payload(item) for item in product_rows if item.is_best_seller][:8],
        },
        'cart': _cart_payload(request, store),
        'filters': {'query': query, 'category': category_slug, 'sort': sort},
        'socialProof': {
            'orders': store.orders.count(),
            'customers': store.customers.count(),
        },
    })


@require_http_methods(['GET'])
def shop_product_public_api(request, store_slug, product_slug):
    store = _published_store(store_slug)
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related(
            'images', 'options__values', 'variants__option_values'
        ),
        store=store,
        slug=product_slug,
        status='active',
    )
    related = (
        store.products.filter(status='active', category=product.category)
        .exclude(pk=product.pk)
        .select_related('category')
        .prefetch_related('images')[:4]
    )
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'product': _product_payload(product, True),
        'related': [_product_payload(item) for item in related],
        'cart': _cart_payload(request, store),
    })


@require_http_methods(['GET', 'POST'])
def shop_cart_api(request, store_slug):
    store = _published_store(store_slug)
    message = ''
    if request.method == 'POST':
        payload = _json_body(request)
        action = payload.get('action')
        key = _cart_session_key(store)
        cart = request.session.get(key, {})
        product_id = str(_int(payload.get('productId')))
        if action == 'add':
            product = get_object_or_404(Product, store=store, pk=product_id, status='active')
            if not product.is_in_stock:
                return _json_error('This product is out of stock.')
            quantity = max(1, _int(payload.get('quantity'), 1))
            cart[product_id] = min(
                product.stock_quantity,
                _int(cart.get(product_id)) + quantity,
            )
            request.session[key] = cart
        elif action == 'update':
            product = get_object_or_404(Product, store=store, pk=product_id)
            quantity = _int(payload.get('quantity'))
            if quantity <= 0:
                cart.pop(product_id, None)
            else:
                cart[product_id] = min(product.stock_quantity or quantity, quantity)
            request.session[key] = cart
        elif action == 'coupon':
            coupon = str(payload.get('coupon') or '').strip().upper()
            coupon_key = f'shop_coupon_{store.slug}'
            if payload.get('remove'):
                request.session.pop(coupon_key, None)
                message = 'Coupon removed.'
            elif coupon == store.promo_code.upper():
                request.session[coupon_key] = coupon
                message = f'{coupon} applied.'
            else:
                request.session.pop(coupon_key, None)
                return _json_error('That coupon code is not valid.')
        else:
            return _json_error('Unknown cart action.')
        request.session.modified = True
    return JsonResponse({'ok': True, 'cart': _cart_payload(request, store), 'message': message})


def _order_payload(order, detailed=False):
    payload = {
        'id': order.id,
        'orderNumber': order.order_number,
        'status': order.status,
        'statusLabel': order.get_status_display(),
        'paymentStatus': order.payment_status,
        'paymentStatusLabel': order.get_payment_status_display(),
        'paymentMethod': order.payment_method,
        'paymentMethodLabel': order.get_payment_method_display(),
        'customerName': order.customer_name,
        'customerPhone': order.customer_phone,
        'customerEmail': order.customer_email,
        'city': order.city,
        'grandTotal': str(order.grand_total),
        'createdAt': order.created_at.isoformat(),
    }
    if detailed:
        payload.update({
            'province': order.province,
            'area': order.area,
            'detailedAddress': order.detailed_address,
            'deliveryInstructions': order.delivery_instructions,
            'subtotal': str(order.subtotal),
            'discountAmount': str(order.discount_amount),
            'deliveryCharge': str(order.delivery_charge),
            'transactionReference': order.transaction_reference,
            'paymentScreenshot': _file_url(order.payment_screenshot),
            'internalNotes': order.internal_notes,
            'items': [
                {
                    'id': item.id,
                    'name': item.product_name,
                    'sku': item.product_sku,
                    'variations': item.selected_variations,
                    'quantity': item.quantity,
                    'unitPrice': str(item.unit_price),
                    'lineTotal': str(item.line_total),
                    'image': _product_image(item.product) if item.product else '',
                }
                for item in order.items.all()
            ],
        })
    return payload


@require_http_methods(['GET', 'POST'])
def shop_checkout_api(request, store_slug):
    store = _published_store(store_slug)
    cart = _cart_summary(request, store)
    payment, _ = PaymentSetting.objects.get_or_create(store=store)
    if request.method == 'GET':
        return JsonResponse({
            'ok': True,
            'store': _store_payload(store),
            'cart': _cart_payload(request, store),
            'payment': {
                'cashOnDelivery': payment.enable_cash_on_delivery,
                'manualQr': payment.enable_manual_qr,
                'bankTransfer': payment.enable_bank_transfer,
                'qrImage': _file_url(payment.qr_image),
                'bankName': payment.bank_name,
                'bankAccountName': payment.bank_account_name,
                'bankAccountNumber': payment.bank_account_number,
            },
        })
    if not cart['items']:
        return _json_error('Your cart is empty.')
    payload = _json_body(request)
    required = ['fullName', 'phone', 'province', 'city', 'area', 'detailedAddress']
    missing = [field for field in required if not str(payload.get(field) or '').strip()]
    if missing:
        return _json_error('Complete all required delivery fields.', errors={field: ['Required'] for field in missing})
    with transaction.atomic():
        customer, _ = ShopCustomer.objects.get_or_create(
            store=store,
            phone=str(payload['phone']).strip(),
            defaults={
                'full_name': str(payload['fullName']).strip(),
                'email': str(payload.get('email') or '').strip(),
            },
        )
        customer.full_name = str(payload['fullName']).strip()
        customer.email = str(payload.get('email') or '').strip()
        customer.save()
        payment_method = str(payload.get('paymentMethod') or 'cod')
        order = Order.objects.create(
            store=store,
            customer=customer,
            customer_name=customer.full_name,
            customer_phone=customer.phone,
            customer_email=customer.email,
            province=str(payload['province']).strip(),
            city=str(payload['city']).strip(),
            area=str(payload['area']).strip(),
            detailed_address=str(payload['detailedAddress']).strip(),
            delivery_instructions=str(payload.get('deliveryInstructions') or '').strip(),
            payment_method=payment_method,
            payment_status='pending_verification' if payment_method in {'manual_qr', 'bank_transfer'} else 'unpaid',
            transaction_reference=str(payload.get('transactionReference') or '').strip(),
            subtotal=cart['subtotal'],
            discount_amount=cart['discount'],
            delivery_charge=cart['delivery_charge'],
            grand_total=cart['grand_total'],
        )
        for item in cart['items']:
            product = item['product']
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                line_total=item['line_total'],
            )
            Product.objects.filter(pk=product.pk).update(
                stock_quantity=max(0, product.stock_quantity - item['quantity'])
            )
    request.session[_cart_session_key(store)] = {}
    request.session.modified = True
    return JsonResponse({'ok': True, 'order': _order_payload(order, True)}, status=201)


@require_http_methods(['GET'])
def shop_order_public_api(request, store_slug, order_number):
    store = _published_store(store_slug)
    order = get_object_or_404(
        Order.objects.prefetch_related('items__product'),
        store=store,
        order_number=order_number,
    )
    return JsonResponse({'ok': True, 'store': _store_payload(store), 'order': _order_payload(order, True)})


@require_http_methods(['GET'])
def shop_track_order_api(request, store_slug):
    store = _published_store(store_slug)
    order_number = str(request.GET.get('order_number') or '').strip()
    phone = str(request.GET.get('phone') or '').strip()
    order = None
    if order_number and phone:
        order = (
            Order.objects.prefetch_related('items__product')
            .filter(store=store, order_number=order_number, customer_phone=phone)
            .first()
        )
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'searched': bool(order_number),
        'order': _order_payload(order, True) if order else None,
    })


def _shop_owner_store(request, store_slug):
    permission_error = _require_login(request)
    if permission_error:
        return None, permission_error
    store = get_object_or_404(Store, slug=store_slug)
    if not _can_manage_store(request.user, store):
        return None, _json_error('You do not have access to this store.', status=403)
    return store, None


def _shop_stats(store):
    orders = store.orders.all()
    products = store.products.all()
    total_sales = orders.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
    return {
        'totalSales': str(total_sales),
        'totalOrders': orders.count(),
        'pendingOrders': orders.filter(status__in=['new', 'confirmed', 'processing']).count(),
        'totalCustomers': store.customers.count(),
        'productCount': products.count(),
        'activeProducts': products.filter(status='active').count(),
        'lowStock': sum(
            1
            for product in products
            if 0 < product.stock_quantity <= product.low_stock_threshold
        ),
        'outOfStock': products.filter(stock_quantity=0).count(),
    }


@require_http_methods(['GET'])
def shop_owner_dashboard_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    products = store.products.select_related('category').prefetch_related('images')
    orders = store.orders.prefetch_related('items__product')
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'stats': _shop_stats(store),
        'recentOrders': [_order_payload(order) for order in orders[:8]],
        'lowStockProducts': [
            _product_payload(product)
            for product in products.order_by('stock_quantity')
            if product.stock_quantity <= product.low_stock_threshold
        ][:8],
    })


@require_http_methods(['GET', 'POST'])
def shop_owner_products_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        products = (
            store.products.select_related('category')
            .prefetch_related('images', 'options__values')
            .order_by('-updated_at')
        )
        return JsonResponse({
            'ok': True,
            'store': _store_payload(store),
            'stats': _shop_stats(store),
            'products': [_product_payload(product, True) for product in products],
            'categories': [
                _category_payload(category)
                for category in store.categories.order_by('display_order', 'name')
            ],
        })
    return _save_product(request, store, Product(store=store), created=True)


PRODUCT_FIELD_MAP = {
    'name': 'name',
    'slug': 'slug',
    'brand': 'brand',
    'shortDescription': 'short_description',
    'fullDescription': 'full_description',
    'regularPrice': 'regular_price',
    'discountedPrice': 'discounted_price',
    'costPrice': 'cost_price',
    'sku': 'sku',
    'barcode': 'barcode',
    'stockQuantity': 'stock_quantity',
    'lowStockThreshold': 'low_stock_threshold',
    'status': 'status',
    'isFeatured': 'is_featured',
    'isTrending': 'is_trending',
    'isNewArrival': 'is_new_arrival',
    'isBestSeller': 'is_best_seller',
    'image': 'image',
    'videoUrl': 'video_url',
    'weight': 'weight',
    'shippingInformation': 'shipping_information',
    'seoTitle': 'seo_title',
    'seoDescription': 'seo_description',
}


def _save_product(request, store, product, created=False):
    payload = _json_body(request)
    source = payload.get('fields', payload) if isinstance(payload, dict) else payload
    for key, field in PRODUCT_FIELD_MAP.items():
        if key not in source:
            continue
        value = source.get(key)
        model_field = Product._meta.get_field(field)
        if model_field.get_internal_type() == 'BooleanField':
            value = _bool(value)
        elif model_field.get_internal_type() in {'DecimalField'}:
            value = _decimal(value)
        elif model_field.get_internal_type() in {'PositiveIntegerField', 'IntegerField'}:
            value = _int(value)
        setattr(product, field, value if value is not None else '')
    if not product.slug:
        product.slug = slugify(product.name)
    category_id = _int(source.get('categoryId') or source.get('category_id'))
    product.category = store.categories.filter(pk=category_id).first() if category_id else None
    try:
        with transaction.atomic():
            product.full_clean()
            product.save()
            for upload in request.FILES.getlist('images'):
                ProductImage.objects.create(product=product, image=upload, alt_text=product.name)
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse(
        {'ok': True, 'product': _product_payload(product, True)},
        status=201 if created else 200,
    )


@require_http_methods(['GET', 'POST', 'DELETE'])
def shop_owner_product_api(request, store_slug, product_id):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related('images', 'options__values'),
        store=store,
        pk=product_id,
    )
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'product': _product_payload(product, True)})
    if request.method == 'DELETE':
        product.delete()
        return JsonResponse({'ok': True})
    return _save_product(request, store, product)


@require_http_methods(['GET', 'POST'])
def shop_owner_categories_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        categories = (
            store.categories.select_related('parent')
            .annotate(product_count=Count('products'))
            .order_by('display_order', 'name')
        )
        return JsonResponse({
            'ok': True,
            'store': _store_payload(store),
            'categories': [_category_payload(category) for category in categories],
        })
    return _save_category(request, store, Category(store=store), True)


def _save_category(request, store, category, created=False):
    payload = _json_body(request)
    category.name = str(payload.get('name') or category.name).strip()
    category.slug = str(payload.get('slug') or slugify(category.name)).strip()
    category.image = str(payload.get('image') or category.image).strip()
    category.display_order = _int(payload.get('displayOrder'), category.display_order)
    category.is_active = _bool(payload.get('isActive'), category.is_active)
    parent_id = _int(payload.get('parentId'))
    category.parent = store.categories.filter(pk=parent_id).first() if parent_id else None
    try:
        category.full_clean()
        category.save()
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'category': _category_payload(category)}, status=201 if created else 200)


@require_http_methods(['POST', 'DELETE'])
def shop_owner_category_api(request, store_slug, category_id):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    category = get_object_or_404(Category, store=store, pk=category_id)
    if request.method == 'DELETE':
        category.delete()
        return JsonResponse({'ok': True})
    return _save_category(request, store, category)


@require_http_methods(['GET'])
def shop_owner_customers_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    customers = store.customers.annotate(
        order_count=Count('orders', distinct=True),
        total_spent=Sum('orders__grand_total'),
    ).order_by('-total_spent', 'full_name')
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'customers': [
            {
                'id': customer.id,
                'fullName': customer.full_name,
                'phone': customer.phone,
                'email': customer.email,
                'orderCount': customer.order_count,
                'totalSpent': str(customer.total_spent or Decimal('0.00')),
                'createdAt': customer.created_at.isoformat(),
            }
            for customer in customers
        ],
    })


@require_http_methods(['GET'])
def shop_owner_orders_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    status = str(request.GET.get('status') or '').strip()
    orders = store.orders.prefetch_related('items__product')
    if status:
        orders = orders.filter(status=status)
    return JsonResponse({
        'ok': True,
        'store': _store_payload(store),
        'orders': [_order_payload(order, True) for order in orders],
        'statusOptions': _choice_list(Order.STATUS_CHOICES),
        'paymentStatusOptions': _choice_list(Order.PAYMENT_STATUS_CHOICES),
    })


@require_http_methods(['POST'])
def shop_owner_order_api(request, store_slug, order_id):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    order = get_object_or_404(Order.objects.prefetch_related('items__product'), store=store, pk=order_id)
    payload = _json_body(request)
    if payload.get('status') in dict(Order.STATUS_CHOICES):
        order.status = payload['status']
    if payload.get('paymentStatus') in dict(Order.PAYMENT_STATUS_CHOICES):
        order.payment_status = payload['paymentStatus']
    if 'internalNotes' in payload:
        order.internal_notes = str(payload.get('internalNotes') or '')
    order.save()
    return JsonResponse({'ok': True, 'order': _order_payload(order, True)})


def _discount_payload(discount):
    return {
        'id': discount.id,
        'name': discount.name,
        'code': discount.code,
        'discountType': discount.discount_type,
        'value': str(discount.value),
        'minimumOrderAmount': str(discount.minimum_order_amount) if discount.minimum_order_amount is not None else '',
        'startsAt': discount.starts_at.isoformat() if discount.starts_at else '',
        'endsAt': discount.ends_at.isoformat() if discount.ends_at else '',
        'usageLimit': discount.usage_limit,
        'usageCount': discount.usage_count,
        'isActive': discount.is_active,
        'status': discount.status,
    }


@require_http_methods(['GET', 'POST'])
def shop_owner_discounts_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        return JsonResponse({
            'ok': True,
            'store': _store_payload(store),
            'discounts': [_discount_payload(item) for item in store.discounts.all()],
            'typeOptions': _choice_list(Discount.DISCOUNT_TYPE_CHOICES),
        })
    return _save_discount(request, store, Discount(store=store), True)


def _save_discount(request, store, discount, created=False):
    payload = _json_body(request)
    discount.name = str(payload.get('name') or discount.name).strip()
    discount.code = str(payload.get('code') or discount.code).strip().upper()
    discount.discount_type = str(payload.get('discountType') or discount.discount_type)
    discount.value = _decimal(payload.get('value'), Decimal('0.00'))
    discount.minimum_order_amount = _decimal(payload.get('minimumOrderAmount'))
    discount.starts_at = _datetime(payload.get('startsAt'))
    discount.ends_at = _datetime(payload.get('endsAt'))
    discount.usage_limit = _int(payload.get('usageLimit')) or None
    discount.is_active = _bool(payload.get('isActive'), True)
    try:
        discount.full_clean()
        discount.save()
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'discount': _discount_payload(discount)}, status=201 if created else 200)


@require_http_methods(['POST', 'DELETE'])
def shop_owner_discount_api(request, store_slug, discount_id):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    discount = get_object_or_404(Discount, store=store, pk=discount_id)
    if request.method == 'DELETE':
        discount.delete()
        return JsonResponse({'ok': True})
    return _save_discount(request, store, discount)


@require_http_methods(['GET', 'POST'])
def shop_owner_website_api(request, store_slug):
    store, permission_error = _shop_owner_store(request, store_slug)
    if permission_error:
        return permission_error
    if request.method == 'GET':
        return JsonResponse({'ok': True, 'store': _store_payload(store)})
    payload = _json_body(request)
    mapping = {
        'name': 'name',
        'description': 'description',
        'phone': 'phone',
        'email': 'email',
        'address': 'address',
        'city': 'city',
        'country': 'country',
        'primaryColor': 'primary_color',
        'secondaryColor': 'secondary_color',
        'selectedTheme': 'selected_theme',
        'subdomain': 'subdomain',
        'customDomain': 'custom_domain',
        'heroTitle': 'hero_title',
        'heroSubtitle': 'hero_subtitle',
        'heroLabel': 'hero_label',
        'heroImage': 'hero_image',
        'promoTitle': 'promo_title',
        'promoCode': 'promo_code',
        'promoImage': 'promo_image',
    }
    for key, field in mapping.items():
        if key in payload:
            setattr(store, field, payload.get(key) or '')
    if 'isPublished' in payload:
        store.is_published = _bool(payload.get('isPublished'))
    if 'websiteConfig' in payload and isinstance(payload['websiteConfig'], dict):
        store.website_config = payload['websiteConfig']
    if request.FILES.get('logo'):
        store.logo = request.FILES['logo']
    if request.FILES.get('favicon'):
        store.favicon = request.FILES['favicon']
    try:
        store.full_clean()
        store.save()
    except (ValidationError, IntegrityError) as exc:
        return _json_error(str(exc))
    return JsonResponse({'ok': True, 'store': _store_payload(store)})
