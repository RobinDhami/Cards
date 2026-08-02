from django.db import migrations
from django.db.models import F


SLUG = "luxury-gold-blue"


def remove_luxury_svg_template(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    deleted, _ = CardTemplate.objects.filter(slug=SLUG).delete()
    if deleted:
        CardTemplate.objects.filter(sort_order__gt=0).update(sort_order=F("sort_order") - 1)


def restore_luxury_svg_template(apps, schema_editor):
    # The SVG-backed template was intentionally retired in favor of admin-authored
    # templates from Template Studio. Reversing this migration is a no-op.
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("card_designer", "0003_seed_luxury_gold_blue_template"),
    ]

    operations = [
        migrations.RunPython(remove_luxury_svg_template, restore_luxury_svg_template),
    ]
