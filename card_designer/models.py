import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .storage import private_card_media_storage
from .validators import validate_design_asset


CARD_WIDTH_MM = 90
CARD_HEIGHT_MM = 50


def private_asset_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    owner_key = f"user-{instance.owner_id}" if instance.owner_id else "global"
    return f"{owner_key}/{uuid.uuid4().hex}{extension}"


def template_thumbnail_upload_to(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"template-thumbnails/{instance.id}/{uuid.uuid4().hex}{extension}"


class CardAsset(models.Model):
    ASSET_TYPES = [
        ("profile_photo", "Profile photo"),
        ("company_logo", "Company logo"),
        ("school_logo", "School logo"),
        ("background", "Background"),
        ("signature", "Signature"),
        ("decoration", "Decorative image"),
        ("icon", "Custom icon"),
        ("brand", "Official brand asset"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="card_assets",
        blank=True,
        null=True,
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="uploaded_card_assets",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=160)
    asset_type = models.CharField(max_length=32, choices=ASSET_TYPES, default="decoration")
    file = models.FileField(
        storage=private_card_media_storage,
        upload_to=private_asset_upload_to,
        validators=[validate_design_asset],
    )
    mime_type = models.CharField(max_length=120, blank=True, default="")
    file_size = models.PositiveBigIntegerField(default=0)
    is_global = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        if self.is_global and self.owner_id:
            raise ValidationError("Global assets cannot have a private owner.")
        if not self.is_global and not self.owner_id:
            raise ValidationError("Private assets require an owner.")

    def can_access(self, user):
        return bool(
            self.is_global
            or (user.is_authenticated and self.owner_id == user.id)
            or (user.is_authenticated and user.is_superuser)
        )

    def __str__(self):
        return self.name


class CardTemplate(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_UNPUBLISHED = "unpublished"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_UNPUBLISHED, "Unpublished"),
        (STATUS_ARCHIVED, "Archived"),
    ]
    CATEGORY_CHOICES = [
        ("professional", "Professional"),
        ("corporate", "Corporate"),
        ("minimal", "Minimal"),
        ("creative", "Creative"),
        ("student", "Student"),
        ("teacher", "Teacher"),
        ("doctor", "Doctor"),
        ("engineer", "Engineer"),
        ("business", "Business"),
        ("school", "School"),
        ("premium", "Premium"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=140)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default="professional")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    front_data = models.JSONField(default=dict)
    back_data = models.JSONField(default=dict)
    supports_back = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    eligible_account_types = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=0)
    thumbnail = models.FileField(
        storage=private_card_media_storage,
        upload_to=template_thumbnail_upload_to,
        validators=[validate_design_asset],
        blank=True,
        null=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_card_templates",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_card_templates",
        blank=True,
        null=True,
    )
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-is_featured", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "card-template"
            candidate = base
            suffix = 2
            while CardTemplate.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate = f"{base}-{suffix}"
                suffix += 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def publish(self, user):
        self.version += 1
        self.status = self.STATUS_PUBLISHED
        self.published_at = timezone.now()
        self.updated_by = user
        self.save(
            update_fields=[
                "version",
                "status",
                "published_at",
                "updated_by",
                "updated_at",
            ]
        )
        CardTemplateVersion.objects.create(
            template=self,
            version=self.version,
            name=self.name,
            description=self.description,
            category=self.category,
            front_data=self.front_data,
            back_data=self.back_data,
            supports_back=self.supports_back,
            is_premium=self.is_premium,
            eligible_account_types=self.eligible_account_types,
            created_by=user,
        )

    def __str__(self):
        return self.name


class CardTemplateVersion(models.Model):
    template = models.ForeignKey(
        CardTemplate,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version = models.PositiveIntegerField()
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=32)
    front_data = models.JSONField(default=dict)
    back_data = models.JSONField(default=dict)
    supports_back = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    eligible_account_types = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="published_card_template_versions",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["template", "version"],
                name="unique_card_template_version",
            )
        ]


class CardDesign(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("ready", "Ready for review"),
        ("ordered", "Ordered"),
        ("archived", "Archived"),
    ]
    FINISH_CHOICES = [
        ("pvc", "PVC"),
        ("metal", "Metal"),
        ("wood", "Wood"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="card_designs",
    )
    name = models.CharField(max_length=140, default="Untitled card")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    finish = models.CharField(max_length=20, choices=FINISH_CHOICES, default="pvc")
    front_data = models.JSONField(default=dict)
    back_data = models.JSONField(default=dict)
    source_template = models.ForeignKey(
        CardTemplate,
        on_delete=models.SET_NULL,
        related_name="user_designs",
        blank=True,
        null=True,
    )
    source_template_version = models.PositiveIntegerField(blank=True, null=True)
    current_revision = models.PositiveIntegerField(default=0)
    last_saved_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def can_edit(self, user):
        return bool(user.is_authenticated and (self.owner_id == user.id or user.is_superuser))

    def create_revision(self, user=None, reason="manual"):
        self.current_revision += 1
        self.save(update_fields=["current_revision", "last_saved_at", "updated_at"])
        return CardDesignRevision.objects.create(
            design=self,
            version=self.current_revision,
            name=self.name,
            finish=self.finish,
            front_data=self.front_data,
            back_data=self.back_data,
            reason=reason,
            created_by=user,
        )

    def __str__(self):
        return self.name


class CardDesignRevision(models.Model):
    design = models.ForeignKey(
        CardDesign,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    version = models.PositiveIntegerField()
    name = models.CharField(max_length=140)
    finish = models.CharField(max_length=20)
    front_data = models.JSONField(default=dict)
    back_data = models.JSONField(default=dict)
    reason = models.CharField(max_length=32, default="manual")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="card_design_revisions",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["design", "version"],
                name="unique_card_design_revision",
            )
        ]

