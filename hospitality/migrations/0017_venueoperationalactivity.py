from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0016_rewards_transactions')]

    operations = [
        migrations.CreateModel(
            name='VenueOperationalActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(max_length=48)),
                ('summary', models.CharField(max_length=240)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='venue_operational_activity', to=settings.AUTH_USER_MODEL)),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='operational_activity', to='hospitality.venueprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(model_name='venueoperationalactivity', index=models.Index(fields=['venue', 'created_at'], name='hospitality_venue_o_a8b19f_idx')),
    ]
