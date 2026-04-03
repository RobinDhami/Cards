from django.db import models
from django.contrib.auth.hashers import make_password

# Skill
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.name

# College
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

# Abstract Base Profile
class BaseProfile(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    bio = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='cover_photos/', blank=True, null=True)
    skills = models.ManyToManyField(Skill, blank=True)
    cv = models.FileField(upload_to='cvs/', blank=True, null=True)
    show_portfolio = models.BooleanField(default=True)
    show_contact_card = models.BooleanField(default=True)
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

# Student Profile
class StudentProfile(BaseProfile):
    PROFILE_CATEGORY_CHOICES = [
        ('school', 'School / College Profile'),
        ('professional', 'Independent Professional'),
    ]

    college = models.ForeignKey(College, on_delete=models.SET_NULL, related_name='students', blank=True, null=True)
    profile_category = models.CharField(max_length=20, choices=PROFILE_CATEGORY_CHOICES, default='school')
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    about_intro = models.TextField(blank=True, null=True)
    about_featured = models.TextField(blank=True, null=True)
    about_current = models.TextField(blank=True, null=True)
    social_stack = models.CharField(max_length=255, blank=True, default="")  # e.g. "linkedin,instagram,github"

    USER_TYPE_CHOICES = [
        ('general', 'General'),
        ('vip', 'VIP'),
        ('premium', 'Premium'),
    ]
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='general')
    contact_template = models.CharField(max_length=50, default='contact.html')
    portfolio_template = models.CharField(max_length=50, default='portfolio1.html')
    print_template = models.CharField(max_length=50, default='print_classic.html')
    print_custom_note = models.TextField(blank=True, default='')
    def __str__(self):
        if self.college:
            return f"{self.name} - {self.college.name}"
        if self.organization_name:
            return f"{self.name} - {self.organization_name}"
        return self.name


class ProfileActivity(models.Model):
    EVENT_TYPE_CHOICES = [
        ('view', 'Card View'),
        ('download', 'vCard Download'),
        ('contact', 'Contact Action'),
    ]

    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='activities')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    action = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.name} - {self.event_type} ({self.action or 'n/a'})"

# Client Profile
class ClientProfile(BaseProfile):
    company_name = models.CharField(max_length=255, blank=True, null=True)
    def __str__(self):
        return self.name

# Education
class Education(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='educations')
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    major = models.CharField(max_length=255, blank=True, null=True)
    start_year = models.CharField(max_length=10)
    end_year = models.CharField(max_length=10)
    gpa = models.CharField(max_length=10, blank=True, null=True)
    honors = models.CharField(max_length=255, blank=True, null=True)
    coursework = models.TextField(blank=True, null=True)

# Achievement
class Achievement(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    year = models.CharField(max_length=10)

# Project
class Project(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255)
    description = models.TextField()
    year = models.CharField(max_length=10)
    tags = models.CharField(max_length=255, blank=True)
    url = models.URLField(blank=True, null=True)
    image = models.ImageField(upload_to='project_images/', blank=True, null=True)

# BlogPost
class BlogPost(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='blog_posts')
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    excerpt = models.TextField(blank=True)
    content = models.TextField()
    date = models.DateField()
    read_time = models.CharField(max_length=20, blank=True)
    image = models.ImageField(upload_to='blog_images/', blank=True, null=True)
    def __str__(self):
        return self.title

# Certification
class Certification(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=255)
    organization = models.CharField(max_length=255, blank=True)
    year = models.CharField(max_length=10, blank=True)
    description = models.TextField(blank=True)
    def __str__(self):
        return self.title

# Language
class Language(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='languages')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50, blank=True)
    def __str__(self):
        return f"{self.name} ({self.level})"

# Interest
class Interest(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='interests')
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

# Experience
class Experience(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='experiences')
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.CharField(max_length=20)
    end_date = models.CharField(max_length=20, blank=True)
    responsibilities = models.TextField(blank=True)  # Each line is a bullet point

# Capability (for About section)
class Capability(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='capabilities')
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

# Tool (for About section)
class Tool(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='tools')
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

# Stat (for About section)
class Stat(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='stats')
    label = models.CharField(max_length=100)
    value = models.CharField(max_length=50)
    def __str__(self):
        return f"{self.label}: {self.value}"

# Journey (for Timeline section)
class Journey(models.Model):
    student = models.ForeignKey('StudentProfile', on_delete=models.CASCADE, related_name='journeys')
    year = models.CharField(max_length=10)
    title = models.CharField(max_length=255)
    scope = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)
    def __str__(self):
        return f"{self.year} - {self.title}"

# HeroSection (for Hero headline/subheadline)
class HeroSection(models.Model):
    student = models.OneToOneField('StudentProfile', on_delete=models.CASCADE, related_name='hero_section')
    headline = models.CharField(max_length=255)
    subheadline = models.CharField(max_length=255, blank=True)
    def __str__(self):
        return f"Hero for {self.student.name}"
