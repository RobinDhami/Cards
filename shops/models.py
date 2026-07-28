from decimal import Decimal

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Store(TimeStampedModel):
    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('business', 'Business'),
        ('premium', 'Premium'),
    ]
    SUBSCRIPTION_STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past due'),
        ('suspended', 'Suspended'),
        ('cancelled', 'Cancelled'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='owned_stores',
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=180, unique=True)
    logo = models.ImageField(upload_to='shops/logos/', blank=True, null=True)
    favicon = models.ImageField(upload_to='shops/favicons/', blank=True, null=True)
    description = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=40, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='Kathmandu')
    country = models.CharField(max_length=100, blank=True, default='Nepal')
    primary_color = models.CharField(max_length=20, default='#6d3df2')
    secondary_color = models.CharField(max_length=20, default='#11131a')
    selected_theme = models.CharField(max_length=80, default='urban')
    subdomain = models.CharField(max_length=120, blank=True, default='')
    custom_domain = models.CharField(max_length=180, blank=True, default='')
    subscription_plan = models.CharField(max_length=30, choices=PLAN_CHOICES, default='starter')
    subscription_status = models.CharField(
        max_length=30,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='trial',
    )
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    hero_title = models.CharField(max_length=180, default='Elevate Your Everyday Style')
    hero_subtitle = models.TextField(
        blank=True,
        default='Discover the latest trends in fashion, lifestyle and timeless accessories selected for everyday confidence.',
    )
    hero_label = models.CharField(max_length=120, default='New Collection 2026')
    hero_image = models.CharField(max_length=255, blank=True, default='shop/images/hero-model.jpg')
    promo_title = models.CharField(max_length=180, default='Get 20% Off On First Order')
    promo_code = models.CharField(max_length=40, default='WELCOME20')
    promo_image = models.CharField(max_length=255, blank=True, default='shop/images/promo-model.jpg')
    website_config = models.JSONField(
        blank=True,
        default=dict,
        help_text='React storefront section visibility, order, navigation, and presentation settings.',
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('shops:store_home', args=[self.slug])


class StoreStaffMembership(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='staff_memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shop_staff_memberships')
    can_manage_products = models.BooleanField(default=False)
    can_manage_inventory = models.BooleanField(default=False)
    can_process_orders = models.BooleanField(default=False)
    can_view_customers = models.BooleanField(default=False)
    can_print_invoices = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['store', 'user'], name='unique_store_staff_member')
        ]

    def __str__(self):
        return f'{self.user} staff for {self.store}'


class Category(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=140)
    slug = models.SlugField(max_length=160)
    image = models.CharField(max_length=255, blank=True, default='')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, related_name='children', blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'name']
        constraints = [
            models.UniqueConstraint(fields=['store', 'slug'], name='unique_category_slug_per_store')
        ]

    def __str__(self):
        return f'{self.name} - {self.store}'


class Product(TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name='products', blank=True, null=True)
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200)
    brand = models.CharField(max_length=120, blank=True, default='')
    short_description = models.CharField(max_length=255, blank=True, default='')
    full_description = models.TextField(blank=True, default='')
    regular_price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    sku = models.CharField(max_length=120, blank=True, default='')
    barcode = models.CharField(max_length=120, blank=True, default='')
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False)
    is_trending = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    image = models.CharField(max_length=255, blank=True, default='')
    video_url = models.URLField(blank=True, default='')
    weight = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    shipping_information = models.TextField(blank=True, default='')
    seo_title = models.CharField(max_length=180, blank=True, default='')
    seo_description = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-is_featured', 'name']
        constraints = [
            models.UniqueConstraint(fields=['store', 'slug'], name='unique_product_slug_per_store')
        ]

    def __str__(self):
        return f'{self.name} - {self.store}'

    @property
    def current_price(self):
        return self.discounted_price if self.discounted_price is not None else self.regular_price

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0

    def get_absolute_url(self):
        return reverse('shops:product_detail', args=[self.store.slug, self.slug])


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='shops/products/')
    alt_text = models.CharField(max_length=180, blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']


class ProductOption(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='options')
    name = models.CharField(max_length=80)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'name']

    def __str__(self):
        return f'{self.product} - {self.name}'


class ProductOptionValue(TimeStampedModel):
    option = models.ForeignKey(ProductOption, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=100)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'value']

    def __str__(self):
        return f'{self.option.name}: {self.value}'


class ProductVariant(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    option_values = models.ManyToManyField(ProductOptionValue, related_name='variants', blank=True)
    sku = models.CharField(max_length=120, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='shops/variants/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.sku or f'Variant for {self.product}'

    @property
    def current_price(self):
        return self.price if self.price is not None else self.product.current_price


class Discount(TimeStampedModel):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed amount'),
        ('free_delivery', 'Free delivery'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='discounts')
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=50)
    discount_type = models.CharField(
        max_length=30,
        choices=DISCOUNT_TYPE_CHOICES,
        default='percentage',
    )
    value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
    )
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    usage_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-is_active', '-created_at']
        constraints = [
            models.UniqueConstraint(fields=['store', 'code'], name='unique_discount_code_per_store')
        ]

    def __str__(self):
        return f'{self.code} - {self.store}'

    @property
    def status(self):
        now = timezone.now()
        if not self.is_active:
            return 'inactive'
        if self.starts_at and self.starts_at > now:
            return 'scheduled'
        if self.ends_at and self.ends_at < now:
            return 'expired'
        return 'active'


class PaymentSetting(TimeStampedModel):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='payment_settings')
    enable_cash_on_delivery = models.BooleanField(default=True)
    enable_manual_qr = models.BooleanField(default=False)
    enable_bank_transfer = models.BooleanField(default=False)
    qr_image = models.ImageField(upload_to='shops/payment_qr/', blank=True, null=True)
    bank_name = models.CharField(max_length=140, blank=True, default='')
    bank_account_name = models.CharField(max_length=140, blank=True, default='')
    bank_account_number = models.CharField(max_length=80, blank=True, default='')


class DeliverySetting(TimeStampedModel):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='delivery_settings')
    flat_delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('150.00'))
    free_delivery_minimum = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    inside_valley_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    outside_valley_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    allow_store_pickup = models.BooleanField(default=False)

    def delivery_charge_for(self, subtotal):
        if self.free_delivery_minimum and subtotal >= self.free_delivery_minimum:
            return Decimal('0.00')
        return self.flat_delivery_charge


class ShopCustomer(TimeStampedModel):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='customers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True)
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40)
    email = models.EmailField(blank=True, default='')

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} - {self.store}'


class Order(TimeStampedModel):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('ready_to_ship', 'Ready to Ship'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('pending_verification', 'Pending Verification'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('manual_qr', 'Manual QR Payment'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='orders')
    customer = models.ForeignKey(ShopCustomer, on_delete=models.SET_NULL, related_name='orders', blank=True, null=True)
    order_number = models.CharField(max_length=40, unique=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='new')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='cod')
    customer_name = models.CharField(max_length=160)
    customer_phone = models.CharField(max_length=40)
    customer_email = models.EmailField(blank=True, default='')
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    area = models.CharField(max_length=120)
    detailed_address = models.TextField()
    delivery_instructions = models.TextField(blank=True, default='')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    transaction_reference = models.CharField(max_length=120, blank=True, default='')
    payment_screenshot = models.ImageField(upload_to='shops/payment_screenshots/', blank=True, null=True)
    internal_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            today = timezone.localdate().strftime('%Y%m%d')
            slug_part = slugify(self.store.slug)[:8].upper() or 'SHOP'
            count = Order.objects.filter(store=self.store, created_at__date=timezone.localdate()).count() + 1
            self.order_number = f'{slug_part}-{today}-{count:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, blank=True, null=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, blank=True, null=True)
    product_name = models.CharField(max_length=180)
    product_sku = models.CharField(max_length=120, blank=True, default='')
    selected_variations = models.JSONField(blank=True, default=dict)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'
