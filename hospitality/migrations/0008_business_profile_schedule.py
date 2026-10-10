from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0007_alter_venueanalyticsevent_event_type')]

    operations = [
        migrations.AddField(
            model_name='venueprofile',
            name='opening_schedule',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='venueprofile',
            name='whatsapp_same_as_phone',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='venuelink',
            name='value',
            field=models.CharField(max_length=1000),
        ),
    ]
