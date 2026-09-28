import hashlib
import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class ValidatedSaveMixin:
    """Ensure application saves cannot bypass model-level relationship validation."""

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Hotel(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=120, unique=True)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='hotel_logos/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='hotel_covers/', blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True)
    whatsapp = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    google_maps_url = models.URLField(blank=True)
    google_review_url = models.URLField(blank=True)
    check_in_time = models.TimeField(blank=True, null=True)
    check_out_time = models.TimeField(blank=True, null=True)
    time_zone = models.CharField(max_length=64, default='UTC')
    currency = models.CharField(max_length=3, default='USD')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['is_active', 'slug'])]

    def __str__(self):
        return self.name


class HotelPackageEntitlement(models.Model):
    DIGITAL_GUIDE = 'digital_guide'
    SMART_GUEST = 'smart_guest'
    PACKAGE_CHOICES = [(DIGITAL_GUIDE, 'Hotel Digital Guide'), (SMART_GUEST, 'Smart Guest Experience')]
    MANAGEMENT_CHOICES = [('self_managed', 'Self-managed'), ('tap2connect_managed', 'Tap2connect-managed')]
    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='package_entitlement')
    package = models.CharField(max_length=32, choices=PACKAGE_CHOICES, default=DIGITAL_GUIDE)
    management_mode = models.CharField(max_length=32, choices=MANAGEMENT_CHOICES, default='self_managed')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='assigned_hotel_packages')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hotel package entitlement'

    def __str__(self):
        return f'{self.hotel} · {self.get_package_display()}'


class HotelFeatureSettings(ValidatedSaveMixin, models.Model):
    MENU_VIEW_ONLY = 'view_only'
    MENU_ORDERING = 'ordering'
    SERVICE_VIEW_ONLY = 'view_only'
    SERVICE_WHATSAPP = 'whatsapp'
    SERVICE_DIGITAL_REQUEST = 'digital_request'
    MENU_MODE_CHOICES = [(MENU_VIEW_ONLY, 'View only'), (MENU_ORDERING, 'Ordering')]
    SERVICE_MODE_CHOICES = [(SERVICE_VIEW_ONLY, 'View only'), (SERVICE_WHATSAPP, 'WhatsApp'), (SERVICE_DIGITAL_REQUEST, 'Digital request')]

    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='feature_settings')
    menu_mode = models.CharField(max_length=20, choices=MENU_MODE_CHOICES, default=MENU_VIEW_ONLY)
    service_mode = models.CharField(max_length=24, choices=SERVICE_MODE_CHOICES, default=SERVICE_VIEW_ONLY)
    guest_access_enabled = models.BooleanField(default=False)
    menu_visible = models.BooleanField(default=True)
    services_visible = models.BooleanField(default=True)
    offers_visible = models.BooleanField(default=True)
    review_visible = models.BooleanField(default=True)
    contact_links_visible = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if self.menu_mode == self.MENU_ORDERING and not self.guest_access_enabled:
            raise ValidationError({'guest_access_enabled': 'Ordering requires guest access.'})
        if self.service_mode == self.SERVICE_DIGITAL_REQUEST and not self.guest_access_enabled:
            raise ValidationError({'guest_access_enabled': 'Digital service requests require guest access.'})
        if self.service_mode == self.SERVICE_WHATSAPP and self.hotel_id and not self.hotel.whatsapp:
            raise ValidationError({'service_mode': 'WhatsApp service mode requires a hotel WhatsApp destination.'})


class HotelMembership(models.Model):
    ROLE_CHOICES = [('owner', 'Owner'), ('manager', 'Manager'), ('staff', 'Staff')]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hotel_memberships')
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'hotel'], name='hotel_membership_user_hotel_unique')]
        indexes = [models.Index(fields=['hotel', 'is_active'])]


class Room(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    identifier = models.CharField(max_length=80)
    floor = models.CharField(max_length=40, blank=True)
    room_type = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['hotel', 'identifier'], name='hotel_room_identifier_unique')]
        indexes = [models.Index(fields=['hotel', 'is_active', 'identifier'])]

    def __str__(self):
        return self.identifier


class GuestStay(ValidatedSaveMixin, models.Model):
    STATUS_CHOICES = [('upcoming', 'Upcoming'), ('active', 'Active'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    hotel = models.ForeignKey(Hotel, on_delete=models.PROTECT, related_name='guest_stays')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='guest_stays', blank=True, null=True)
    guest_name = models.CharField(max_length=255, blank=True)
    access_token_hash = models.CharField(max_length=64, unique=True, editable=False)
    access_code_hash = models.CharField(max_length=255, blank=True, default='')
    access_code_generated_at = models.DateTimeField(blank=True, null=True)
    access_code_expires_at = models.DateTimeField(blank=True, null=True)
    access_code_version = models.PositiveIntegerField(default=1)
    check_in_at = models.DateTimeField()
    check_out_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    token_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def hash_token(raw_token):
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    @classmethod
    def issue_token(cls):
        raw = secrets.token_urlsafe(32)
        return raw, cls.hash_token(raw)

    @classmethod
    def create_with_token(cls, **kwargs):
        raw, digest = cls.issue_token()
        kwargs['access_token_hash'] = digest
        return cls.objects.create(**kwargs), raw

    def save(self, *args, **kwargs):
        if not self.access_token_hash:
            self.access_token_hash = self.hash_token(secrets.token_urlsafe(32))
        super().save(*args, **kwargs)

    def matches_token(self, raw_token):
        return secrets.compare_digest(self.access_token_hash, self.hash_token(raw_token))

    def clean(self):
        super().clean()
        if self.room_id and self.room.hotel_id != self.hotel_id:
            raise ValidationError({'room': 'Room must belong to the same hotel.'})
        if self.check_out_at and self.check_out_at < self.check_in_at:
            raise ValidationError({'check_out_at': 'Check-out must not precede check-in.'})


class GuestAccessSession(models.Model):
    stay = models.ForeignKey(GuestStay, on_delete=models.CASCADE, related_name='access_sessions')
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    code_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_used_at = models.DateTimeField(blank=True, null=True)
    revoked_at = models.DateTimeField(blank=True, null=True)

    @staticmethod
    def hash_token(raw_token):
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    @classmethod
    def issue_token(cls):
        raw = secrets.token_urlsafe(32)
        return raw, cls.hash_token(raw)

    def is_active(self, now=None):
        now = now or timezone.now()
        stay = self.stay
        return bool(
            not self.revoked_at
            and self.expires_at > now
            and stay.status == 'active'
            and stay.check_in_at <= now
            and stay.token_expires_at > now
            and (not stay.check_out_at or stay.check_out_at > now)
            and self.code_version == stay.access_code_version
        )


class ServiceCategory(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='service_categories')
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    description = models.TextField(blank=True)
    icon_identifier = models.CharField(max_length=80, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['hotel', 'slug'], name='hotel_service_category_slug_unique')]
        ordering = ['display_order', 'name']


class HotelService(ValidatedSaveMixin, models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='services')
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name='services')
    public_identifier = models.CharField(max_length=36, unique=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=160)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    icon_identifier = models.CharField(max_length=80, blank=True)
    image = models.ImageField(upload_to='hotel_services/', blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(Decimal('0'))])
    availability = models.CharField(max_length=255, blank=True)
    estimated_completion_minutes = models.PositiveIntegerField(blank=True, null=True)
    allows_guest_note = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if self.category_id and self.category.hotel_id != self.hotel_id:
            raise ValidationError({'category': 'Category must belong to the same hotel.'})

    class Meta:
        ordering = ['display_order', 'name']
        indexes = [models.Index(fields=['hotel', 'is_active', 'display_order'])]


class ServiceRequest(ValidatedSaveMixin, models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('accepted', 'Accepted'), ('in_progress', 'In progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    hotel = models.ForeignKey(Hotel, on_delete=models.PROTECT, related_name='service_requests')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='service_requests')
    guest_stay = models.ForeignKey(GuestStay, on_delete=models.SET_NULL, related_name='service_requests', blank=True, null=True)
    service = models.ForeignKey(HotelService, on_delete=models.PROTECT, related_name='requests')
    public_identifier = models.CharField(max_length=36, unique=True, editable=False, default=uuid.uuid4)
    idempotency_key = models.CharField(max_length=64, blank=True, default='')
    idempotency_payload_hash = models.CharField(max_length=64, blank=True, default='')
    service_name_snapshot = models.CharField(max_length=160, blank=True)
    guest_note = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    assigned_staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='assigned_hotel_service_requests', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.room_id and self.room.hotel_id != self.hotel_id:
            raise ValidationError({'room': 'Room must belong to the same hotel.'})
        if self.service_id and self.service.hotel_id != self.hotel_id:
            raise ValidationError({'service': 'Service must belong to the same hotel.'})
        if self.guest_stay_id and self.guest_stay.hotel_id != self.hotel_id:
            raise ValidationError({'guest_stay': 'Guest stay must belong to the same hotel.'})

    class Meta:
        constraints = [models.UniqueConstraint(fields=['guest_stay', 'idempotency_key'], condition=Q(guest_stay__isnull=False, idempotency_key__gt=''), name='guest_service_request_idempotency_unique')]
        indexes = [models.Index(fields=['hotel', 'status', '-created_at'])]


class MenuCategory(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='menu_categories')
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['hotel', 'slug'], name='hotel_menu_category_slug_unique')]
        ordering = ['display_order', 'name']


class MenuItem(ValidatedSaveMixin, models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='menu_items')
    category = models.ForeignKey(MenuCategory, on_delete=models.PROTECT, related_name='items')
    public_identifier = models.CharField(max_length=36, unique=True, editable=False, default=uuid.uuid4)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='hotel_menu/', blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    is_vegetarian = models.BooleanField(default=False)
    dietary_info = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.category_id and self.category.hotel_id != self.hotel_id:
            raise ValidationError({'category': 'Category must belong to the same hotel.'})

    class Meta:
        indexes = [models.Index(fields=['hotel', 'is_available', 'display_order'])]


class HotelOrder(ValidatedSaveMixin, models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('confirmed', 'Confirmed'), ('preparing', 'Preparing'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')]
    hotel = models.ForeignKey(Hotel, on_delete=models.PROTECT, related_name='orders')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='orders')
    guest_stay = models.ForeignKey(GuestStay, on_delete=models.SET_NULL, related_name='orders', blank=True, null=True)
    order_number = models.CharField(max_length=40)
    idempotency_key = models.CharField(max_length=64, blank=True, default='')
    idempotency_payload_hash = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    guest_instructions = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))])
    service_charge = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))])
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))])
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0'))])
    ordered_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['hotel', 'order_number'], name='hotel_order_number_unique'), models.UniqueConstraint(fields=['guest_stay', 'idempotency_key'], condition=Q(guest_stay__isnull=False, idempotency_key__gt=''), name='guest_order_idempotency_unique')]
        indexes = [models.Index(fields=['hotel', 'status', '-ordered_at'])]

    def clean(self):
        super().clean()
        if self.room_id and self.room.hotel_id != self.hotel_id:
            raise ValidationError({'room': 'Room must belong to the same hotel.'})
        if self.guest_stay_id and self.guest_stay.hotel_id != self.hotel_id:
            raise ValidationError({'guest_stay': 'Guest stay must belong to the same hotel.'})


class HotelOrderItem(ValidatedSaveMixin, models.Model):
    order = models.ForeignKey(HotelOrder, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name='order_items')
    item_name_snapshot = models.CharField(max_length=160)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    instructions = models.TextField(blank=True)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])

    def clean(self):
        super().clean()
        if self.menu_item_id and self.order_id and self.menu_item.hotel_id != self.order.hotel_id:
            raise ValidationError({'menu_item': 'Menu item must belong to the same hotel as the order.'})


class HotelOffer(ValidatedSaveMixin, models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='offers')
    title = models.CharField(max_length=180)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='hotel_offers/', blank=True, null=True)
    button_label = models.CharField(max_length=80, blank=True)
    destination_url = models.URLField(blank=True)
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if self.starts_at and self.ends_at and self.ends_at < self.starts_at:
            raise ValidationError({'ends_at': 'Offer end must not precede its start.'})


class HotelLink(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='links')
    link_type = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    value = models.CharField(max_length=500)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['hotel', 'is_active', 'display_order'])]


class HotelTheme(models.Model):
    hotel = models.OneToOneField(Hotel, on_delete=models.CASCADE, related_name='theme')
    template_identifier = models.CharField(max_length=80, default='aurora')
    primary_color = models.CharField(max_length=20, default='#C9A84C')
    background_color = models.CharField(max_length=20, default='#F7F5F0')
    text_color = models.CharField(max_length=20, default='#1A1A2A')
    secondary_color = models.CharField(max_length=20, blank=True)
    heading_font = models.CharField(max_length=80, default='serif')
    body_font = models.CharField(max_length=80, default='sans')
    card_radius = models.PositiveIntegerField(default=16)
    button_radius = models.PositiveIntegerField(default=12)
    logo = models.ImageField(upload_to='hotel_theme_logos/', blank=True, null=True)
    hero_image = models.ImageField(upload_to='hotel_theme_heroes/', blank=True, null=True)


class NfcTouchpoint(ValidatedSaveMixin, models.Model):
    TYPE_CHOICES = [('reception', 'Reception'), ('room', 'Room'), ('table', 'Table'), ('general', 'General')]
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='touchpoints')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='touchpoints', blank=True, null=True)
    touchpoint_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    public_identifier = models.CharField(max_length=64, unique=True, editable=False)
    label = models.CharField(max_length=120)
    destination = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    last_tapped_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.public_identifier:
            self.public_identifier = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.room_id and self.room.hotel_id != self.hotel_id:
            raise ValidationError({'room': 'Room must belong to the same hotel.'})


class GuestReview(ValidatedSaveMixin, models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='guest_reviews')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, related_name='guest_reviews', blank=True, null=True)
    guest_stay = models.ForeignKey(GuestStay, on_delete=models.SET_NULL, related_name='reviews', blank=True, null=True)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)
    clicked_google_review = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()
        if self.room_id and self.room.hotel_id != self.hotel_id:
            raise ValidationError({'room': 'Room must belong to the same hotel.'})
        if self.guest_stay_id and self.guest_stay.hotel_id != self.hotel_id:
            raise ValidationError({'guest_stay': 'Guest stay must belong to the same hotel.'})


class AnalyticsEvent(ValidatedSaveMixin, models.Model):
    EVENT_TYPES = [('nfc_tap', 'NFC tap'), ('home_viewed', 'Home viewed'), ('menu_viewed', 'Menu viewed'), ('menu_item_viewed', 'Menu item viewed'), ('service_viewed', 'Service viewed'), ('service_request_submitted', 'Service request submitted'), ('order_submitted', 'Order submitted'), ('review_clicked', 'Review clicked'), ('google_review_opened', 'Google Review opened'), ('whatsapp_clicked', 'WhatsApp clicked'), ('call_clicked', 'Call clicked'), ('location_clicked', 'Location clicked')]
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='analytics_events')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, related_name='analytics_events', blank=True, null=True)
    guest_stay = models.ForeignKey(GuestStay, on_delete=models.SET_NULL, related_name='analytics_events', blank=True, null=True)
    touchpoint = models.ForeignKey(NfcTouchpoint, on_delete=models.SET_NULL, related_name='analytics_events', blank=True, null=True)
    event_type = models.CharField(max_length=40, choices=EVENT_TYPES)
    related_entity_type = models.CharField(max_length=40, blank=True)
    related_entity_id = models.PositiveBigIntegerField(blank=True, null=True)
    session_identifier = models.CharField(max_length=128, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    ALLOWED_METADATA_KEYS = {'screen', 'source', 'item_id', 'service_id', 'touchpoint_type'}

    def clean(self):
        super().clean()
        for field in ('room', 'guest_stay', 'touchpoint'):
            value = getattr(self, field, None)
            if value and value.hotel_id != self.hotel_id:
                raise ValidationError({field: 'Related record must belong to the same hotel.'})
        if not isinstance(self.metadata, dict) or len(self.metadata) > 20 or any(len(str(k)) > 60 for k in self.metadata) or any(str(k) not in self.ALLOWED_METADATA_KEYS for k in self.metadata):
            raise ValidationError({'metadata': 'Analytics metadata must be a small controlled object.'})
