from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('vcards', '0051_remove_legacy_hotel_tables'),
    ]

    operations = [
        migrations.AlterField(
            model_name='college',
            name='organization_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('education', 'Education'),
                    ('club', 'Club'),
                    ('business', 'Business'),
                    ('hotel', 'Hotel'),
                    ('cafe', 'Café'),
                    ('hospitality', 'Hospitality'),
                    ('other', 'Other'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
