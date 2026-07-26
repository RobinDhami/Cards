from django.contrib import admin

from .models import (
    Category,
    DeliverySetting,
    Order,
    OrderItem,
    PaymentSetting,
    Product,
    ProductImage,
    ProductOption,
    ProductOptionValue,
    ProductVariant,
    ShopCustomer,
    Store,
    StoreStaffMembership,
)


class StoreScopedAdmin(admin.ModelAdmin):
    list_filter = ('store',)
    search_fields = ('name',)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductOptionValueInline(admin.TabularInline):
    model = ProductOptionValue
    extra = 1


class ProductOptionInline(admin.TabularInline):
    model = ProductOption
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'product_sku', 'selected_variations', 'quantity', 'unit_price', 'line_total')


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'subscription_plan', 'subscription_status', 'is_active', 'is_published')
    list_filter = ('subscription_plan', 'subscription_status', 'is_active', 'is_published')
    search_fields = ('name', 'slug', 'email', 'phone', 'subdomain', 'custom_domain')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(StoreStaffMembership)
class StoreStaffMembershipAdmin(admin.ModelAdmin):
    list_display = ('store', 'user', 'is_active', 'can_manage_products', 'can_process_orders', 'can_view_reports')
    list_filter = ('store', 'is_active')
    search_fields = ('store__name', 'user__username', 'user__email')


@admin.register(Category)
class CategoryAdmin(StoreScopedAdmin):
    list_display = ('name', 'store', 'parent', 'display_order', 'is_active')
    list_filter = ('store', 'is_active')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(StoreScopedAdmin):
    list_display = ('name', 'store', 'category', 'regular_price', 'discounted_price', 'stock_quantity', 'status', 'is_featured')
    list_filter = ('store', 'status', 'is_featured', 'is_trending', 'is_new_arrival', 'is_best_seller')
    search_fields = ('name', 'sku', 'barcode', 'store__name')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductOptionInline]


@admin.register(ProductOption)
class ProductOptionAdmin(admin.ModelAdmin):
    list_display = ('name', 'product', 'display_order')
    search_fields = ('name', 'product__name', 'product__store__name')
    inlines = [ProductOptionValueInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'sku', 'price', 'stock_quantity', 'is_active')
    list_filter = ('product__store', 'is_active')
    search_fields = ('sku', 'product__name')


@admin.register(PaymentSetting)
class PaymentSettingAdmin(admin.ModelAdmin):
    list_display = ('store', 'enable_cash_on_delivery', 'enable_manual_qr', 'enable_bank_transfer')


@admin.register(DeliverySetting)
class DeliverySettingAdmin(admin.ModelAdmin):
    list_display = ('store', 'flat_delivery_charge', 'free_delivery_minimum', 'allow_store_pickup')


@admin.register(ShopCustomer)
class ShopCustomerAdmin(StoreScopedAdmin):
    list_display = ('full_name', 'store', 'phone', 'email')
    search_fields = ('full_name', 'phone', 'email', 'store__name')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'store', 'customer_name', 'status', 'payment_status', 'grand_total', 'created_at')
    list_filter = ('store', 'status', 'payment_status', 'payment_method')
    search_fields = ('order_number', 'customer_name', 'customer_phone', 'customer_email')
    readonly_fields = ('order_number', 'subtotal', 'discount_amount', 'delivery_charge', 'grand_total')
    inlines = [OrderItemInline]
