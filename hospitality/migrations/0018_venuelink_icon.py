from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0017_venueoperationalactivity')]

    operations = [
        migrations.AddField(
            model_name='venuelink',
            name='icon',
            field=models.TextField(blank=True, default=''),
        ),
    ]
