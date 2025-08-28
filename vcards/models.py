from django.db import models
from django.contrib.auth.hashers import make_password

# -------------------------
# Skill model
# -------------------------
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

# -------------------------
# College model
# -------------------------
class College(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slogan = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to='college_logos/', blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# -------------------------
# Abstract Base Profile
# -------------------------
class BaseProfile(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    bio = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)  # store hashed version
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='cover_photos/', blank=True, null=True)
    skills = models.ManyToManyField(Skill, blank=True)

    # New CV field added here:
    cv = models.FileField(upload_to='cvs/', blank=True, null=True)

    # Show/hide toggles
    show_portfolio = models.BooleanField(default=True)
    show_contact_card = models.BooleanField(default=True)

    # Social media links
    facebook = models.URLField(blank=True, null=True)
    messenger= models.URLField(blank=True, null=True)
    whatsapp = models.CharField(max_length=20,null=True)
    instagram = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    figma = models.URLField(blank=True, null=True)
    upwork = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    # Analytics
    views = models.PositiveIntegerField(default=0)
    contact_clicks = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.password and not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    class Meta:
        abstract = True

# -------------------------
# Student Profile (College)
# -------------------------
class StudentProfile(BaseProfile):
    college = models.ForeignKey(College, on_delete=models.CASCADE, related_name='students')
    about_intro = models.TextField(blank=True, null=True)
    about_featured = models.TextField(blank=True, null=True)
    about_current = models.TextField(blank=True, null=True)
    # Capabilities, tools, stats: related via Capability, Tool, Stat models above

    def __str__(self):
        return f"{self.name} - {self.college.name}"

# -------------------------
# Client Profile (Normal User)
# -------------------------
class ClientProfile(BaseProfile):
    company_name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name
class Education(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='educations')
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    major = models.CharField(max_length=255, blank=True, null=True)
    start_year = models.CharField(max_length=10)
    end_year = models.CharField(max_length=10)
    gpa = models.CharField(max_length=10, blank=True, null=True)
    honors = models.CharField(max_length=255, blank=True, null=True)
    coursework = models.TextField(blank=True, null=True)  # Comma-separated list

class Achievement(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    year = models.CharField(max_length=10)

class Project(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255)
    description = models.TextField()
    year = models.CharField(max_length=10)
    tags = models.CharField(max_length=255, blank=True)

class BlogPost(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='blog_posts')
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    excerpt = models.TextField()
    content = models.TextField()
    date = models.DateField()
    read_time = models.CharField(max_length=20)

class Certification(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=255)
    organization = models.CharField(max_length=255)
    year = models.CharField(max_length=10)

class Language(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='languages')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50)  # e.g. "Native", "Fluent", "Intermediate"

class Interest(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='interests')
    name = models.CharField(max_length=100)


class Experience(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='experiences')
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.CharField(max_length=20)
    end_date = models.CharField(max_length=20, blank=True)
    responsibilities = models.TextField(blank=True)  # Each line is a bullet point

class Capability(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='capabilities')
    name = models.CharField(max_length=100)

class Tool(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='tools')
    name = models.CharField(max_length=100)

class Stat(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='stats')
    label = models.CharField(max_length=100)
    value = models.CharField(max_length=50)