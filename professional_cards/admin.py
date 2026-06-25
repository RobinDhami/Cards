from django.contrib import admin

from .models import (
    ProfessionalDocument,
    ProfessionalPortfolioItem,
    ProfessionalProfile,
    ProfessionalService,
    ProfessionalTestimonial,
)


class ProfessionalServiceInline(admin.TabularInline):
    model = ProfessionalService
    extra = 0


class ProfessionalPortfolioItemInline(admin.TabularInline):
    model = ProfessionalPortfolioItem
    extra = 0


class ProfessionalTestimonialInline(admin.TabularInline):
    model = ProfessionalTestimonial
    extra = 0


class ProfessionalDocumentInline(admin.TabularInline):
    model = ProfessionalDocument
    extra = 0


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'designation', 'company_name', 'is_active', 'is_verified', 'updated_at')
    list_filter = ('is_active', 'is_verified', 'template_name', 'industry')
    search_fields = ('full_name', 'company_name', 'designation', 'email', 'phone')
    prepopulated_fields = {'slug': ('full_name',)}
    inlines = [
        ProfessionalServiceInline,
        ProfessionalPortfolioItemInline,
        ProfessionalTestimonialInline,
        ProfessionalDocumentInline,
    ]


admin.site.register(ProfessionalService)
admin.site.register(ProfessionalPortfolioItem)
admin.site.register(ProfessionalTestimonial)
admin.site.register(ProfessionalDocument)
