from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0027_order_billing')]

    operations = [
        migrations.AddField(model_name='venuemenuitem', name='add_ons', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='venuemenuitem', name='spice_levels', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='venueorderitem', name='add_ons', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='venueorderitem', name='selected_variant', field=models.CharField(blank=True, max_length=80)),
        migrations.AddField(model_name='venueorderitem', name='spice_level', field=models.CharField(blank=True, max_length=80)),
    ]
