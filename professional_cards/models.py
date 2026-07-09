from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils.text import slugify


class ProfessionalProfile(models.Model):
    TEMPLATE_CHOICES = [
        ('professional_premium', 'Professional Premium'),
        ('modern_identity', 'Modern Identity'),
    ]
    PROFILE_TYPE_CHOICES = [
        ('student', 'Student'),
        ('professional', 'Professional'),
        ('entrepreneur', 'Entrepreneur'),
        ('creator', 'Creator'),
        ('other', 'Other'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='professional_profiles',
        blank=True,
        null=True,
    )
    profile_type = models.CharField(max_length=30, choices=PROFILE_TYPE_CHOICES, default='professional')
    full_name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=180, unique=True, help_text='Used for the public profile URL.')
    profile_photo = models.ImageField(upload_to='professional_profiles/photos/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='professional_profiles/covers/', blank=True, null=True)
    profession = models.CharField(max_length=160, blank=True, default='')
    designation = models.CharField(max_length=160, blank=True, default='')
    company_name = models.CharField(max_length=180, blank=True, default='')
    organization_logo = models.ImageField(
        upload_to='professional_profiles/organization_logos/',
        blank=True,
        null=True,
    )
    organization_tagline = models.CharField(
        max_length=180,
        blank=True,
        default='',
        help_text='A short line shown below the company, college, or organization name.',
    )
    profile_identifier_label = models.CharField(
        max_length=60,
        blank=True,
        default='Profile ID',
        help_text='For example: Employee ID, Member ID, Registration No., or Creator ID.',
    )
    profile_identifier = models.CharField(max_length=120, blank=True, default='')
    industry = models.CharField(max_length=120, blank=True, default='')
    academic_section = models.CharField(
        max_length=80,
        blank=True,
        default='',
        help_text='Optional class, batch, cohort, or section for student profiles.',
    )
    short_tagline = models.CharField(max_length=255, blank=True, default='')
    about = models.TextField(blank=True, default='')
    current_focus = models.TextField(
        blank=True,
        default='',
        help_text='What you are currently building, learning, offering, or working toward.',
    )
    featured_interest = models.TextField(
        blank=True,
        default='',
        help_text='A featured specialty, interest, initiative, or professional goal.',
    )
    phone = models.CharField(max_length=40, blank=True, default='')
    whatsapp_number = models.CharField(max_length=40, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    website = models.URLField(blank=True, default='')
    linkedin_url = models.URLField(blank=True, default='')
    facebook_url = models.URLField(blank=True, default='')
    instagram_url = models.URLField(blank=True, default='')
    youtube_url = models.URLField(blank=True, default='')
    github_url = models.URLField(blank=True, default='')
    booking_url = models.URLField(blank=True, default='')
    office_address = models.TextField(blank=True, default='')
    google_maps_url = models.URLField(blank=True, default='')
    show_map_on_profile = models.BooleanField(default=False)
    business_hours = models.CharField(max_length=180, blank=True, default='')
    years_of_experience = models.PositiveIntegerField(blank=True, null=True)
    location = models.CharField(max_length=160, blank=True, default='')
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    template_name = models.CharField(max_length=80, choices=TEMPLATE_CHOICES, default='professional_premium')
    accent_color = models.CharField(max_length=20, default='#0f766e')
    views = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._unique_slug()
        super().save(*args, **kwargs)

    def _unique_slug(self):
        base = slugify(self.full_name) or 'professional'
        candidate = base
        suffix = 2
        while ProfessionalProfile.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
            candidate = f'{base}-{suffix}'
            suffix += 1
        return candidate

    @property
    def public_url_path(self):
        return reverse('professional_cards:public_profile', args=[self.slug])

    def __str__(self):
        return self.full_name


class ProfessionalService(models.Model):
    profile = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=80, blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'title']

    def __str__(self):
        return self.title


class ProfessionalPortfolioItem(models.Model):
    profile = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='portfolio_items')
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='professional_profiles/portfolio/', blank=True, null=True)
    link = models.URLField(blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'title']

    def __str__(self):
        return self.title


class ProfessionalTestimonial(models.Model):
    profile = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='testimonials')
    client_name = models.CharField(max_length=160)
    client_role = models.CharField(max_length=180, blank=True, default='')
    review_text = models.TextField()
    rating = models.PositiveSmallIntegerField(blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'client_name']

    def __str__(self):
        return self.client_name


class ProfessionalDocument(models.Model):
    DOCUMENT_TYPES = [
        ('brochure', 'Brochure'),
        ('portfolio', 'Portfolio'),
        ('certificate', 'Certificate'),
        ('other', 'Other'),
    ]

    profile = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=180)
    file = models.FileField(upload_to='professional_profiles/documents/')
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES, default='other')
    is_public = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'title']

    def __str__(self):
        return self.title
