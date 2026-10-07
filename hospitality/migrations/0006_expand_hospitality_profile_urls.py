from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hospitality', '0005_profile_hours_reservations_and_shared_contacts'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venueprofile',
            name='google_review_url',
            field=models.URLField(blank=True, max_length=1000),
        ),
        migrations.AlterField(
            model_name='venueprofile',
            name='reservation_url',
            field=models.URLField(blank=True, max_length=1000),
        ),
    ]
