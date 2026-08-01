from pathlib import Path

from defusedxml import ElementTree
from django.core.exceptions import ValidationError


ALLOWED_ASSET_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
MAX_ASSET_BYTES = 10 * 1024 * 1024
BLOCKED_SVG_TAGS = {"script", "foreignObject", "iframe", "object", "embed"}
LINK_ATTRIBUTES = {"href", "{http://www.w3.org/1999/xlink}href"}


def validate_design_asset(uploaded_file):
    extension = Path(uploaded_file.name).suffix.lower()
    if extension not in ALLOWED_ASSET_EXTENSIONS:
        raise ValidationError("Use a PNG, JPG, JPEG, WebP, or SVG file.")
    if uploaded_file.size > MAX_ASSET_BYTES:
        raise ValidationError("Files must be 10 MB or smaller.")
    if extension != ".svg":
        return

    try:
        uploaded_file.seek(0)
        root = ElementTree.parse(uploaded_file).getroot()
    except (ElementTree.ParseError, ValueError) as exc:
        raise ValidationError("This SVG file is not valid.") from exc
    finally:
        uploaded_file.seek(0)

    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag in BLOCKED_SVG_TAGS:
            raise ValidationError("This SVG contains unsupported active content.")
        for name, value in element.attrib.items():
            local_name = name.rsplit("}", 1)[-1].lower()
            if local_name.startswith("on"):
                raise ValidationError("This SVG contains unsupported event handlers.")
            if name in LINK_ATTRIBUTES and str(value).strip().lower().startswith(
                ("http:", "https:", "//", "javascript:", "data:text/html")
            ):
                raise ValidationError("External SVG links are not supported.")

