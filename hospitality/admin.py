from django.contrib import admin

from .models import VenueFeedback, VenueLink, VenueMenuCategory, VenueMenuItem, VenueProfile


@admin.register(VenueProfile)
class VenueProfileAdmin(admin.ModelAdmin):
    list_display = ('organization', 'venue_type', 'is_active', 'feedback_enabled', 'updated_at')
    search_fields = ('organization__name', 'public_identifier')
    list_filter = ('venue_type', 'is_active', 'feedback_enabled')


@admin.register(VenueMenuCategory)
class VenueMenuCategoryAdmin(admin.ModelAdmin):
    list_display = ('venue', 'name', 'display_order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('venue__organization__name', 'name')


@admin.register(VenueMenuItem)
class VenueMenuItemAdmin(admin.ModelAdmin):
    list_display = ('venue', 'name', 'category', 'price', 'is_available', 'is_today_special')
    list_filter = ('is_available', 'is_today_special', 'is_vegetarian')
    search_fields = ('venue__organization__name', 'name')


@admin.register(VenueLink)
class VenueLinkAdmin(admin.ModelAdmin):
    list_display = ('venue', 'link_type', 'label', 'is_active', 'display_order')
    list_filter = ('link_type', 'is_active')


@admin.register(VenueFeedback)
class VenueFeedbackAdmin(admin.ModelAdmin):
    list_display = ('venue', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating')
    readonly_fields = ('rate_limit_hash', 'created_at')
