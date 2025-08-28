from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password
import pandas as pd
from django.conf import settings

from .models import StudentProfile, ClientProfile, College, Skill
from .forms import (
    StudentProfileForm, EducationFormSet, AchievementFormSet, ProjectFormSet,
    BlogPostFormSet, CertificationFormSet, LanguageFormSet, InterestFormSet, ExperienceFormSet
)


def home(request):
    return render(request, 'home.html')


def profile(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    context = {
        'student': student,
        'capabilities': student.capabilities.all(),
        'tools': student.tools.all(),
        'stats': student.stats.all(),
        # ...other context as before...
    }
    return render(request, 'portfolio/profile1.html', context)


def admin_dashboard(request):
    colleges = College.objects.prefetch_related('students').all()
    clients = ClientProfile.objects.all()
    return render(request, 'dashboard.html', {
        'colleges': colleges,
        'clients': clients,
    })


def add_user(request):
    if request.method == 'POST':
        college_id = request.POST.get('college')
        college = get_object_or_404(College, id=college_id)

        student = StudentProfile(
            name=request.POST['name'],
            phone=request.POST['phone'],
            email=request.POST['email'],
            username=request.POST['username'],
            college=college,
            bio=request.POST.get('bio'),
            password=make_password(request.POST['password']),
            # Handle CV upload:
            cv=request.FILES.get('cv', None),
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
        messages.success(request, 'Student created successfully!')
        return redirect('admin_dashboard')

    skills = Skill.objects.all()
    colleges = College.objects.all()
    return render(request, 'add_user.html', {'skills': skills, 'colleges': colleges})


# def edit_student_auth(request, student_id):
#     student = get_object_or_404(StudentProfile, id=student_id)
#     if request.method == 'POST':
#         if student.username == request.POST['username'] and student.check_password(request.POST['password']):
#             return redirect('edit_student', student_id=student_id)
#         messages.error(request, 'Invalid credentials.')
#         return redirect('edit_student_auth', student_id=student_id)
#     return render(request, 'edit_student_auth.html', {'student_id': student_id})


def edit_student(request, student_id):
    student = get_object_or_404(StudentProfile, id=student_id)
    if request.method == 'POST':
        student.name = request.POST['name']
        student.phone = request.POST['phone']
        student.email = request.POST['email']
        student.bio = request.POST.get('bio')

        # Update CV if uploaded:
        if request.FILES.get('cv'):
            student.cv = request.FILES['cv']

        student.skills.set(request.POST.getlist('skills'))

        for field in ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website']:
            setattr(student, field, request.POST.get(field))

        student.save()
        messages.success(request, 'Profile updated successfully.')
        return redirect('admin_dashboard')

    skills = Skill.objects.all()
    return render(request, 'edit_student.html', {'student': student, 'skills': skills})


def bulk_upload(request):
    if request.method == 'POST' and request.FILES.get('file'):
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

    return render(request, 'bulk_upload.html')


def college_details(request, college_id):
    college = get_object_or_404(College, id=college_id)
    students = college.students.all()
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

    return render(request, 'add_college.html')


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
            bio=request.POST.get('bio'),
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


def contact_card(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)
    # Increment views count
    student.views += 1
    student.save(update_fields=['views'])

    context = {
        'student': student,
    }
    return render(request, 'contact/contact.html', context)


def download_vcard(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)

    # Increment downloads counter
    student.downloads += 1
    student.save(update_fields=['downloads'])

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


def student_profile_choice(request, student_id):
    student = get_object_or_404(StudentProfile, pk=student_id)

    if request.method == 'POST':
        choice = request.POST.get('choice')
        if choice == 'contact_card':
            return redirect('contact_card', student_id=student.id)
        elif choice == 'portfolio':
            return redirect('profile', student_id=student.id)

    return render(request, 'student_profile_choice.html', {'student': student})


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
    })