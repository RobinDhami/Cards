from django import forms

from .models import StudentProfile


class StudentProfileForm(forms.ModelForm):
    class Meta:
        model = StudentProfile
        fields = [
            'name',
            'phone',
            'email',
            'bio',
            'username',
            'role',
            'address',
            'profile_photo',
            'cover_photo',
            'cv',
            'facebook',
            'instagram',
            'twitter',
            'linkedin',
            'youtube',
            'tiktok',
            'github',
            'figma',
            'upwork',
            'website',
            'contact_template',
            'social_stack',
        ]
