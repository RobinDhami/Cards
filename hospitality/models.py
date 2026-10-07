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
    is_today_special = models.BooleanField(default=False)
    is_offer = models.BooleanField(default=False)
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


class VenueLink(models.Model):
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    value = models.CharField(max_length=500)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['venue', 'is_active', 'display_order'])]


class VenueFeedback(models.Model):
    STATUS_CHOICES = [('new', 'New'), ('reviewed', 'Reviewed'), ('resolved', 'Resolved'), ('archived', 'Archived')]
    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='feedback')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, max_length=2000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    rate_limit_hash = models.CharField(max_length=64, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)


class VenueAnalyticsEvent(models.Model):
    EVENT_TYPES = [
        ('profile_view', 'Profile view'),
        ('menu_open', 'Menu opened'),
        ('menu_item_click', 'Menu item clicked'),
        ('rating_click', 'Rating clicked'),
        ('feedback_submit', 'Feedback submitted'),
        ('social_click', 'Social link clicked'),
    ]

    venue = models.ForeignKey(VenueProfile, on_delete=models.CASCADE, related_name='analytics_events')
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    target = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['venue', 'event_type', 'created_at']),
            models.Index(fields=['venue', 'created_at']),
        ]
