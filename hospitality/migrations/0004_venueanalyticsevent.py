from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0003_menu_offers')]

    operations = [
        migrations.CreateModel(
            name='VenueAnalyticsEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('profile_view', 'Profile view'), ('menu_open', 'Menu opened'), ('menu_item_click', 'Menu item clicked'), ('rating_click', 'Rating clicked'), ('feedback_submit', 'Feedback submitted'), ('social_click', 'Social link clicked')], max_length=32)),
                ('target', models.CharField(blank=True, max_length=160)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analytics_events', to='hospitality.venueprofile')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['venue', 'event_type', 'created_at'], name='hospitality_venue_i_cbb881_idx'), models.Index(fields=['venue', 'created_at'], name='hospitality_venue_i_81f67f_idx')],
            },
        ),
    ]
