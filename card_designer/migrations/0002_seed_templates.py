from copy import deepcopy

from django.db import migrations
from django.utils import timezone


def text_element(element_id, name, text, x, y, width, height, size, color, **style):
    return {
        "id": element_id,
        "type": "text",
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 1,
        "visible": True,
        "locked": False,
        "text": text,
        "style": {
            "fontFamily": "Inter",
            "fontSize": size,
            "fontWeight": style.get("fontWeight", 500),
            "fontStyle": "normal",
            "textDecoration": "",
            "fill": color,
            "align": style.get("align", "left"),
            "letterSpacing": style.get("letterSpacing", 0),
            "lineHeight": style.get("lineHeight", 1.2),
            "backgroundColor": "transparent",
            "shadowColor": "#000000",
            "shadowBlur": 0,
            "shadowOpacity": 0,
        },
    }


def seed_templates(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    CardTemplateVersion = apps.get_model("card_designer", "CardTemplateVersion")
    now = timezone.now()

    variants = [
        ("Midnight", "midnight", "professional", "#090b10", "#ffffff", "#2563eb"),
        ("Signature Blue", "signature-blue", "corporate", "#1659db", "#ffffff", "#ffffff"),
        ("Minimal White", "minimal-white", "minimal", "#ffffff", "#111111", "#2563eb"),
        ("Linework", "linework", "creative", "#ffffff", "#111111", "#2563eb"),
    ]

    for order, (name, slug, category, background, foreground, accent) in enumerate(variants):
        front = {
            "version": 2,
            "size": {"width": 900, "height": 500},
            "background": {
                "type": "solid",
                "color": background,
                "gradient": {"from": background, "to": background, "angle": 0},
                "imageUrl": "",
                "pattern": "none",
                "opacity": 1,
                "locked": True,
            },
            "guides": {"horizontal": [], "vertical": []},
            "elements": [
                {
                    "id": "accent-bar",
                    "type": "shape",
                    "name": "Accent Bar",
                    "shape": "rectangle",
                    "x": 0,
                    "y": 0,
                    "width": 18,
                    "height": 500,
                    "rotation": 0,
                    "opacity": 1,
                    "visible": True,
                    "locked": False,
                    "style": {
                        "fill": accent,
                        "stroke": accent,
                        "strokeWidth": 0,
                        "borderStyle": "solid",
                        "cornerRadius": 0,
                        "shadowColor": "#000000",
                        "shadowBlur": 0,
                        "shadowOpacity": 0,
                        "blur": 0,
                    },
                },
                {
                    "id": "brand-logo",
                    "type": "image",
                    "name": "T2C Logo",
                    "x": 78,
                    "y": 62,
                    "width": 180,
                    "height": 72,
                    "rotation": 0,
                    "opacity": 1,
                    "visible": True,
                    "locked": False,
                    "assetUrl": "/static/branding/tap2connect-logo.png",
                    "fit": "contain",
                    "mask": "none",
                    "flipX": False,
                    "flipY": False,
                    "style": {
                        "stroke": "transparent",
                        "strokeWidth": 0,
                        "cornerRadius": 0,
                        "shadowColor": "#000000",
                        "shadowBlur": 0,
                        "shadowOpacity": 0,
                    },
                },
                text_element(
                    "full-name",
                    "Full Name",
                    "{{full_name}}",
                    78,
                    235,
                    510,
                    62,
                    38,
                    foreground,
                    fontWeight=700,
                    letterSpacing=1,
                ),
                text_element(
                    "job-title",
                    "Job Title",
                    "{{job_title}} | {{company}}",
                    80,
                    305,
                    560,
                    36,
                    18,
                    foreground,
                    fontWeight=500,
                ),
                text_element(
                    "contact-line",
                    "Contact Line",
                    "{{phone}}  |  {{email}}",
                    80,
                    392,
                    650,
                    28,
                    14,
                    foreground,
                    fontWeight=400,
                ),
                {
                    "id": "bottom-line",
                    "type": "line",
                    "name": "Bottom Divider",
                    "x": 80,
                    "y": 445,
                    "width": 720,
                    "height": 1,
                    "rotation": 0,
                    "opacity": 1,
                    "visible": True,
                    "locked": False,
                    "points": [0, 0, 720, 0],
                    "style": {
                        "stroke": accent,
                        "strokeWidth": 3,
                        "borderStyle": "solid",
                        "shadowColor": "#000000",
                        "shadowBlur": 0,
                        "shadowOpacity": 0,
                    },
                },
            ],
        }
        back = {
            "version": 2,
            "size": {"width": 900, "height": 500},
            "background": deepcopy(front["background"]),
            "guides": {"horizontal": [], "vertical": []},
            "elements": [
                {
                    "id": "qr-code",
                    "type": "qr",
                    "name": "Profile QR Code",
                    "x": 330,
                    "y": 72,
                    "width": 240,
                    "height": 240,
                    "rotation": 0,
                    "opacity": 1,
                    "visible": True,
                    "locked": False,
                    "qrValue": "{{qr_code}}",
                    "qrOptions": {
                        "foreground": foreground,
                        "background": background,
                        "transparent": False,
                        "margin": 2,
                        "errorCorrection": "M",
                        "style": "square",
                        "centerLogoUrl": "",
                    },
                    "style": {
                        "fill": foreground,
                        "stroke": "transparent",
                        "strokeWidth": 0,
                        "cornerRadius": 0,
                        "shadowColor": "#000000",
                        "shadowBlur": 0,
                        "shadowOpacity": 0,
                    },
                },
                text_element(
                    "scan-label",
                    "Scan Label",
                    "SCAN TO CONNECT",
                    180,
                    344,
                    540,
                    50,
                    25,
                    foreground,
                    fontWeight=700,
                    align="center",
                    letterSpacing=2,
                ),
                text_element(
                    "website",
                    "Website",
                    "{{website}}",
                    180,
                    406,
                    540,
                    32,
                    15,
                    accent,
                    fontWeight=500,
                    align="center",
                ),
            ],
        }
        template = CardTemplate.objects.create(
            name=name,
            slug=slug,
            description=f"A clean {category} Tap2Connect card with editable profile fields.",
            category=category,
            status="published",
            front_data=front,
            back_data=back,
            supports_back=True,
            is_featured=order < 2,
            is_premium=order == 3,
            eligible_account_types=[],
            sort_order=order,
            version=1,
            published_at=now,
        )
        CardTemplateVersion.objects.create(
            template=template,
            version=1,
            name=name,
            description=template.description,
            category=category,
            front_data=deepcopy(front),
            back_data=deepcopy(back),
            supports_back=True,
            is_premium=template.is_premium,
            eligible_account_types=[],
        )


def remove_seed_templates(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    CardTemplate.objects.filter(
        slug__in=["midnight", "signature-blue", "minimal-white", "linework"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("card_designer", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_templates, remove_seed_templates),
    ]

