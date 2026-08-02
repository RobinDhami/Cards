import json
import mimetypes
from copy import deepcopy

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import FileResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from professional_cards.models import ProfessionalProfile
from vcards.models import StudentProfile
from vcards.views import _get_user_role

from .models import (
    CARD_HEIGHT_MM,
    CARD_WIDTH_MM,
    CardAsset,
    CardDesign,
    CardTemplate,
)


MAX_DOCUMENT_ELEMENTS = 400
ALLOWED_ELEMENT_TYPES = {"text", "shape", "image", "qr", "line", "group", "icon", "decoration"}


def _error(message, status=400, errors=None):
    payload = {"ok": False, "message": message}
    if errors:
        payload["errors"] = errors
    return JsonResponse(payload, status=status)


def _json_body(request):
    try:
        return json.loads(request.body or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def _require_login(request):
    if not request.user.is_authenticated:
        return _error("Please sign in to save designs and uploads.", status=401)
    return None


def _require_superuser(request):
    login_error = _require_login(request)
    if login_error:
        return login_error
    if not request.user.is_superuser:
        return _error("Only a Super Admin can manage global templates.", status=403)
    return None


def _file_url(value):
    if not value:
        return ""
    try:
        return value.url
    except (AttributeError, ValueError):
        return ""


def _profile_fields(request):
    sample = {
        "full_name": "Aarav Sharma",
        "job_title": "Founder",
        "company": "Tap2Connect Nepal",
        "phone": "+977 980-1234567",
        "email": "hello@tap2connectnepal.com",
        "website": "https://tap2connectnepal.com",
        "address": "Kathmandu, Nepal",
        "connection_id": "T2C-00001",
        "social_username": "@tap2connect",
        "profile_photo": "",
        "company_logo": "/static/branding/tap2connect-logo.png",
        "qr_code": "https://tap2connectnepal.com",
    }
    if not request.user.is_authenticated:
        return sample

    professional = (
        ProfessionalProfile.objects.filter(owner=request.user, is_active=True)
        .order_by("-updated_at")
        .first()
    )
    if professional:
        return {
            "full_name": professional.full_name or request.user.get_full_name() or request.user.username,
            "job_title": professional.designation or professional.profession or professional.work_role,
            "company": professional.company_name or professional.work_organization,
            "phone": professional.phone,
            "email": professional.email or request.user.email,
            "website": professional.website,
            "address": professional.office_address or professional.work_address,
            "connection_id": professional.profile_identifier or str(professional.id),
            "social_username": professional.linkedin or professional.instagram,
            "profile_photo": _file_url(professional.profile_photo),
            "company_logo": _file_url(
                professional.organization_logo or professional.personal_logo
            ),
            "qr_code": request.build_absolute_uri(professional.public_url_path),
        }

    student = StudentProfile.objects.filter(auth_user=request.user).select_related("college").first()
    if student:
        company = student.organization_name or (student.college.name if student.college else "")
        company_logo = _file_url(student.college.logo) if student.college else ""
        return {
            "full_name": student.name or request.user.get_full_name() or request.user.username,
            "job_title": student.role or student.get_member_type_display(),
            "company": company,
            "phone": student.phone,
            "email": student.email or request.user.email,
            "website": student.website or (student.college.website if student.college else ""),
            "address": student.address or (student.college.address if student.college else ""),
            "connection_id": student.unique_identifier or str(student.id),
            "social_username": student.linkedin or student.instagram,
            "profile_photo": _file_url(student.profile_photo),
            "company_logo": company_logo,
            "qr_code": request.build_absolute_uri(student.profile_url),
        }

    sample["full_name"] = request.user.get_full_name().strip() or request.user.username
    sample["email"] = request.user.email
    sample["connection_id"] = f"T2C-{request.user.id:05d}"
    return sample


def _account_type(request):
    if not request.user.is_authenticated:
        return "public"
    return _get_user_role(request.user)


def _template_allowed(template, account_type):
    allowed = template.eligible_account_types or []
    return not allowed or "all" in allowed or account_type in allowed


def _validate_document(value, label):
    if not isinstance(value, dict):
        raise ValidationError(f"{label} must be a design document.")
    elements = value.get("elements", [])
    if not isinstance(elements, list):
        raise ValidationError(f"{label} elements must be a list.")
    if len(elements) > MAX_DOCUMENT_ELEMENTS:
        raise ValidationError(f"{label} has too many elements.")

    seen_ids = set()
    for index, element in enumerate(elements):
        if not isinstance(element, dict):
            raise ValidationError(f"{label} element {index + 1} is not valid.")
        element_id = str(element.get("id") or "").strip()
        if not element_id or element_id in seen_ids:
            raise ValidationError(f"{label} elements require unique IDs.")
        seen_ids.add(element_id)
        if element.get("type") not in ALLOWED_ELEMENT_TYPES:
            raise ValidationError(f"{label} element {element_id} has an unsupported type.")
        for field in ("x", "y", "width", "height", "rotation", "opacity"):
            if field in element and not isinstance(element[field], (int, float)):
                raise ValidationError(f"{label} element {element_id} has an invalid {field}.")
    return value


def _serialize_asset(asset):
    return {
        "id": str(asset.id),
        "name": asset.name,
        "assetType": asset.asset_type,
        "mimeType": asset.mime_type,
        "fileSize": asset.file_size,
        "isGlobal": asset.is_global,
        "url": f"/api/card-designer/assets/{asset.id}/file/",
        "createdAt": asset.created_at.isoformat(),
    }


def _serialize_template(template, include_document=True):
    payload = {
        "id": str(template.id),
        "name": template.name,
        "slug": template.slug,
        "description": template.description,
        "category": template.category,
        "status": template.status,
        "supportsBack": template.supports_back,
        "isFeatured": template.is_featured,
        "isPremium": template.is_premium,
        "eligibleAccountTypes": template.eligible_account_types,
        "sortOrder": template.sort_order,
        "version": template.version,
        "thumbnailUrl": (
            f"/api/card-designer/templates/{template.id}/thumbnail/"
            if template.thumbnail
            else ""
        ),
        "publishedAt": template.published_at.isoformat() if template.published_at else None,
        "updatedAt": template.updated_at.isoformat(),
    }
    if include_document:
        payload["frontData"] = template.front_data
        payload["backData"] = template.back_data
    return payload


def _serialize_design(design, include_document=True):
    payload = {
        "id": str(design.id),
        "name": design.name,
        "status": design.status,
        "finish": design.finish,
        "currentRevision": design.current_revision,
        "sourceTemplateId": str(design.source_template_id) if design.source_template_id else None,
        "sourceTemplateVersion": design.source_template_version,
        "lastSavedAt": design.last_saved_at.isoformat(),
        "updatedAt": design.updated_at.isoformat(),
        "createdAt": design.created_at.isoformat(),
    }
    if include_document:
        payload["frontData"] = design.front_data
        payload["backData"] = design.back_data
    return payload


@require_http_methods(["GET"])
def bootstrap(request):
    account_type = _account_type(request)
    templates = CardTemplate.objects.filter(status=CardTemplate.STATUS_PUBLISHED)
    templates = [
        template
        for template in templates
        if _template_allowed(template, account_type)
    ]
    if request.user.is_authenticated:
        assets = CardAsset.objects.filter(is_global=True) | CardAsset.objects.filter(
            owner=request.user,
            is_global=False,
        )
        designs = CardDesign.objects.filter(owner=request.user)[:20]
    else:
        assets = CardAsset.objects.filter(is_global=True)
        designs = []

    return JsonResponse(
        {
            "ok": True,
            "authenticated": request.user.is_authenticated,
            "isSuperuser": bool(request.user.is_authenticated and request.user.is_superuser),
            "accountType": account_type,
            "profileFields": _profile_fields(request),
            "templates": [_serialize_template(template) for template in templates],
            "designs": [_serialize_design(design, include_document=False) for design in designs],
            "assets": [_serialize_asset(asset) for asset in assets.distinct()],
            "brandAssets": [
                {
                    "id": "t2c-primary-logo",
                    "name": "Tap2Connect primary logo",
                    "assetType": "brand",
                    "isGlobal": True,
                    "url": "/static/branding/tap2connect-logo.png",
                }
            ],
            "card": {
                "widthMm": CARD_WIDTH_MM,
                "heightMm": CARD_HEIGHT_MM,
                "bleedMm": 2,
                "safeMarginMm": 3,
            },
            "templateCategories": [
                {"value": value, "label": label}
                for value, label in CardTemplate.CATEGORY_CHOICES
            ],
            "assetTypes": [
                {"value": value, "label": label}
                for value, label in CardAsset.ASSET_TYPES
            ],
        }
    )


@require_http_methods(["GET", "POST"])
def designs(request):
    login_error = _require_login(request)
    if login_error:
        return login_error

    if request.method == "GET":
        queryset = CardDesign.objects.filter(owner=request.user)
        return JsonResponse(
            {
                "ok": True,
                "designs": [
                    _serialize_design(design, include_document=False)
                    for design in queryset
                ],
            }
        )

    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON payload.")
    try:
        front_data = _validate_document(payload.get("frontData") or {}, "Front")
        back_data = _validate_document(payload.get("backData") or {}, "Back")
    except ValidationError as exc:
        return _error(exc.message)

    source_template = None
    source_template_version = None
    source_template_id = payload.get("sourceTemplateId")
    if source_template_id:
        source_template = get_object_or_404(
            CardTemplate,
            pk=source_template_id,
            status=CardTemplate.STATUS_PUBLISHED,
        )
        if not _template_allowed(source_template, _account_type(request)):
            return _error("This template is not available for your account.", status=403)
        source_template_version = source_template.version

    design = CardDesign.objects.create(
        owner=request.user,
        name=str(payload.get("name") or "Untitled card").strip()[:140],
        finish=str(payload.get("finish") or "pvc"),
        front_data=front_data,
        back_data=back_data,
        source_template=source_template,
        source_template_version=source_template_version,
    )
    design.create_revision(request.user, reason="created")
    return JsonResponse({"ok": True, "design": _serialize_design(design)}, status=201)


@require_http_methods(["GET", "PATCH", "POST", "DELETE"])
def design_detail(request, design_id):
    login_error = _require_login(request)
    if login_error:
        return login_error
    design = get_object_or_404(CardDesign, pk=design_id)
    if not design.can_edit(request.user):
        return _error("You can only edit your own designs.", status=403)

    if request.method == "GET":
        return JsonResponse({"ok": True, "design": _serialize_design(design)})

    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON payload.")

    if request.method == "DELETE":
        if not payload.get("confirm"):
            return _error("Confirm before deleting this design.")
        design.delete()
        return JsonResponse({"ok": True})

    if request.method == "POST" and payload.get("action") == "duplicate":
        duplicate = CardDesign.objects.create(
            owner=request.user,
            name=f"{design.name} copy"[:140],
            status="draft",
            finish=design.finish,
            front_data=deepcopy(design.front_data),
            back_data=deepcopy(design.back_data),
            source_template=design.source_template,
            source_template_version=design.source_template_version,
        )
        duplicate.create_revision(request.user, reason="duplicated")
        return JsonResponse(
            {"ok": True, "design": _serialize_design(duplicate)},
            status=201,
        )
    if request.method == "POST":
        return _error("Unsupported design action.")

    try:
        if "frontData" in payload:
            design.front_data = _validate_document(payload["frontData"], "Front")
        if "backData" in payload:
            design.back_data = _validate_document(payload["backData"], "Back")
    except ValidationError as exc:
        return _error(exc.message)

    if "name" in payload:
        design.name = str(payload["name"] or "Untitled card").strip()[:140]
    if payload.get("finish") in dict(CardDesign.FINISH_CHOICES):
        design.finish = payload["finish"]
    if payload.get("status") in dict(CardDesign.STATUS_CHOICES):
        design.status = payload["status"]
    design.save()
    if payload.get("createRevision"):
        design.create_revision(request.user, reason=str(payload.get("reason") or "manual")[:32])
    return JsonResponse({"ok": True, "design": _serialize_design(design)})


@require_http_methods(["GET"])
def design_revisions(request, design_id):
    login_error = _require_login(request)
    if login_error:
        return login_error
    design = get_object_or_404(CardDesign, pk=design_id)
    if not design.can_edit(request.user):
        return _error("You can only view your own design history.", status=403)
    return JsonResponse(
        {
            "ok": True,
            "revisions": [
                {
                    "version": revision.version,
                    "name": revision.name,
                    "reason": revision.reason,
                    "createdAt": revision.created_at.isoformat(),
                }
                for revision in design.revisions.all()
            ],
        }
    )


@require_http_methods(["POST"])
def restore_design_revision(request, design_id, version):
    login_error = _require_login(request)
    if login_error:
        return login_error
    design = get_object_or_404(CardDesign, pk=design_id)
    if not design.can_edit(request.user):
        return _error("You can only restore your own designs.", status=403)
    payload = _json_body(request) or {}
    if not payload.get("confirm"):
        return _error("Confirm before restoring a previous version.")
    revision = get_object_or_404(design.revisions, version=version)
    design.name = revision.name
    design.finish = revision.finish
    design.front_data = deepcopy(revision.front_data)
    design.back_data = deepcopy(revision.back_data)
    design.save()
    design.create_revision(request.user, reason="restored")
    return JsonResponse({"ok": True, "design": _serialize_design(design)})


@require_http_methods(["GET", "POST"])
def assets(request):
    if request.method == "GET":
        if request.user.is_authenticated:
            queryset = CardAsset.objects.filter(is_global=True) | CardAsset.objects.filter(
                owner=request.user,
                is_global=False,
            )
        else:
            queryset = CardAsset.objects.filter(is_global=True)
        return JsonResponse(
            {
                "ok": True,
                "assets": [_serialize_asset(asset) for asset in queryset.distinct()],
            }
        )

    login_error = _require_login(request)
    if login_error:
        return login_error
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return _error("Choose an image to upload.")
    is_global = str(request.POST.get("isGlobal") or "").lower() == "true"
    if is_global and not request.user.is_superuser:
        return _error("Only a Super Admin can add global assets.", status=403)

    asset = CardAsset(
        owner=None if is_global else request.user,
        uploaded_by=request.user,
        name=str(request.POST.get("name") or uploaded_file.name).strip()[:160],
        asset_type=str(request.POST.get("assetType") or "decoration"),
        file=uploaded_file,
        mime_type=str(getattr(uploaded_file, "content_type", "") or ""),
        file_size=uploaded_file.size,
        is_global=is_global,
    )
    try:
        asset.full_clean()
        asset.save()
    except ValidationError as exc:
        return _error("Upload failed.", errors={"file": exc.messages})
    return JsonResponse({"ok": True, "asset": _serialize_asset(asset)}, status=201)


@require_http_methods(["DELETE"])
def asset_detail(request, asset_id):
    login_error = _require_login(request)
    if login_error:
        return login_error
    asset = get_object_or_404(CardAsset, pk=asset_id)
    if not (
        asset.owner_id == request.user.id
        or (request.user.is_superuser and asset.is_global)
    ):
        return _error("You cannot delete this asset.", status=403)
    payload = _json_body(request) or {}
    if not payload.get("confirm"):
        return _error("Confirm before deleting this asset.")
    asset.file.delete(save=False)
    asset.delete()
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
def asset_file(request, asset_id):
    asset = get_object_or_404(CardAsset, pk=asset_id)
    if not asset.can_access(request.user):
        return _error("This asset is private.", status=403)
    content_type = asset.mime_type or mimetypes.guess_type(asset.file.name)[0] or "application/octet-stream"
    response = FileResponse(asset.file.open("rb"), content_type=content_type)
    response["Content-Disposition"] = f'inline; filename="{asset.name}"'
    response["Cache-Control"] = "private, max-age=3600" if not asset.is_global else "public, max-age=86400"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@require_http_methods(["GET", "POST"])
def templates(request):
    if request.method == "GET":
        manage = request.GET.get("manage") == "1"
        if manage:
            admin_error = _require_superuser(request)
            if admin_error:
                return admin_error
            queryset = CardTemplate.objects.all()
        else:
            account_type = _account_type(request)
            queryset = [
                template
                for template in CardTemplate.objects.filter(
                    status=CardTemplate.STATUS_PUBLISHED
                )
                if _template_allowed(template, account_type)
            ]
        return JsonResponse(
            {
                "ok": True,
                "templates": [_serialize_template(template) for template in queryset],
            }
        )

    admin_error = _require_superuser(request)
    if admin_error:
        return admin_error
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON payload.")
    try:
        front_data = _validate_document(payload.get("frontData") or {}, "Front")
        back_data = _validate_document(payload.get("backData") or {}, "Back")
    except ValidationError as exc:
        return _error(exc.message)
    template = CardTemplate.objects.create(
        name=str(payload.get("name") or "Untitled template").strip()[:140],
        description=str(payload.get("description") or ""),
        category=str(payload.get("category") or "professional"),
        front_data=front_data,
        back_data=back_data,
        supports_back=bool(payload.get("supportsBack", True)),
        is_featured=bool(payload.get("isFeatured")),
        is_premium=bool(payload.get("isPremium")),
        eligible_account_types=payload.get("eligibleAccountTypes") or [],
        sort_order=max(0, int(payload.get("sortOrder") or 0)),
        created_by=request.user,
        updated_by=request.user,
    )
    return JsonResponse({"ok": True, "template": _serialize_template(template)}, status=201)


@require_http_methods(["GET", "PATCH", "POST", "DELETE"])
def template_detail(request, template_id):
    template = get_object_or_404(CardTemplate, pk=template_id)
    if request.method == "GET":
        if (
            template.status != CardTemplate.STATUS_PUBLISHED
            and not (request.user.is_authenticated and request.user.is_superuser)
        ):
            return _error("This template is not published.", status=404)
        return JsonResponse({"ok": True, "template": _serialize_template(template)})

    admin_error = _require_superuser(request)
    if admin_error:
        return admin_error
    payload = _json_body(request)
    if payload is None:
        return _error("Invalid JSON payload.")

    if request.method == "DELETE":
        if not payload.get("confirm"):
            return _error("Confirm before deleting this template.")
        template.delete()
        return JsonResponse({"ok": True})

    if request.method == "POST":
        action = payload.get("action")
        if action == "duplicate":
            duplicate = CardTemplate.objects.create(
                name=f"{template.name} copy"[:140],
                description=template.description,
                category=template.category,
                front_data=deepcopy(template.front_data),
                back_data=deepcopy(template.back_data),
                supports_back=template.supports_back,
                is_featured=False,
                is_premium=template.is_premium,
                eligible_account_types=deepcopy(template.eligible_account_types),
                sort_order=template.sort_order + 1,
                created_by=request.user,
                updated_by=request.user,
            )
            return JsonResponse(
                {"ok": True, "template": _serialize_template(duplicate)},
                status=201,
            )
        if action in {"publish", "unpublish", "archive"} and not payload.get("confirm"):
            return _error(f"Confirm before you {action} this template.")
        if action == "publish":
            template.publish(request.user)
        elif action == "unpublish":
            template.status = CardTemplate.STATUS_UNPUBLISHED
            template.updated_by = request.user
            template.save(update_fields=["status", "updated_by", "updated_at"])
        elif action == "archive":
            template.status = CardTemplate.STATUS_ARCHIVED
            template.updated_by = request.user
            template.save(update_fields=["status", "updated_by", "updated_at"])
        else:
            return _error("Unsupported template action.")
        return JsonResponse({"ok": True, "template": _serialize_template(template)})

    try:
        if "frontData" in payload:
            template.front_data = _validate_document(payload["frontData"], "Front")
        if "backData" in payload:
            template.back_data = _validate_document(payload["backData"], "Back")
    except ValidationError as exc:
        return _error(exc.message)
    for json_key, field in (
        ("name", "name"),
        ("description", "description"),
        ("category", "category"),
        ("supportsBack", "supports_back"),
        ("isFeatured", "is_featured"),
        ("isPremium", "is_premium"),
        ("eligibleAccountTypes", "eligible_account_types"),
        ("sortOrder", "sort_order"),
    ):
        if json_key in payload:
            setattr(template, field, payload[json_key])
    template.updated_by = request.user
    template.save()
    return JsonResponse({"ok": True, "template": _serialize_template(template)})


@require_http_methods(["POST"])
@transaction.atomic
def use_template(request, template_id):
    login_error = _require_login(request)
    if login_error:
        return login_error
    template = get_object_or_404(
        CardTemplate,
        pk=template_id,
        status=CardTemplate.STATUS_PUBLISHED,
    )
    if not _template_allowed(template, _account_type(request)):
        return _error("This template is not available for your account.", status=403)
    payload = _json_body(request) or {}
    design = CardDesign.objects.create(
        owner=request.user,
        name=str(payload.get("name") or template.name).strip()[:140],
        finish=str(payload.get("finish") or "pvc"),
        front_data=deepcopy(template.front_data),
        back_data=deepcopy(template.back_data),
        source_template=template,
        source_template_version=template.version,
    )
    design.create_revision(request.user, reason="template")
    return JsonResponse({"ok": True, "design": _serialize_design(design)}, status=201)


@require_http_methods(["GET"])
def template_thumbnail(request, template_id):
    template = get_object_or_404(CardTemplate, pk=template_id)
    if not template.thumbnail:
        return _error("This template has no thumbnail.", status=404)
    if (
        template.status != CardTemplate.STATUS_PUBLISHED
        and not (request.user.is_authenticated and request.user.is_superuser)
    ):
        return _error("This template is not published.", status=404)
    content_type = mimetypes.guess_type(template.thumbnail.name)[0] or "application/octet-stream"
    response = FileResponse(template.thumbnail.open("rb"), content_type=content_type)
    response["Cache-Control"] = "public, max-age=86400"
    response["X-Content-Type-Options"] = "nosniff"
    return response
