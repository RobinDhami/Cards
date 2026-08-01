from django.contrib import admin

from .models import (
    CardAsset,
    CardDesign,
    CardDesignRevision,
    CardTemplate,
    CardTemplateVersion,
)


@admin.register(CardTemplate)
class CardTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "status",
        "version",
        "is_featured",
        "is_premium",
        "sort_order",
        "updated_at",
    )
    list_filter = ("status", "category", "is_featured", "is_premium")
    search_fields = ("name", "description")
    ordering = ("sort_order", "name")


@admin.register(CardDesign)
class CardDesignAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "status", "finish", "current_revision", "updated_at")
    list_filter = ("status", "finish")
    search_fields = ("name", "owner__username", "owner__email")
    raw_id_fields = ("owner", "source_template")


@admin.register(CardAsset)
class CardAssetAdmin(admin.ModelAdmin):
    list_display = ("name", "asset_type", "owner", "is_global", "file_size", "created_at")
    list_filter = ("asset_type", "is_global")
    search_fields = ("name", "owner__username")
    raw_id_fields = ("owner", "uploaded_by")


admin.site.register(CardTemplateVersion)
admin.site.register(CardDesignRevision)

