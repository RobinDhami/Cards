from django import forms

from .models import LibraryBook, StudentCard, StudentProfile


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
            'birth_certificate',
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


class StudentCardForm(forms.ModelForm):
    class Meta:
        model = StudentCard
        fields = ['student', 'card_uid', 'card_number', 'is_active', 'lost_or_blocked']


class LibraryBookForm(forms.ModelForm):
    class Meta:
        model = LibraryBook
        fields = ['title', 'author', 'isbn', 'category', 'book_code', 'total_copies', 'available_copies', 'is_active']
