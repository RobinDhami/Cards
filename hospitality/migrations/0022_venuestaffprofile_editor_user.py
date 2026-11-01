from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0021_rewards_transaction_idempotency')]

    operations = [
        migrations.AddField(
            model_name='venuestaffprofile', name='editor_user',
            field=models.OneToOneField(blank=True, null=True, on_delete=models.SET_NULL, related_name='venue_staff_editor_profile', to=settings.AUTH_USER_MODEL),
        ),
    ]
