from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hospitality', '0011_staff_cards_touchpoints'),
    ]

    operations = [
        migrations.AddField(
            model_name='venueprofile',
            name='timezone',
            field=models.CharField(default='Asia/Kathmandu', max_length=64),
        ),
        migrations.AddField(
            model_name='venueanalyticsevent',
            name='visitor_hash',
            field=models.CharField(blank=True, editable=False, max_length=64),
        ),
        migrations.AlterField(
            model_name='venueanalyticsevent',
            name='event_type',
            field=models.CharField(choices=[('profile_view', 'Profile view'), ('menu_open', 'Menu opened'), ('menu_item_click', 'Menu-item detail viewed'), ('rating_click', 'Rating clicked'), ('google_review_click', 'Google review button clicked'), ('feedback_submit', 'Feedback submitted'), ('social_click', 'Public link clicked')], max_length=32),
        ),
    ]
