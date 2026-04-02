from django import forms
from .models import (
    StudentProfile, Skill, Education, Achievement, Project, BlogPost,
    Certification, Language, Interest, Experience
)
from django.forms import inlineformset_factory

class StudentProfileForm(forms.ModelForm):
    class Meta:
        model = StudentProfile
        fields = [
            'name', 'phone', 'email', 'bio', 'username',
            'role', 'address', 'profile_photo', 'cover_photo', 'cv',
            'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'figma', 'upwork', 'website',
            'contact_template', 'portfolio_template', 'social_stack'
        ]
        widgets = {
            'bio': forms.Textarea(attrs={'rows': 3}),
            'role': forms.TextInput(attrs={'placeholder': 'Teacher, Consultant, Designer, etc.'}),
            'address': forms.TextInput(attrs={'placeholder': 'Office or campus address'}),
        }

class EducationForm(forms.ModelForm):
    class Meta:
        model = Education
        exclude = ['student']

class AchievementForm(forms.ModelForm):
    class Meta:
        model = Achievement
        exclude = ['student']

class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        exclude = ['student']

class BlogPostForm(forms.ModelForm):
    class Meta:
        model = BlogPost
        exclude = ['student']

class CertificationForm(forms.ModelForm):
    class Meta:
        model = Certification
        exclude = ['student']

class LanguageForm(forms.ModelForm):
    class Meta:
        model = Language
        exclude = ['student']

class InterestForm(forms.ModelForm):
    class Meta:
        model = Interest
        exclude = ['student']

class ExperienceForm(forms.ModelForm):
    class Meta:
        model = Experience
        exclude = ['student']

# Inline formsets for related models
EducationFormSet = inlineformset_factory(StudentProfile, Education, form=EducationForm, extra=1, can_delete=True)
AchievementFormSet = inlineformset_factory(StudentProfile, Achievement, form=AchievementForm, extra=1, can_delete=True)
ProjectFormSet = inlineformset_factory(StudentProfile, Project, form=ProjectForm, extra=1, can_delete=True)
BlogPostFormSet = inlineformset_factory(StudentProfile, BlogPost, form=BlogPostForm, extra=1, can_delete=True)
CertificationFormSet = inlineformset_factory(StudentProfile, Certification, form=CertificationForm, extra=1, can_delete=True)
LanguageFormSet = inlineformset_factory(StudentProfile, Language, form=LanguageForm, extra=1, can_delete=True)
InterestFormSet = inlineformset_factory(StudentProfile, Interest, form=InterestForm, extra=1, can_delete=True)
ExperienceFormSet = inlineformset_factory(StudentProfile, Experience, form=ExperienceForm, extra=1, can_delete=True)
