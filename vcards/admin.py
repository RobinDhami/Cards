from django.contrib import admin
from .models import (
    Skill, College, StudentProfile, ClientProfile,
    Education, Achievement, Project, BlogPost, Certification,
    Language, Interest, Experience, Capability, Tool, Stat,
    Journey
)

admin.site.register(Skill)
admin.site.register(College)
admin.site.register(StudentProfile)
admin.site.register(ClientProfile)
admin.site.register(Education)
admin.site.register(Achievement)
admin.site.register(Project)
admin.site.register(BlogPost)
admin.site.register(Certification)
admin.site.register(Language)
admin.site.register(Interest)
admin.site.register(Experience)
admin.site.register(Capability)
admin.site.register(Tool)
admin.site.register(Stat)
admin.site.register(Journey)