import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


def public_identifier():
    return secrets.token_urlsafe(18)


class VenueProfile(models.Model):
    VENUE_TYPES = [('hotel', 'Hotel'), ('restaurant', 'Restaurant'), ('cafe', 'Café'), ('bar', 'Bar'), ('other', 'Other venue')]
    organization = models.OneToOneField('vcards.College', on_delete=models.CASCADE, related_name='venue_profile')
    venue_type = models.CharField(max_length=20, choices=VENUE_TYPES, default='restaurant')
    public_identifier = models.CharField(max_length=64, unique=True, default=public_identifier, editable=False)
    logo = models.ImageField(upload_to='venue_logos/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='venue_covers/', blank=True, null=True)
    description = models.TextField(blank=True)
    primary_color = models.CharField(max_length=20, default='#173f35')
    secondary_color = models.CharField(max_length=20, default='#bd6848')
    whatsapp = models.CharField(max_length=32, blank=True)
    google_review_url = models.URLField(blank=True, max_length=1000)
    reservation_url = models.URLField(blank=True, max_length=1000)
    opening_hours = models.TextField(blank=True)
    opening_schedule = models.JSONField(default=dict, blank=True)
    timezone = models.CharField(max_length=64, default='Asia/Kathmandu')
    whatsapp_same_as_phone = models.BooleanField(default=False)
    feedback_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.organization.name} venue'


class VenueMenuCategory(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='menu_categories')
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['venue', 'slug'], name='venue_menu_category_slug_unique')]
        ordering = ['display_order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class VenueMenuItem(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='menu_items')
    category = models.ForeignKey(VenueMenuCategory, on_delete=models.PROTECT, related_name='items')
    public_identifier = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='venue_menu/', blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    original_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(Decimal('0'))])
    offer_label = models.CharField(max_length=120, blank=True)
    dietary_info = models.CharField(max_length=255, blank=True)
    is_vegetarian = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    is_today_special = models.BooleanField(default=False)
    is_offer = models.BooleanField(default=False)
    special_starts_at = models.DateTimeField(blank=True, null=True)
    special_ends_at = models.DateTimeField(blank=True, null=True)
    offer_starts_at = models.DateTimeField(blank=True, null=True)
    offer_ends_at = models.DateTimeField(blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        indexes = [models.Index(fields=['venue', 'is_available', 'display_order'])]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.category_id and self.category.venue_id != self.venue_id:
            raise ValidationError({'category': 'Category must belong to the same venue.'})
        if self.price is not None and self.price <= 0:
            raise ValidationError({'price': 'Price must be greater than zero.'})
        if self.is_offer:
            if self.original_price is not None and self.original_price <= self.price:
                raise ValidationError({'original_price': 'Original price must be greater than the current price.'})
            if self.original_price is None and not self.offer_label.strip():
                raise ValidationError({'offer_label': 'Add an offer label or an original price.'})
        if self.special_starts_at and self.special_ends_at and self.special_starts_at >= self.special_ends_at:
            raise ValidationError({'special_ends_at': 'Special end time must be after its start time.'})
        if self.offer_starts_at and self.offer_ends_at and self.offer_starts_at >= self.offer_ends_at:
            raise ValidationError({'offer_ends_at': 'Offer end time must be after its start time.'})


class VenueMenuItemVariant(models.Model):
    item = models.ForeignKey(VenueMenuItem, on_delete=models.CASCADE, related_name='price_variants')
    label = models.CharField(max_length=80)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']


class VenueLink(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    value = models.CharField(max_length=1000)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['venue', 'is_active', 'display_order'])]


class VenueStaffProfile(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='staff_profiles')
    public_identifier = models.CharField(max_length=64, unique=True, default=public_identifier, editable=False)
    name = models.CharField(max_length=160)
    position = models.CharField(max_length=120, blank=True)
    photo = models.ImageField(upload_to='venue_staff/', blank=True, null=True)
    bio = models.TextField(blank=True, max_length=1000)
    is_active = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name', 'id']
        indexes = [models.Index(fields=['venue', 'is_active', 'display_order'])]


class VenueStaffLink(models.Model):
    LINK_TYPES = [
        ('phone', 'Work phone'), ('email', 'Work email'), ('whatsapp', 'WhatsApp'),
        ('website', 'Website'), ('linkedin', 'LinkedIn'), ('instagram', 'Instagram'),
    ]
    staff = models.ForeignKey(VenueStaffProfile, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=20, choices=LINK_TYPES)
    label = models.CharField(max_length=80)
    value = models.CharField(max_length=500)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'id']


class VenueTouchpoint(models.Model):
    DESTINATIONS = [('profile', 'Business profile'), ('menu', 'Menu'), ('feedback', 'Feedback')]
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='touchpoints')
    public_identifier = models.CharField(max_length=64, unique=True, default=public_identifier, editable=False)
    name = models.CharField(max_length=120)
    destination = models.CharField(max_length=20, choices=DESTINATIONS, default='profile')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name', 'id']
        constraints = [models.UniqueConstraint(fields=['venue', 'name'], name='venue_touchpoint_name_unique')]


class VenueCardAssignment(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='card_assignments')
    physical_card = models.OneToOneField('vcards.CardBatchCard', on_delete=models.PROTECT, related_name='venue_assignment')
    staff = models.OneToOneField(VenueStaffProfile, on_delete=models.CASCADE, related_name='card_assignment', blank=True, null=True)
    touchpoint = models.OneToOneField(VenueTouchpoint, on_delete=models.CASCADE, related_name='card_assignment', blank=True, null=True)
    public_identifier = models.CharField(max_length=64, unique=True, default=public_identifier, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(models.Q(staff__isnull=False, touchpoint__isnull=True) | models.Q(staff__isnull=True, touchpoint__isnull=False)),
                name='venue_card_assignment_exactly_one_target',
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if bool(self.staff_id) == bool(self.touchpoint_id):
            raise ValidationError('Choose exactly one staff profile or touchpoint.')
        target = self.staff if self.staff_id else self.touchpoint
        if target and target.venue_id != self.venue_id:
            raise ValidationError('Card target must belong to the same organization.')
        card = self.physical_card
        if card.organization_id != self.venue.organization_id:
            raise ValidationError('Physical card must be allocated to this organization.')
        if card.student_profile_id or card.professional_profile_id:
            raise ValidationError('Physical card is already assigned to another profile.')


class VenueFeedback(models.Model):
    STATUS_CHOICES = [('new', 'New'), ('in_progress', 'In progress'), ('resolved', 'Resolved')]
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='feedback')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, max_length=2000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    touchpoint_source = models.CharField(max_length=80, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    internal_note = models.TextField(blank=True, max_length=5000)
    rate_limit_hash = models.CharField(max_length=64, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class VenueAnalyticsEvent(models.Model):
    EVENT_TYPES = [
        ('profile_view', 'Profile view'),
        ('menu_open', 'Menu opened'),
        ('menu_item_click', 'Menu-item detail viewed'),
        ('rating_click', 'Rating clicked'),
        ('google_review_click', 'Google review button clicked'),
        ('feedback_submit', 'Feedback submitted'),
        ('social_click', 'Public link clicked'),
    ]

    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='analytics_events')
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    target = models.CharField(max_length=160, blank=True)
    # Privacy-preserving, server-side fingerprint used only for an estimated
    # unique visitor count. It is never returned to the browser.
    visitor_hash = models.CharField(max_length=64, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['venue', 'event_type', 'created_at']),
            models.Index(fields=['venue', 'created_at']),
        ]
