import hospitality.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0024_order_verification')]

    operations = [
        migrations.AddField(
            model_name='venueprofile',
            name='kitchen_access_token',
            field=models.CharField(default=hospitality.models.kitchen_access_token, editable=False, max_length=64, unique=True),
        ),
    ]
