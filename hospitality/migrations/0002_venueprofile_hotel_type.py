from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('hospitality', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venueprofile',
            name='venue_type',
            field=models.CharField(
                choices=[
                    ('hotel', 'Hotel'),
                    ('restaurant', 'Restaurant'),
                    ('cafe', 'Café'),
                    ('bar', 'Bar'),
                    ('other', 'Other venue'),
                ],
                default='restaurant',
                max_length=20,
            ),
        ),
    ]
