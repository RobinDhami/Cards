from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0002_venueprofile_hotel_type')]
    operations = [
        migrations.AddField(model_name='venuemenuitem', name='is_offer', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='venuemenuitem', name='offer_label', field=models.CharField(blank=True, max_length=120)),
        migrations.AddField(model_name='venuemenuitem', name='original_price', field=models.DecimalField(blank=True, max_digits=12, null=True, decimal_places=2, validators=[django.core.validators.MinValueValidator(0)])),
    ]
