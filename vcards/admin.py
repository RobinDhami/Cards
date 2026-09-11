from django.contrib import admin
from .models import (
    Skill, College, StudentProfile, ProfileActivity,
    StudentCard,
    CardBatch,
    CardBatchCard,
)

admin.site.register(Skill)
admin.site.register(College)
admin.site.register(StudentProfile)
admin.site.register(ProfileActivity)
admin.site.register(StudentCard)
admin.site.register(CardBatch)
admin.site.register(CardBatchCard)
