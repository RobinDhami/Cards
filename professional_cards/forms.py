from django import forms
from django.forms import inlineformset_factory

from .models import (
    ProfessionalDocument,
    ProfessionalPortfolioItem,
    ProfessionalProfile,
    ProfessionalService,
    ProfessionalTestimonial,
)


CONTROL_CLASS = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600'


class ProfessionalProfileForm(forms.ModelForm):
    class Meta:
        model = ProfessionalProfile
        fields = [
            'owner',
            'full_name',
            'slug',
            'profile_photo',
            'cover_photo',
            'designation',
            'company_name',
            'industry',
            'short_tagline',
            'about',
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
            'office_address': forms.Textarea(attrs={'rows': 3}),
            'accent_color': forms.TextInput(attrs={'type': 'color'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.update({'class': 'h-4 w-4 rounded border-slate-300 text-teal-700'})
            elif isinstance(field.widget, forms.FileInput):
                field.widget.attrs.update({'class': 'w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm'})
            else:
                field.widget.attrs.update({'class': CONTROL_CLASS})


class ProfessionalServiceForm(forms.ModelForm):
    class Meta:
        model = ProfessionalService
        fields = ['title', 'description', 'icon', 'display_order']
        widgets = {'description': forms.Textarea(attrs={'rows': 2})}


class ProfessionalPortfolioItemForm(forms.ModelForm):
    class Meta:
        model = ProfessionalPortfolioItem
        fields = ['title', 'description', 'image', 'link', 'display_order']
        widgets = {'description': forms.Textarea(attrs={'rows': 2})}


class ProfessionalTestimonialForm(forms.ModelForm):
    class Meta:
        model = ProfessionalTestimonial
        fields = ['client_name', 'client_role', 'review_text', 'rating', 'display_order']
        widgets = {'review_text': forms.Textarea(attrs={'rows': 2})}


class ProfessionalDocumentForm(forms.ModelForm):
    class Meta:
        model = ProfessionalDocument
        fields = ['title', 'file', 'document_type', 'is_public', 'display_order']


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
    extra=1,
    can_delete=True,
)
ProfessionalPortfolioFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalPortfolioItem,
    form=ProfessionalPortfolioItemForm,
    extra=1,
    can_delete=True,
)
ProfessionalTestimonialFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalTestimonial,
    form=ProfessionalTestimonialForm,
    extra=1,
    can_delete=True,
)
ProfessionalDocumentFormSet = inlineformset_factory(
    ProfessionalProfile,
    ProfessionalDocument,
    form=ProfessionalDocumentForm,
    extra=1,
    can_delete=True,
)
