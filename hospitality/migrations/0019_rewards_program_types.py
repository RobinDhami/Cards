from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0018_venuelink_icon')]

    operations = [
        migrations.AddField(model_name='venuerewardsprogram', name='program_type', field=models.CharField(choices=[('rewards', 'Spend rewards'), ('points', 'Points'), ('stamps', 'Stamps')], default='rewards', max_length=12)),
        migrations.AddField(model_name='venuerewardsprogram', name='points_per_currency', field=models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=8, validators=[MinValueValidator(Decimal('0.01'))])),
        migrations.AddField(model_name='venuerewardsprogram', name='points_to_reward', field=models.PositiveIntegerField(default=100, validators=[MinValueValidator(1), MaxValueValidator(100000)])),
        migrations.AddField(model_name='venuerewardsprogram', name='stamp_goal', field=models.PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(50)])),
        migrations.AddField(model_name='venuerewardsprogram', name='stamp_reward_label', field=models.CharField(default='Free reward', max_length=80)),
    ]
