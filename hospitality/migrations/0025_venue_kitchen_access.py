import hospitality.models
import secrets
from django.db import migrations, models


def create_kitchen_tokens(apps, schema_editor):
    VenueProfile = apps.get_model('hospitality', 'VenueProfile')
    for venue in VenueProfile.objects.filter(kitchen_access_token__isnull=True).iterator():
        venue.kitchen_access_token = secrets.token_urlsafe(24)
        venue.save(update_fields=['kitchen_access_token'])


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0024_order_verification')]

    operations = [
        migrations.AddField(
            model_name='venueprofile',
            name='kitchen_access_token',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.RunPython(create_kitchen_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='venueprofile',
            name='kitchen_access_token',
            field=models.CharField(default=hospitality.models.kitchen_access_token, editable=False, max_length=64, unique=True),
        ),
    ]
