from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hospitality', '0013_loyalty_memberships'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venueanalyticsevent',
            name='event_type',
            field=models.CharField(
                choices=[
                    ('profile_view', 'Profile view'),
                    ('menu_open', 'Menu opened'),
                    ('menu_item_click', 'Menu-item detail viewed'),
                    ('rating_click', 'Rating clicked'),
                    ('google_review_click', 'Google review button clicked'),
                    ('feedback_submit', 'Feedback submitted'),
                    ('social_click', 'Public link clicked'),
                    ('loyalty_join', 'Loyalty card joined or reopened'),
                ],
                max_length=32,
            ),
        ),
    ]
