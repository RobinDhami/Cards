from django.db import migrations


LEGACY_SEED_SLUGS = [
    "midnight",
    "signature-blue",
    "minimal-white",
    "linework",
]


def remove_production_seed_templates(apps, schema_editor):
    CardTemplate = apps.get_model("card_designer", "CardTemplate")
    CardTemplate.objects.filter(
        slug__in=LEGACY_SEED_SLUGS,
        created_by__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("card_designer", "0004_remove_luxury_svg_template"),
    ]

    operations = [
        migrations.RunPython(remove_production_seed_templates, migrations.RunPython.noop),
    ]
