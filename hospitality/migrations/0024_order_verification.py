from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0023_ordering')]

    operations = [
        migrations.AlterField(
            model_name='venueorder',
            name='status',
            field=models.CharField(choices=[('new', 'Pending verification'), ('accepted', 'Verified'), ('preparing', 'Preparing'), ('ready', 'Ready'), ('completed', 'Served'), ('cancelled', 'Rejected'), ('expired', 'Expired')], default='new', max_length=20),
        ),
        migrations.AddField(model_name='venueorder', name='verification_code', field=models.CharField(blank=True, max_length=6)),
        migrations.AddField(model_name='venueorder', name='verification_expires_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venueorder', name='verified_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venueorder', name='verified_by', field=models.CharField(blank=True, max_length=120)),
    ]
