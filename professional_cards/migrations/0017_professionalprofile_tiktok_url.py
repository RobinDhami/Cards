from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('professional_cards', '0016_modern_organization_focus_and_analytics'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalprofile',
            name='tiktok_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
