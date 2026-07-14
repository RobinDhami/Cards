from django import forms
from django.contrib.auth.models import User
from django.forms import BaseInlineFormSet, inlineformset_factory

from .models import (
    ProfessionalDocument,
    ProfessionalPortfolioItem,
    ProfessionalProfile,
    ProfessionalService,
    ProfessionalTestimonial,
)


CONTROL_CLASS = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600'

SERVICE_ICON_CHOICES = [
    ('briefcase', 'Briefcase / Business'),
    ('code', 'Code / Development'),
    ('palette', 'Design / Creative'),
    ('bar-chart-2', 'Analytics / Growth'),
    ('megaphone', 'Marketing / Promotion'),
    ('users', 'Team / Community'),
    ('graduation-cap', 'Education / Student'),
    ('book-open', 'Learning / Training'),
    ('camera', 'Photography / Media'),
    ('pen-tool', 'Writing / Content'),
    ('globe', 'Web / Global'),
    ('smartphone', 'Mobile / Apps'),
    ('monitor', 'IT / Computer'),
    ('database', 'Data / Database'),
    ('shield-check', 'Security / Trust'),
    ('heart-handshake', 'Support / Care'),
    ('building-2', 'Organization / Institution'),
    ('landmark', 'Finance / Banking'),
    ('home', 'Real Estate / Property'),
    ('calendar-check', 'Booking / Scheduling'),
]

LOOKING_FOR_CHOICES = [
    ('full_time', 'Full-time job'),
    ('part_time', 'Part-time job'),
    ('internship', 'Internship'),
    ('freelance', 'Freelance work'),
    ('collaboration', 'Collaboration'),
    ('mentorship', 'Mentorship'),
    ('connections', 'Professional connections'),
]


class ProfessionalProfileForm(forms.ModelForm):
    looking_for = forms.MultipleChoiceField(
        choices=LOOKING_FOR_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )
    login_username = forms.CharField(
        label='Login Username',
        max_length=150,
        required=False,
        help_text='This username lets the profile owner log in and edit their own card.',
    )
    login_password = forms.CharField(
        label='Login Password',
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text='Required for new owner accounts. Leave blank while editing to keep the current password.',
    )

    class Meta:
        model = ProfessionalProfile
        fields = [
            'profile_type',
            'full_name',
            'slug',
            'profile_photo',
            'cover_photo',
            'profession',
            'designation',
            'company_name',
            'header_identity',
            'organization_logo',
            'organization_tagline',
            'personal_logo',
            'brand_name',
            'brand_tagline',
            'industry',
            'academic_section',
            'academic_title',
            'academic_institution',
            'academic_level',
            'academic_year',
            'academic_specialization',
            'academic_certification',
            'short_tagline',
            'about',
            'current_focus',
            'featured_interest',
            'current_status',
            'looking_for',
            'preferred_work_mode',
            'networking_statement',
            'phone',
            'whatsapp_number',
            'email',
            'website',
            'linkedin_url',
            'facebook_url',
            'instagram_url',
            'youtube_url',
            'github_url',
            'booking_url',
            'office_address',
            'google_maps_url',
            'show_map_on_profile',
            'business_hours',
            'years_of_experience',
            'location',
            'is_verified',
            'is_active',
            'template_name',
            'accent_color',
        ]
        widgets = {
            'about': forms.Textarea(attrs={'rows': 5}),
            'current_focus': forms.Textarea(attrs={'rows': 3}),
            'featured_interest': forms.Textarea(attrs={'rows': 3}),
            'office_address': forms.Textarea(attrs={'rows': 3}),
            'accent_color': forms.TextInput(attrs={'type': 'color'}),
            'profession': forms.TextInput(attrs={'list': 'profession-options'}),
        }
        labels = {
            'profile_type': 'Profile Type',
            'profession': 'Professional headline',
            'designation': 'Current role',
            'company_name': 'Current organization or institution',
            'header_identity': 'Header identity',
            'organization_tagline': 'Organization Tagline',
            'personal_logo': 'Personal Logo',
            'brand_name': 'Brand or Business Name',
            'brand_tagline': 'Brand Tagline',
            'industry': 'Industry / Field / Course',
            'academic_section': 'Class / Batch / Section',
            'academic_title': 'Degree / Academic Title',
            'academic_institution': 'Academic Institution',
            'academic_level': 'Academic Level',
            'academic_year': 'Graduated / Study Year',
            'academic_specialization': 'Specialization',
            'academic_certification': 'Certification / Achievement',
            'short_tagline': 'Profile tagline',
            'current_focus': "What I'm working on",
            'featured_interest': 'Featured interest',
            'current_status': 'Current status',
            'looking_for': 'Looking for',
            'preferred_work_mode': 'Preferred work mode',
            'networking_statement': 'Short networking statement',
            'office_address': 'Office / Campus Address',
            'google_maps_url': 'Google Maps Link',
            'show_map_on_profile': 'Show map on public profile',
            'business_hours': 'Availability / Business Hours',
            'years_of_experience': 'Experience / Study Year',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.looking_for:
            self.fields['looking_for'].initial = [
                value.strip()
                for value in self.instance.looking_for.split(',')
                if value.strip()
            ]
        self.fields['profession'].widget.attrs.update({
            'placeholder': 'Junior Python Developer | Open to Internships',
            'maxlength': '160',
        })
        self.fields['short_tagline'].widget.attrs.update({
            'placeholder': 'Learn. Build. Connect.',
            'maxlength': '60',
            'data-counter': '60',
        })
        self.fields['about'].widget.attrs.update({
            'placeholder': 'Write a short introduction visitors can quickly understand.',
            'maxlength': '500',
            'data-counter': '500',
        })
        self.fields['networking_statement'].widget.attrs.update({
            'placeholder': 'Interested in connecting with educators, developers, and technology teams.',
        })
        owner = self.instance.owner if self.instance and self.instance.owner_id else None
        owner_is_profile_user = bool(owner and not owner.is_staff and not owner.is_superuser)
        if owner_is_profile_user:
            self.fields['login_username'].initial = owner.username
        if not owner_is_profile_user:
            self.fields['login_username'].required = True
            self.fields['login_password'].required = True
        for field_name, field in self.fields.items():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.update({'class': 'h-4 w-4 rounded border-slate-300 text-teal-700'})
            elif isinstance(field.widget, forms.FileInput):
                field.widget.attrs.update({'class': 'w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm'})
            elif isinstance(field.widget, forms.CheckboxSelectMultiple):
                field.widget.attrs.update({'class': 'space-y-2'})
            else:
                field.widget.attrs.update({'class': CONTROL_CLASS})

    def clean_looking_for(self):
        values = self.cleaned_data.get('looking_for') or []
        return ','.join(values)

    def clean_login_username(self):
        username = (self.cleaned_data.get('login_username') or '').strip()
        if not username:
            return username
        owner = self.instance.owner if self.instance and self.instance.owner_id else None
        excluded_owner_id = owner.id if owner and not owner.is_staff and not owner.is_superuser else None
        matches = User.objects.filter(username=username)
        if excluded_owner_id:
            matches = matches.exclude(id=excluded_owner_id)
        if matches.exists():
            raise forms.ValidationError('This username is already in use.')
        return username

    def clean(self):
        cleaned_data = super().clean()
        username = (cleaned_data.get('login_username') or '').strip()
        password = cleaned_data.get('login_password') or ''
        owner = self.instance.owner if self.instance and self.instance.owner_id else None
        owner_is_profile_user = bool(owner and not owner.is_staff and not owner.is_superuser)
        if password and not username:
            self.add_error('login_username', 'Add a username before setting a password.')
        if not owner_is_profile_user and username and not password:
            self.add_error('login_password', 'Set a password for the new profile login.')
        return cleaned_data


class ProfessionalProfileOwnerForm(ProfessionalProfileForm):
    class Meta(ProfessionalProfileForm.Meta):
        fields = [
            field
            for field in ProfessionalProfileForm.Meta.fields
            if field not in {'is_verified', 'is_active', 'profile_type'}
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['slug'].required = False
        self.fields['slug'].widget = forms.HiddenInput()
        if self.instance and self.instance.slug:
            self.fields['slug'].initial = self.instance.slug

    def clean_slug(self):
        slug = (self.cleaned_data.get('slug') or '').strip()
        if slug:
            return slug
        if self.instance and self.instance.slug:
            return self.instance.slug
        return slug


class ProfessionalServiceForm(forms.ModelForm):
    class Meta:
        model = ProfessionalService
        fields = ['title', 'icon', 'display_order']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 2}),
            'icon': forms.Select(choices=SERVICE_ICON_CHOICES),
        }
        labels = {
            'title': 'Service / Skill',
            'icon': 'Icon',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['display_order'].required = False


class ProfessionalPortfolioItemForm(forms.ModelForm):
    class Meta:
        model = ProfessionalPortfolioItem
        fields = ['title', 'highlight_type', 'organization', 'period', 'description', 'image', 'link', 'display_order']
        widgets = {'description': forms.Textarea(attrs={'rows': 2})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['display_order'].required = False


class ProfessionalTestimonialForm(forms.ModelForm):
    class Meta:
        model = ProfessionalTestimonial
        fields = ['review_text', 'client_name', 'client_role', 'organization', 'profile_photo', 'rating', 'display_order']
        widgets = {'review_text': forms.Textarea(attrs={'rows': 2})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['rating'].required = False
        self.fields['display_order'].required = False

    def clean_review_text(self):
        review = (self.cleaned_data.get('review_text') or '').strip()
        if review and len(review) < 12:
            raise forms.ValidationError('Add a little more context to make this recommendation useful.')
        return review


class ProfessionalDocumentForm(forms.ModelForm):
    class Meta:
        model = ProfessionalDocument
        fields = ['title', 'file', 'document_type', 'is_public', 'display_order']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['display_order'].required = False


class ProfessionalDocumentBaseFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        public_count = 0
        for form in self.forms:
            if not hasattr(form, 'cleaned_data') or not form.cleaned_data:
                continue
            if form.cleaned_data.get('DELETE'):
                continue
            if form.cleaned_data.get('is_public'):
                public_count += 1
        if public_count > 2:
            raise forms.ValidationError('Keep public documents limited to two: CV / Resume and one supporting document.')


def _style_formset(formset):
    for form in formset.forms:
        for field in form.fields.values():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.update({'class': 'h-4 w-4 rounded border-slate-300 text-teal-700'})
            elif isinstance(field.widget, forms.FileInput):
                field.widget.attrs.update({'class': 'w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs'})
            else:
                field.widget.attrs.update({'class': CONTROL_CLASS})
    return formset


ProfessionalServiceFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalService,
    form=ProfessionalServiceForm,
    extra=0,
    can_delete=True,
)
ProfessionalPortfolioFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalPortfolioItem,
    form=ProfessionalPortfolioItemForm,
    extra=0,
    can_delete=True,
)
ProfessionalTestimonialFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalTestimonial,
    form=ProfessionalTestimonialForm,
    extra=0,
    can_delete=True,
)
ProfessionalDocumentFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalDocument,
    form=ProfessionalDocumentForm,
    formset=ProfessionalDocumentBaseFormSet,
    extra=0,
    can_delete=True,
)
