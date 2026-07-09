from django.contrib import admin
from .models import (
    Skill, College, StudentProfile, ProfileActivity,
    StudentCard,
)

admin.site.register(Skill)
admin.site.register(College)
admin.site.register(StudentProfile)
admin.site.register(ProfileActivity)
admin.site.register(StudentCard)
