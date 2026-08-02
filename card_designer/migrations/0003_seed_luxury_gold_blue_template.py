from copy import deepcopy

from django.db import migrations
from django.db.models import F
from django.utils import timezone


SLUG = "luxury-gold-blue"
FRONT_SVG_URL = "/static/card-templates/luxury-gold-blue-front.svg"
BACK_SVG_URL = "/static/card-templates/luxury-gold-blue-back.svg"
LOGO_URL = "/static/branding/tap2connect-logo.png"


def base_style(fill="#07111f", stroke="transparent", stroke_width=0, **extra):
    return {
        "fill": fill,
        "stroke": stroke,
        "strokeWidth": stroke_width,
        "borderStyle": "solid",
        "cornerRadius": extra.get("cornerRadius", 0),
        "shadowColor": extra.get("shadowColor", "#000000"),
        "shadowBlur": extra.get("shadowBlur", 0),
        "shadowOpacity": extra.get("shadowOpacity", 0),
        "blur": 0,
    }


def text_style(fill, size, weight=500, align="left"):
    return {
        **base_style(fill),
        "fontFamily": "Inter",
        "fontSize": size,
        "fontWeight": weight,
        "fontStyle": "normal",
        "textDecoration": "",
        "align": align,
        "letterSpacing": 0,
        "lineHeight": 1.2,
        "backgroundColor": "transparent",
    }


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
        "maintainProportion": False,
        "text": text,
        "style": text_style(
            color,
            size,
            style.get("fontWeight", 500),
            style.get("align", "left"),
        ),
    }


def rounded_panel(element_id, name, x, y, width, height):
    return {
        "id": element_id,
        "type": "shape",
        "name": name,
        "shape": "rounded",
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 0.9,
        "visible": True,
        "locked": False,
        "maintainProportion": False,
        "style": base_style(
            "#07111f",
            "#d8b15f",
            2,
            cornerRadius=28,
            shadowColor="#000000",
            shadowBlur=24,
            shadowOpacity=0.26,
        ),
    }


def image_element(element_id, name, x, y, width, height, asset_url=LOGO_URL):
    return {
        "id": element_id,
        "type": "image",
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 1,
        "visible": True,
        "locked": False,
        "maintainProportion": True,
        "assetUrl": asset_url,
        "fit": "contain",
        "mask": "none",
        "flipX": False,
        "flipY": False,
        "style": base_style("transparent"),
    }


def qr_element(element_id, x, y, width, height):
    return {
        "id": element_id,
        "type": "qr",
        "name": "Profile QR Code",
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "rotation": 0,
        "opacity": 1,
        "visible": True,
        "locked": False,
        "maintainProportion": True,
        "qrValue": "{{qr_code}}",
        "qrOptions": {
            "foreground": "#07111f",
            "background": "#ffffff",
            "transparent": False,
            "margin": 2,
            "errorCorrection": "M",
            "style": "square",
            "centerLogoUrl": "",
        },
        "style": base_style("#07111f"),
    }


def background(svg_url):
    return {
        "type": "image",
        "color": "#07111f",
        "gradient": {"from": "#07111f", "to": "#d8b15f", "angle": 135},
        "imageUrl": svg_url,
        "pattern": "none",
        "opacity": 1,
        "locked": True,
    }


def document(svg_url, elements):
    return {
        "version": 2,
        "size": {"width": 900, "height": 500},
        "background": background(svg_url),
        "guides": {"horizontal": [], "vertical": []},
        "elements": elements,
    }


def build_documents():
    front = document(
        FRONT_SVG_URL,
        [
            rounded_panel("luxury-front-info-panel", "Identity Panel", 468, 54, 364, 392),
            image_element("luxury-front-logo", "Company Logo", 548, 86, 204, 78),
            text_element(
                "luxury-front-name",
                "Full Name",
                "{{full_name}}",
                510,
                202,
                280,
                58,
                34,
                "#f8fafc",
                fontWeight=800,
                align="center",
            ),
            text_element(
                "luxury-front-role",
                "Role and Company",
                "{{job_title}} | {{company}}",
                506,
                268,
                288,
                34,
                15,
                "#d8b15f",
                fontWeight=700,
                align="center",
            ),
            text_element(
                "luxury-front-phone",
                "Phone",
                "{{phone}}",
                512,
                336,
                276,
                28,
                13,
                "#f8fafc",
                align="center",
            ),
            text_element(
                "luxury-front-email",
                "Email",
                "{{email}}",
                512,
                369,
                276,
                28,
                13,
                "#f8fafc",
                align="center",
            ),
            text_element(
                "luxury-front-website",
                "Website",
                "{{website}}",
                512,
                402,
                276,
                28,
                13,
                "#d8b15f",
                fontWeight=700,
                align="center",
            ),
        ],
    )
    back = document(
        BACK_SVG_URL,
        [
            rounded_panel("luxury-back-qr-panel", "QR Panel", 95, 58, 300, 384),
            qr_element("luxury-back-qr", 150, 98, 190, 190),
            text_element(
                "luxury-back-scan-label",
                "Scan Label",
                "SCAN TO CONNECT",
                116,
                316,
                258,
                42,
                22,
                "#f8fafc",
                fontWeight=800,
                align="center",
            ),
            text_element(
                "luxury-back-website",
                "Website",
                "{{website}}",
                116,
                368,
                258,
                30,
                13,
                "#d8b15f",
                fontWeight=600,
                align="center",
            ),
            image_element("luxury-back-logo", "Company Logo", 560, 164, 190, 74),
            text_element(
                "luxury-back-company",
                "Company Name",
                "{{company}}",
                486,
                258,
                340,
                42,
                24,
                "#f8fafc",
                fontWeight=800,
                align="center",
            ),
            text_element(
                "luxury-back-social",
                "Social Handle",
                "{{social_username}}",
                486,
                306,
                340,
                30,
                14,
                "#d8b15f",
                fontWeight=600,
                align="center",
            ),
        ],
    )
    return front, back


def seed_luxury_template(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    CardTemplateVersion = apps.get_model("card_designer", "CardTemplateVersion")
    now = timezone.now()
    front, back = build_documents()

    if not CardTemplate.objects.filter(slug=SLUG).exists():
        CardTemplate.objects.all().update(sort_order=F("sort_order") + 1)

    template, _ = CardTemplate.objects.update_or_create(
        slug=SLUG,
        defaults={
            "name": "Luxury Gold Blue",
            "description": (
                "A Canva-inspired luxury business card using the uploaded gold-blue "
                "artwork with editable profile, contact, logo, and QR fields."
            ),
            "category": "business",
            "status": "published",
            "front_data": front,
            "back_data": back,
            "supports_back": True,
            "is_featured": True,
            "is_premium": False,
            "eligible_account_types": [],
            "sort_order": 0,
            "version": 1,
            "published_at": now,
        },
    )
    CardTemplateVersion.objects.update_or_create(
        template=template,
        version=1,
        defaults={
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "front_data": deepcopy(front),
            "back_data": deepcopy(back),
            "supports_back": True,
            "is_premium": False,
            "eligible_account_types": [],
        },
    )


def remove_luxury_template(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    CardTemplate.objects.filter(slug=SLUG).delete()
    CardTemplate.objects.filter(sort_order__gt=0).update(sort_order=F("sort_order") - 1)


class Migration(migrations.Migration):
    dependencies = [
        ("card_designer", "0002_seed_templates"),
    ]

    operations = [
        migrations.RunPython(seed_luxury_template, remove_luxury_template),
    ]
