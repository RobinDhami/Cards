from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.core.mail import send_mail
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.template import TemplateDoesNotExist
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from .models import StudentProfile, ClientProfile, College, ProfileActivity, Skill
from .forms import (
    StudentProfileForm, EducationFormSet, AchievementFormSet, ProjectFormSet,
    BlogPostFormSet, CertificationFormSet, LanguageFormSet, InterestFormSet, ExperienceFormSet
)

CONTACT_TEMPLATES = {
    'general': ['contact2.html'],
    'vip': ['contact.html', 'contact1.html', 'contact3.html'],
    'premium': ['contact.html', 'contact1.html', 'contact3.html'],
}
PORTFOLIO_TEMPLATES = {
    'vip': ['portfolio1.html', 'portfolio2.html'],
    'premium': ['portfolio1.html', 'portfolio2.html', 'portfolio3.html', 'portfolio4.html', 'portfolio5.html'],
}

SOCIAL_CHOICES = [
    "linkedin", "instagram", "facebook", "messenger", "whatsapp",
    "twitter", "youtube", "tiktok", "github", "figma", "upwork"
]


def _student_edit_session_key(student_id):
    return f'can_edit_student_{student_id}'


def _is_student_edit_authorized(request, student_id):
    return request.session.get(_student_edit_session_key(student_id), False)


def home(request):
    return render(request, 'home.html')


def _build_tracked_action_url(student_id, action):
    return f'/student/{student_id}/action/{action}/'


def _log_profile_activity(student, event_type, action=''):
    ProfileActivity.objects.create(student=student, event_type=event_type, action=action)


def _calculate_profile_completion(student):
    checks = [
        bool(student.name),
        bool(student.username),
        bool(student.email),
        bool(student.phone),
        bool(student.role),
        bool(student.bio),
        bool(student.address),
        bool(student.profile_photo),
        bool(student.website),
        bool(student.social_stack),
    ]
    completed = sum(1 for item in checks if item)
    return int((completed / len(checks)) * 100)


def profile(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    if student.user_type == 'general':
        messages.error(request, "Portfolio access is restricted to VIP and Premium users.")
        return redirect('student_profile_choice', student_id=student.id)
    hero_section = getattr(student, 'hero_section', None)
    # Split tags for each project for template use
    projects = student.projects.all()
    for proj in projects:
        proj.tag_list = [tag.strip() for tag in proj.tags.split(',')] if proj.tags else []
    # Select up to 4 featured projects (customize as needed)
    featured_projects = projects[:4]
    # Split coursework for first education for template use
    educations = student.educations.all()
    coursework_list = []
    if educations and getattr(educations[0], 'coursework', None):
        coursework_list = [c.strip() for c in educations[0].coursework.split(',')]
    # Calculate years for education stats
    education_years = "-"
    if educations and educations[0].start_year and educations[0].end_year:
        try:
            education_years = int(educations[0].end_year) - int(educations[0].start_year) + 1
        except Exception:
            education_years = "-"
    context = {
        'student': student,
        'capabilities': student.capabilities.all(),
        'tools': student.tools.all(),
        'stats': student.stats.all(),
        'educations': educations,
        'achievements': student.achievements.all(),
        'projects': projects,
        'blog_posts': student.blog_posts.all(),
        'journeys': student.journeys.order_by('-year', 'order'),
        'certifications': student.certifications.all(),
        'languages': student.languages.all(),
        'interests': student.interests.all(),
        'experiences': student.experiences.all(),
        'coursework_list': coursework_list,
        'education_years': education_years,
        'featured_projects': featured_projects,
        'hero_section': hero_section,
    }
    return render(request, 'portfolio/profile1.html', context)


def admin_dashboard(request):
    colleges = College.objects.prefetch_related('students').all()
    users = StudentProfile.objects.select_related('college').all().order_by('name')
    skills = Skill.objects.all().order_by('name')
    recent_activities = ProfileActivity.objects.select_related('student')[:8]
    top_profiles = StudentProfile.objects.order_by('-views', '-downloads', '-contact_clicks')[:5]
    search_query = request.GET.get('q', '').strip()
    category_filter = request.GET.get('category', '').strip()
    template_filter = request.GET.get('template_access', '').strip()

    if search_query:
        users = users.filter(
            Q(name__icontains=search_query) |
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(role__icontains=search_query) |
            Q(organization_name__icontains=search_query) |
            Q(college__name__icontains=search_query)
        )

    if category_filter in {'school', 'professional'}:
        users = users.filter(profile_category=category_filter)

    if template_filter == 'portfolio':
        users = users.exclude(user_type='general')
    elif template_filter == 'contact-only':
        users = users.filter(user_type='general')

    school_users = users.filter(profile_category='school')
    professionals = users.filter(profile_category='professional')

    return render(request, 'dashboard.html', {
        'colleges': colleges,
        'users': users,
        'school_users': school_users,
        'professionals': professionals,
        'search_query': search_query,
        'category_filter': category_filter,
        'template_filter': template_filter,
        'total_users': users.count(),
        'total_schools': colleges.count(),
        'total_professionals': professionals.count(),
        'total_school_users': school_users.count(),
        'skills': skills,
        'recent_activities': recent_activities,
        'top_profiles': top_profiles,
    })


def add_user(request):
    if request.method == 'POST':
        profile_category = request.POST.get('profile_category', 'school')
        college = None
        college_id = request.POST.get('college')
        if profile_category == 'school':
            if not college_id:
                messages.error(request, 'Please choose a school or college for school-linked profiles.')
                return redirect('add_user')
            college = get_object_or_404(College, id=college_id)

        student = StudentProfile(
            name=request.POST['name'],
            phone=request.POST['phone'],
            email=request.POST['email'],
            username=request.POST['username'],
            college=college,
            profile_category=profile_category,
            organization_name=request.POST.get('organization_name'),
            bio=request.POST.get('bio'),
            role=request.POST.get('role'),
            address=request.POST.get('address'),
            about_intro=request.POST.get('about_me'),
            user_type=request.POST.get('user_type', 'general'),
            password=make_password(request.POST['password']),
            # Handle CV upload:
            cv=request.FILES.get('cv', request.FILES.get('resume')),
        )

        if request.FILES.get('profile_photo') or request.FILES.get('photo'):
            student.profile_photo = request.FILES.get('profile_photo', request.FILES.get('photo'))
        if request.FILES.get('cover_photo'):
            student.cover_photo = request.FILES['cover_photo']

        student.save()

        skill_ids = request.POST.getlist('skills')
        student.skills.set(skill_ids)

        # Social media fields
        for field in ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website']:
            setattr(student, field, request.POST.get(field))

        student.save()
        messages.success(
            request,
            'Professional profile created successfully!' if profile_category == 'professional' else 'School-linked profile created successfully!'
        )
        return redirect('admin_dashboard')
    return redirect(f"{reverse('admin_dashboard')}#create-profile")


def edit_student_auth(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    if _is_student_edit_authorized(request, student.id):
        return redirect('student_owner_dashboard', student_id=student.id)
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        if username == student.username and check_password(password, student.password):
            request.session[_student_edit_session_key(student.id)] = True
            messages.success(request, 'Login successful. You can now manage this profile.')
            return redirect('student_owner_dashboard', student_id=student.id)
        messages.error(request, 'Invalid username or password.')
    return render(request, 'edit_student_auth.html', {'student': student})


def logout_student_edit(request, student_id):
    request.session.pop(_student_edit_session_key(student_id), None)
    messages.success(request, 'You have been logged out from profile management.')
    return redirect('contact_card', student_id=student_id)


def edit_student(request, student_id):
    return redirect('edit_student_auth', student_id=student_id)


def student_owner_dashboard(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)
    if not _is_student_edit_authorized(request, student.id):
        messages.error(request, 'Please log in with your profile username and password to manage this profile.')
        return redirect('edit_student_auth', student_id=student.id)

    if request.method == 'POST':
        action = request.POST.get('dashboard_action')
        if action == 'toggle_contact_card':
            student.show_contact_card = not student.show_contact_card
            student.save(update_fields=['show_contact_card'])
            messages.success(request, f"Contact card visibility {'enabled' if student.show_contact_card else 'disabled'}.")
            return redirect('student_owner_dashboard', student_id=student.id)
        if action == 'toggle_portfolio':
            if student.user_type == 'general':
                messages.error(request, 'Portfolio is available only for VIP and Premium profiles.')
            else:
                student.show_portfolio = not student.show_portfolio
                student.save(update_fields=['show_portfolio'])
                messages.success(request, f"Portfolio visibility {'enabled' if student.show_portfolio else 'disabled'}.")
            return redirect('student_owner_dashboard', student_id=student.id)
        if action == 'change_password':
            current_password = request.POST.get('current_password', '')
            new_password = request.POST.get('new_password', '')
            confirm_password = request.POST.get('confirm_password', '')

            if not check_password(current_password, student.password):
                messages.error(request, 'Current password is incorrect.')
            elif len(new_password) < 6:
                messages.error(request, 'New password must be at least 6 characters long.')
            elif new_password != confirm_password:
                messages.error(request, 'New password and confirm password do not match.')
            else:
                student.password = new_password
                student.save(update_fields=['password'])
                messages.success(request, 'Password updated successfully.')
            return redirect('student_owner_dashboard', student_id=student.id)

    display_organization = student.organization_name or (student.college.name if student.college else 'Personal Brand')
    total_engagement = student.views + student.downloads + student.contact_clicks
    profile_completion = _calculate_profile_completion(student)
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

    daily_analytics = []
    for offset in range(6, -1, -1):
        day = (timezone.now() - timedelta(days=offset)).date()
        counts = activity_map.get(day, {'view': 0, 'download': 0, 'contact': 0})
        daily_analytics.append({
            'day': day,
            'views': counts['view'],
            'downloads': counts['download'],
            'contacts': counts['contact'],
        })

    recent_activities = student.activities.all()[:8]
    nfc_qr_status = 'Live' if student.show_contact_card else 'Hidden'
    public_card_url = f"/student/{student.id}/"

    context = {
        'student': student,
        'display_organization': display_organization,
        'total_engagement': total_engagement,
        'profile_completion': profile_completion,
        'daily_analytics': daily_analytics,
        'recent_activities': recent_activities,
        'nfc_qr_status': nfc_qr_status,
        'public_card_url': public_card_url,
    }
    return render(request, 'student_owner_dashboard.html', context)


def bulk_upload(request):
    if request.method == 'POST' and request.FILES.get('file'):
        try:
            import pandas as pd
        except ImportError:
            messages.error(
                request,
                'Bulk upload requires pandas, which is not installed in the current environment.',
            )
            return redirect('bulk_upload')

        excel_file = request.FILES['file']
        df = pd.read_excel(excel_file)

        required_columns = ['name', 'phone', 'email', 'college']
        for col in required_columns:
            if col not in df.columns:
                messages.error(request, f'Missing column: {col}')
                return redirect('bulk_upload')

        for _, row in df.iterrows():
            if pd.isnull(row['name']) or pd.isnull(row['phone']) or pd.isnull(row['college']):
                continue

            college_name = row['college']
            college, _ = College.objects.get_or_create(name=college_name)

            student, created = StudentProfile.objects.get_or_create(
                name=row['name'],
                phone=row['phone'],
                email=row.get('email', ''),
                college=college
            )
            student.save()

        messages.success(request, 'Bulk upload successful.')
        return redirect('admin_dashboard')
    return redirect(f"{reverse('admin_dashboard')}#bulk-upload")


def college_details(request, college_id):
    college = get_object_or_404(College, id=college_id)
    students = college.students.filter(profile_category='school')
    return render(request, 'college_details.html', {'college': college, 'students': students})


def add_college(request):
    if request.method == 'POST':
        college = College(
            name=request.POST.get('name'),
            slogan=request.POST.get('slogan'),
            address=request.POST.get('address'),
            logo=request.FILES.get('logo'),
            website=request.POST.get('website'),
            email=request.POST.get('email'),
            phone=request.POST.get('phone'),
            description=request.POST.get('description')
        )
        college.save()
        messages.success(request, "College added successfully!")
        return redirect('admin_dashboard')
    return redirect(f"{reverse('admin_dashboard')}#create-college")


def edit_college(request, college_id):
    college = get_object_or_404(College, id=college_id)
    if request.method == 'POST':
        college.name = request.POST.get('name')
        college.slogan = request.POST.get('slogan')
        college.address = request.POST.get('address')
        if request.FILES.get('logo'):
            college.logo = request.FILES['logo']
        college.website = request.POST.get('website')
        college.email = request.POST.get('email')
        college.phone = request.POST.get('phone')
        college.description = request.POST.get('description')
        college.save()
        messages.success(request, "College updated successfully!")
        return redirect('college_details', college_id=college.id)
    return render(request, 'edit_college.html', {'college': college})


def delete_college(request, college_id):
    college = get_object_or_404(College, id=college_id)
    if request.method == 'POST':
        college.delete()
        messages.success(request, "College deleted successfully!")
        return redirect('admin_dashboard')
    return render(request, 'confirm_delete_college.html', {'college': college})


def add_student_to_college(request, college_id):
    college = get_object_or_404(College, id=college_id)
    skills = Skill.objects.all()
    if request.method == 'POST':
        student = StudentProfile(
            name=request.POST['name'],
            phone=request.POST['phone'],
            email=request.POST['email'],
            username=request.POST['username'],
            college=college,
            profile_category='school',
            bio=request.POST.get('bio'),
            role=request.POST.get('role'),
            address=request.POST.get('address'),
            organization_name=request.POST.get('organization_name') or college.name,
            password=make_password(request.POST['password']),
            cv=request.FILES.get('cv', None),  # CV upload here
        )
        if request.FILES.get('profile_photo'):
            student.profile_photo = request.FILES['profile_photo']
        if request.FILES.get('cover_photo'):
            student.cover_photo = request.FILES['cover_photo']
        student.save()
        skill_ids = request.POST.getlist('skills')
        student.skills.set(skill_ids)
        # Social media fields
        for field in ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website']:
            setattr(student, field, request.POST.get(field))
        student.save()
        messages.success(request, 'Student added to college successfully!')
        return redirect('college_details', college_id=college.id)
    return render(request, 'add_student_to_college.html', {
        'college': college,
        'skills': skills,
    })
def send_message(request, id):
    student = get_object_or_404(StudentProfile, id=id)
    if request.method == 'POST':
        message = request.POST.get('message')
        send_mail(
            subject='New message via student card',
            message=message,
            from_email=request.user.email,  # or use settings.DEFAULT_FROM_EMAIL
            recipient_list=[student.email],
        )
    return redirect('profile', student_id=id)

def contact_card(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)
    student.views += 1
    student.save(update_fields=['views'])
    _log_profile_activity(student, 'view', 'contact-card')
    social_stack = [item.strip() for item in student.social_stack.split(',') if item.strip()] if student.social_stack else []
    requested_template = student.contact_template or 'contact2.html'
    template_name = f'contact/{requested_template}'
    website_url = student.website or ''

    if website_url and not website_url.startswith(('http://', 'https://')):
        website_url = f'https://{website_url}'

    social_links = []
    social_config = {
        'linkedin': {'url': student.linkedin, 'label': 'LinkedIn', 'icon': 'linkedin', 'fa_class': 'fa-brands fa-linkedin-in'},
        'twitter': {'url': student.twitter, 'label': 'Twitter', 'icon': 'twitter', 'fa_class': 'fa-brands fa-x-twitter'},
        'instagram': {'url': student.instagram, 'label': 'Instagram', 'icon': 'instagram', 'fa_class': 'fa-brands fa-instagram'},
        'facebook': {'url': student.facebook, 'label': 'Facebook', 'icon': 'users', 'fa_class': 'fa-brands fa-facebook-f'},
        'messenger': {'url': student.messenger, 'label': 'Messenger', 'icon': 'message-circle', 'fa_class': 'fa-brands fa-facebook-messenger'},
        'youtube': {'url': student.youtube, 'label': 'YouTube', 'icon': 'youtube', 'fa_class': 'fa-brands fa-youtube'},
        'tiktok': {'url': student.tiktok, 'label': 'TikTok', 'icon': 'music', 'fa_class': 'fa-brands fa-tiktok'},
        'github': {'url': student.github, 'label': 'GitHub', 'icon': 'github', 'fa_class': 'fa-brands fa-github'},
        'figma': {'url': student.figma, 'label': 'Figma', 'icon': 'pen-tool', 'fa_class': 'fa-brands fa-figma'},
        'upwork': {'url': student.upwork, 'label': 'Upwork', 'icon': 'briefcase', 'fa_class': 'fa-solid fa-briefcase'},
    }
    for key in social_stack:
        if key == 'whatsapp':
            if student.whatsapp:
                social_links.append({
                    'key': 'whatsapp',
                    'url': f'https://wa.me/{student.whatsapp}',
                    'tracked_url': _build_tracked_action_url(student.id, 'whatsapp'),
                    'label': 'WhatsApp',
                    'icon': 'message-circle',
                    'fa_class': 'fa-brands fa-whatsapp',
                })
            continue

        config = social_config.get(key)
        if config and config['url']:
            social_links.append({
                'key': key,
                'url': config['url'],
                'tracked_url': _build_tracked_action_url(student.id, f'social-{key}'),
                'label': config['label'],
                'icon': config['icon'],
                'fa_class': config['fa_class'],
            })

    context = {
        'student': student,
        'social_stack': social_stack,
        'social_links': social_links,
        'display_organization': student.organization_name or (student.college.name if student.college else ''),
        'website_url': website_url,
        'phone_action_url': _build_tracked_action_url(student.id, 'phone'),
        'email_action_url': _build_tracked_action_url(student.id, 'email'),
        'website_action_url': _build_tracked_action_url(student.id, 'website'),
        'whatsapp_action_url': _build_tracked_action_url(student.id, 'whatsapp'),
        'portfolio_action_url': _build_tracked_action_url(student.id, 'portfolio'),
    }
    try:
        return render(request, template_name, context)
    except TemplateDoesNotExist:
        return render(request, 'contact/contact2.html', context)


def download_vcard(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)

    # Increment downloads counter
    student.downloads += 1
    student.save(update_fields=['downloads'])
    _log_profile_activity(student, 'download', 'vcard')

    college_name = student.college.name if student.college else ''
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{student.name}
ORG:{college_name}
TEL;TYPE=CELL:{student.phone}
EMAIL;TYPE=INTERNET:{student.email}
URL:{student.website or ''}
END:VCARD
"""
    response = HttpResponse(vcard, content_type='text/vcard')
    response['Content-Disposition'] = f'attachment; filename=contact_{student.name.replace(" ", "_")}.vcf'
    return response


def track_contact_action(request, student_id, action):
    student = get_object_or_404(StudentProfile, pk=student_id)
    website_url = student.website or ''
    if website_url and not website_url.startswith(('http://', 'https://')):
        website_url = f'https://{website_url}'

    action_targets = {
        'phone': f'tel:{student.phone}' if student.phone else '',
        'email': f'mailto:{student.email}' if student.email else '',
        'website': website_url,
        'whatsapp': f'https://wa.me/{student.whatsapp}' if student.whatsapp else '',
        'portfolio': request.build_absolute_uri(reverse('profile', args=[student.id])) if student.user_type != 'general' else '',
        'social-linkedin': student.linkedin or '',
        'social-instagram': student.instagram or '',
        'social-facebook': student.facebook or '',
        'social-messenger': student.messenger or '',
        'social-twitter': student.twitter or '',
        'social-youtube': student.youtube or '',
        'social-tiktok': student.tiktok or '',
        'social-github': student.github or '',
        'social-figma': student.figma or '',
        'social-upwork': student.upwork or '',
    }

    target = action_targets.get(action, '')
    if not target:
        messages.error(request, 'This contact action is not available for this profile.')
        return redirect('contact_card', student_id=student.id)

    student.contact_clicks += 1
    student.save(update_fields=['contact_clicks'])
    _log_profile_activity(student, 'contact', action)
    return redirect(target)


def student_profile_choice(request, student_id):
    return redirect('contact_card', student_id=student_id)


def send_message(request):
    if request.method == 'POST':
        contact_type = request.POST.get('contactType')
        full_name = request.POST.get('fullName')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        organization = request.POST.get('organization')
        hear_about = request.POST.get('hearAbout')
        message = request.POST.get('message')
        priority = 'Yes' if request.POST.get('priority') else 'No'

        subject = f"SkillConnect Contact: {contact_type} - {full_name}"
        body = f"""
Contact Form Submission - SkillConnect

Contact Type: {contact_type}
Name: {full_name}
Email: {email}
Phone: {phone}
Organization: {organization}
How they heard about us: {hear_about}
Priority Response: {priority}

Message:
{message}

---
This message was sent from the SkillConnect website contact form.
        """.strip()

        send_mail(
            subject,
            body,
            email,  # from user's email
            [settings.DEFAULT_FROM_EMAIL],  # your Gmail address
        )
        return redirect('home')  # or show a success message

    return redirect('home')


def edit_student_full(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    contact_templates = CONTACT_TEMPLATES.get(student.user_type, ['contact.html'])
    portfolio_templates = PORTFOLIO_TEMPLATES.get(student.user_type, [])
    social_choices = SOCIAL_CHOICES

    if request.method == 'POST':
        form = StudentProfileForm(request.POST, request.FILES, instance=student)
        education_fs = EducationFormSet(request.POST, request.FILES, instance=student)
        achievement_fs = AchievementFormSet(request.POST, request.FILES, instance=student)
        project_fs = ProjectFormSet(request.POST, request.FILES, instance=student)
        blog_fs = BlogPostFormSet(request.POST, request.FILES, instance=student)
        cert_fs = CertificationFormSet(request.POST, request.FILES, instance=student)
        lang_fs = LanguageFormSet(request.POST, request.FILES, instance=student)
        interest_fs = InterestFormSet(request.POST, request.FILES, instance=student)
        exp_fs = ExperienceFormSet(request.POST, request.FILES, instance=student)

        if (form.is_valid() and education_fs.is_valid() and achievement_fs.is_valid() and
            project_fs.is_valid() and blog_fs.is_valid() and cert_fs.is_valid() and
            lang_fs.is_valid() and interest_fs.is_valid() and exp_fs.is_valid()):
            # Save social_stack as comma-separated string
            social_stack = request.POST.getlist('social_stack')
            student.social_stack = ",".join(social_stack)
            student.contact_template = request.POST.get('contact_template', student.contact_template)
            student.portfolio_template = request.POST.get('portfolio_template', student.portfolio_template)
            form.save()
            education_fs.save()
            achievement_fs.save()
            project_fs.save()
            blog_fs.save()
            cert_fs.save()
            lang_fs.save()
            interest_fs.save()
            exp_fs.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('profile', student_id=student.id)
    else:
        form = StudentProfileForm(instance=student)
        education_fs = EducationFormSet(instance=student)
        achievement_fs = AchievementFormSet(instance=student)
        project_fs = ProjectFormSet(instance=student)
        blog_fs = BlogPostFormSet(instance=student)
        cert_fs = CertificationFormSet(instance=student)
        lang_fs = LanguageFormSet(instance=student)
        interest_fs = InterestFormSet(instance=student)
        exp_fs = ExperienceFormSet(instance=student)

    return render(request, 'edit_student_full.html', {
        'form': form,
        'education_fs': education_fs,
        'achievement_fs': achievement_fs,
        'project_fs': project_fs,
        'blog_fs': blog_fs,
        'cert_fs': cert_fs,
        'lang_fs': lang_fs,
        'interest_fs': interest_fs,
        'exp_fs': exp_fs,
        'student': student,
        'contact_templates': contact_templates,
        'portfolio_templates': portfolio_templates,
        'social_choices': social_choices,
    })


def edit_student_manual(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)
    if not _is_student_edit_authorized(request, student.id):
        messages.error(request, 'Please log in with your profile username and password to edit this card.')
        return redirect('edit_student_auth', student_id=student.id)

    contact_templates = CONTACT_TEMPLATES.get(student.user_type, ['contact.html'])
    portfolio_templates = PORTFOLIO_TEMPLATES.get(student.user_type, [])

    if request.method == 'POST':
        student.name = request.POST.get('name', student.name)
        student.username = request.POST.get('username', student.username)
        student.email = request.POST.get('email', student.email)
        student.phone = request.POST.get('phone', student.phone)
        student.profile_category = request.POST.get('profile_category', student.profile_category)
        student.organization_name = request.POST.get('organization_name', student.organization_name)
        student.bio = request.POST.get('bio', student.bio)
        student.role = request.POST.get('role', student.role)
        student.address = request.POST.get('address', student.address)
        student.about_intro = request.POST.get('about_intro', student.about_intro)
        student.about_featured = request.POST.get('about_featured', student.about_featured)
        student.about_current = request.POST.get('about_current', student.about_current)
        student.user_type = request.POST.get('user_type', student.user_type)
        student.show_contact_card = request.POST.get('show_contact_card') == 'on'
        student.show_portfolio = request.POST.get('show_portfolio') == 'on'
        student.social_stack = ",".join(request.POST.getlist('social_stack'))
        if student.profile_category == 'school':
            college_id = request.POST.get('college')
            if not college_id:
                messages.error(request, 'School / College profiles must use a registered school.')
                return redirect('edit_student_manual', student_id=student.id)
            student.college = get_object_or_404(College, id=college_id)
        else:
            student.college = None

        if request.FILES.get('profile_photo'):
            student.profile_photo = request.FILES['profile_photo']
        if request.FILES.get('cover_photo'):
            student.cover_photo = request.FILES['cover_photo']
        if request.FILES.get('cv'):
            student.cv = request.FILES['cv']

        student.contact_template = request.POST.get('contact_template', student.contact_template)
        student.portfolio_template = request.POST.get('portfolio_template', student.portfolio_template)

        for field in ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website', 'messenger', 'whatsapp']:
            setattr(student, field, request.POST.get(field))

        student.save()
        student.skills.set(request.POST.getlist('skills'))
        messages.success(request, 'Profile settings updated successfully.')
        return redirect('student_profile_choice', student_id=student.id)

    return render(request, 'edit_student_manual.html', {
        'student': student,
        'contact_templates': contact_templates,
        'portfolio_templates': portfolio_templates,
        'colleges': College.objects.all(),
        'skills': Skill.objects.all(),
        'selected_socials': [item.strip() for item in student.social_stack.split(',') if item.strip()],
        'social_choices': SOCIAL_CHOICES,  # <-- add this
    })

def blog_post_create(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    if request.method == 'POST':
        if student.user_type == 'vip' and student.blog_posts.count() >= 2:
            messages.error(request, "VIP users can only post 2 blogs.")
            return redirect('profile', student_id=student.id)

        # Handle blog post creation
        # ... (existing code for creating a blog post)

        messages.success(request, "Blog post created successfully.")
        return redirect('profile', student_id=student.id)

    return render(request, 'create_blog_post.html', {'student': student})
