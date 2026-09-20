from decimal import Decimal
import re

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.functions import Lower
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone


class PlatformAccess(User):
    class Meta:
        proxy = True
        default_permissions = ()
        permissions = [
            ('access_platform_overview', 'Can access platform overview'),
            ('access_platform_organizations', 'Can access platform organizations'),
            ('access_platform_members', 'Can access platform members'),
            ('access_platform_professionals', 'Can access platform professional profiles'),
            ('access_platform_templates', 'Can access platform Template Studio'),
            ('access_platform_cards', 'Can access platform cards'),
            ('access_platform_card_operations', 'Can access platform card operations'),
            ('access_platform_activity', 'Can access platform activity'),
            ('access_platform_reports', 'Can access platform reports'),
            ('access_platform_settings', 'Can access platform settings'),
        ]


class CardBatch(models.Model):
    FAULT_REPRINT_REASON_CHOICES = [
        ('printing_issue', 'Printing issue'),
        ('nfc_not_working', 'NFC not working'),
        ('wrong_details', 'Wrong details'),
        ('damaged', 'Damaged'),
        ('qr_issue', 'QR issue'),
        ('other', 'Other'),
    ]

    batch_name = models.CharField(max_length=100, unique=True)
    date = models.DateField(default=timezone.localdate)
    cards_printed = models.PositiveIntegerField(default=0)
    faulty_cards = models.PositiveIntegerField(default=0)
    reprinted_cards = models.PositiveIntegerField(default=0)
    cards_sold = models.PositiveIntegerField(default=0)
    total_sales_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    fault_reprint_reason = models.CharField(
        max_length=30,
        choices=FAULT_REPRINT_REASON_CHOICES,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return self.batch_name


class CardBatchCard(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('faulty', 'Faulty'),
        ('reprinted', 'Reprinted'),
        ('sold', 'Sold'),
    ]

    batch = models.ForeignKey(CardBatch, on_delete=models.CASCADE, related_name='physical_cards')
    card_label = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    student_profile = models.ForeignKey('StudentProfile', on_delete=models.SET_NULL, related_name='physical_card_entries', blank=True, null=True)
    professional_profile = models.ForeignKey('professional_cards.ProfessionalProfile', on_delete=models.SET_NULL, related_name='physical_card_entries', blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(student_profile__isnull=True) | models.Q(professional_profile__isnull=True),
                name='card_batch_card_at_most_one_profile',
            ),
        ]

    def __str__(self):
        return self.card_label or f'Card #{self.pk}'

# Skill
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.name

# College
class College(models.Model):
    class Meta:
        constraints = [models.UniqueConstraint(Lower('organization_code'), name='college_code_ci_unique')]

    ORGANIZATION_TYPE_CHOICES = [
        ('education', 'Education'),
        ('club', 'Club'),
        ('business', 'Business'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255, unique=True)
    # Blank preserves the legacy generic workspace behaviour for existing records.
    organization_type = models.CharField(max_length=20, choices=ORGANIZATION_TYPE_CHOICES, blank=True, default='')
    organization_code = models.CharField(max_length=12, unique=True, blank=True, null=True, default=None)
    member_username_sequence = models.PositiveBigIntegerField(default=0, editable=False)
    admin_user = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='managed_schools', blank=True, null=True)
    slogan = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to='college_logos/', blank=True, null=True)
    # Shared organization brand content. Member profiles deliberately do not own
    # these values, so every club card stays consistent.
    cover_photo = models.ImageField(upload_to='organization_covers/', blank=True, null=True)
    principal_name = models.CharField(max_length=255, blank=True, default='')
    principal_signature = models.ImageField(upload_to='principal_signatures/', blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    map_url = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    # These are intentionally club-specific. Generic organization fields above
    # remain available to every module without duplicating member data.
    club_district = models.CharField(max_length=160, blank=True, default='')
    chartered_on = models.DateField(blank=True, null=True)
    sponsoring_club = models.CharField(max_length=255, blank=True, default='')
    student_username_prefix = models.CharField(max_length=80, blank=True, default='')
    theme_primary = models.CharField(max_length=20, blank=True, default='#1a3a5c')
    theme_light_primary = models.CharField(max_length=20, blank=True, default='#f7f5f0')
    theme_secondary = models.CharField(max_length=20, blank=True, default='#1a1a2a')
    theme_ternary = models.CharField(max_length=20, blank=True, default='#c9a84c')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()
        self.organization_code = re.sub(r'[^A-Z0-9]', '', self.organization_code.upper()) or None if self.organization_code else None

    def save(self, *args, **kwargs):
        self.organization_code = re.sub(r'[^A-Z0-9]', '', self.organization_code.upper()) or None if self.organization_code else None
        # The allocator owns this field. A stale settings form must never
        # overwrite the database's high-water mark with its earlier value.
        if self.pk:
            requested_fields = kwargs.get('update_fields')
            kwargs['update_fields'] = [
                field.name for field in self._meta.concrete_fields
                if not field.primary_key and field.name != 'member_username_sequence'
                and (requested_fields is None or field.name in requested_fields)
            ]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

# Abstract Base Profile
class BaseProfile(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, default='')
    bio = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='cover_photos/', blank=True, null=True)
    birth_certificate = models.FileField(upload_to='birth_certificates/', blank=True, null=True)
    skills = models.ManyToManyField(Skill, blank=True)
    cv = models.FileField(upload_to='cvs/', blank=True, null=True)
    show_portfolio = models.BooleanField(default=True)
    show_contact_card = models.BooleanField(default=True)
    facebook = models.URLField(blank=True, null=True)
    messenger= models.URLField(blank=True, null=True)
    whatsapp = models.CharField(max_length=20, blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    figma = models.URLField(blank=True, null=True)
    upwork = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    views = models.PositiveIntegerField(default=0)
    contact_clicks = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    def save(self, *args, **kwargs):
        if self.password and not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    class Meta:
        abstract = True

# Student Profile
class StudentProfile(BaseProfile):
    class Meta:
        constraints = [models.UniqueConstraint(Lower('username'), name='member_username_ci_unique')]

    PROFILE_CATEGORY_CHOICES = [
        ('school', 'School / College Profile'),
        ('organization', 'Organization Profile'),
        ('individual', 'Single Individual Profile'),
        ('professional', 'Independent Professional'),
    ]

    MEMBER_TYPE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('staff', 'Staff / Administration'),
        ('member', 'Member'),
        ('other', 'Other Member'),
    ]

    ACADEMIC_LEVEL_CHOICES = [
        ('play_group', 'Play Group'),
        ('pg', 'PG'),
        ('nursery', 'Nursery'),
        ('lkg', 'LKG'),
        ('ukg', 'UKG'),
        ('grade_1', 'Grade 1'),
        ('grade_2', 'Grade 2'),
        ('grade_3', 'Grade 3'),
        ('grade_4', 'Grade 4'),
        ('grade_5', 'Grade 5'),
        ('grade_6', 'Grade 6'),
        ('grade_7', 'Grade 7'),
        ('grade_8', 'Grade 8'),
        ('grade_9', 'Grade 9'),
        ('grade_10', 'Grade 10'),
        ('grade_11', 'Grade 11'),
        ('grade_12', 'Grade 12'),
    ]

    GENDER_CHOICES = [
        ('', 'Not set'),
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    college = models.ForeignKey(College, on_delete=models.SET_NULL, related_name='students', blank=True, null=True)
    auth_user = models.OneToOneField(User, on_delete=models.SET_NULL, related_name='managed_profile', blank=True, null=True)
    password_change_required = models.BooleanField(default=False)
    unique_identifier = models.CharField(max_length=40, unique=True, blank=True, null=True, default=None)
    profile_category = models.CharField(max_length=20, choices=PROFILE_CATEGORY_CHOICES, default='school')
    member_type = models.CharField(max_length=20, choices=MEMBER_TYPE_CHOICES, default='student')
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True, default='')
    emergency_contact_phone = models.CharField(max_length=20, blank=True, default='')
    map_url = models.URLField(blank=True, null=True)
    academic_level = models.CharField(max_length=20, choices=ACADEMIC_LEVEL_CHOICES, blank=True, default='')
    section = models.CharField(max_length=20, blank=True, default='')
    roll_number = models.CharField(max_length=30, blank=True, default='')
    academic_year = models.CharField(max_length=40, blank=True, default='')
    faculty_program = models.CharField(max_length=120, blank=True, default='')
    department = models.CharField(max_length=120, blank=True, default='')
    committee = models.CharField(max_length=120, blank=True, default='')
    membership_term = models.CharField(max_length=60, blank=True, default='')
    join_date = models.DateField(blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, default='')
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, default='')
    about_intro = models.TextField(blank=True, null=True)
    about_featured = models.TextField(blank=True, null=True)
    about_current = models.TextField(blank=True, null=True)
    additional_info_heading = models.CharField(max_length=120, blank=True, default='')
    additional_info_description = models.TextField(blank=True, default='')
    social_stack = models.CharField(max_length=255, blank=True, default="")  # e.g. "linkedin,instagram,github"

    USER_TYPE_CHOICES = [
        ('general', 'General'),
        ('vip', 'VIP'),
        ('premium', 'Premium'),
    ]
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='general')
    contact_template = models.CharField(max_length=50, default='student_digital_card.html')
    portfolio_template = models.CharField(max_length=50, default='portfolio1.html')
    print_template = models.CharField(max_length=50, default='print_classic.html')
    print_card_type = models.CharField(max_length=30, default='id_card')
    print_orientation = models.CharField(max_length=20, default='portrait')
    print_front_design = models.CharField(max_length=50, default='front_academic_blue')
    print_back_design = models.CharField(max_length=50, default='back_qr_clean')
    print_calendar = models.CharField(max_length=10, default='bs')
    print_valid_till = models.CharField(max_length=20, blank=True, default='')
    print_label = models.CharField(max_length=100, blank=True, default='')
    print_custom_note = models.TextField(blank=True, default='')

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if not self.unique_identifier:
            school_part = f"S{self.college_id}" if self.college_id else "GEN"
            type_part = {
                'student': 'STU',
                'teacher': 'TCH',
                'other': 'MEM',
            }.get(self.member_type, 'MEM')
            self.unique_identifier = f"{school_part}-{type_part}-{self.pk:05d}"
            StudentProfile.objects.filter(pk=self.pk).update(unique_identifier=self.unique_identifier)

    @property
    def profile_url(self):
        return reverse('student_contact_card', args=[self.id])

    def __str__(self):
        if self.college:
            return f"{self.name} - {self.college.name}"
        if self.organization_name:
            return f"{self.name} - {self.organization_name}"
        return self.name


class ClubProfileSettings(models.Model):
    """Presentation and publication controls for a club organization.

    Core organization identity/contact fields remain on ``College`` so they are
    not asked for or stored twice here.
    """

    organization = models.OneToOneField(College, on_delete=models.CASCADE, related_name='club_profile_settings')
    about = models.TextField(blank=True, default='')
    hero_left_text = models.CharField(max_length=100, blank=True, default='')
    hero_right_text = models.CharField(max_length=100, blank=True, default='')
    hero_quote = models.CharField(max_length=180, blank=True, default='')
    cta_title = models.CharField(max_length=120, blank=True, default='')
    cta_subtitle = models.CharField(max_length=180, blank=True, default='')
    cta_button_label = models.CharField(max_length=60, blank=True, default='')
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.organization_id and self.organization.organization_type != 'club':
            raise ValidationError({'organization': 'Club profile settings require a club organization.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.organization.name} club profile settings'


class ClubSocialLink(models.Model):
    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'), ('instagram', 'Instagram'), ('linkedin', 'LinkedIn'),
        ('youtube', 'YouTube'), ('x', 'X'), ('tiktok', 'TikTok'),
        ('whatsapp', 'WhatsApp'), ('other', 'Other'),
    ]

    organization = models.ForeignKey(College, on_delete=models.CASCADE, related_name='club_social_links')
    platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    url = models.URLField()
    label = models.CharField(max_length=60, blank=True, default='')
    is_visible = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('sort_order', 'id')
        constraints = [models.UniqueConstraint(fields=('organization', 'platform', 'url'), name='club_social_link_unique')]

    def clean(self):
        super().clean()
        if self.organization_id and self.organization.organization_type != 'club':
            raise ValidationError({'organization': 'Club social links require a club organization.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ClubMemberProfile(models.Model):
    """Public-card settings only; identity and contact fields stay on the member."""

    member = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='club_public_profile')
    quote = models.CharField(max_length=180, blank=True, default='')
    show_email = models.BooleanField(default=True)
    show_phone = models.BooleanField(default=True)
    show_address = models.BooleanField(default=False)
    show_social_media = models.BooleanField(default=True)
    enable_connect = models.BooleanField(default=True)
    enable_save_contact = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if not self.member_id:
            return
        if not self.member.college_id or self.member.college.organization_type != 'club':
            raise ValidationError({'member': 'Club public profiles require a member of a club organization.'})
        if self.member.member_type != 'member':
            raise ValidationError({'member': 'Club public profiles require the Member category.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ClubMemberSocialLink(models.Model):
    member = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='club_social_links')
    platform = models.CharField(max_length=30)
    url = models.URLField()
    label = models.CharField(max_length=60, blank=True, default='')
    is_visible = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('sort_order', 'id')
        constraints = [models.UniqueConstraint(fields=('member', 'platform', 'url'), name='club_member_social_link_unique')]

    def clean(self):
        super().clean()
        if not self.member_id or not self.member.college_id or self.member.college.organization_type != 'club':
            raise ValidationError({'member': 'Club social links require a member of a club organization.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ProfileActivity(models.Model):
    EVENT_TYPE_CHOICES = [
        ('view', 'Card View'),
        ('download', 'vCard Download'),
        ('contact', 'Contact Action'),
    ]

    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='activities')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    action = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.name} - {self.event_type} ({self.action or 'n/a'})"


class StudentCard(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='cards')
    card_uid = models.CharField(max_length=120, unique=True)
    card_number = models.CharField(max_length=80, blank=True, default='')
    is_active = models.BooleanField(default=True)
    issued_date = models.DateField(default=timezone.localdate)
    lost_or_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student'],
                condition=models.Q(is_active=True, lost_or_blocked=False),
                name='one_active_card_per_student',
            )
        ]

    def __str__(self):
        return f"{self.student.name} - {self.card_uid}"
