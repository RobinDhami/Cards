from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hospitality', '0014_alter_venueanalyticsevent_event_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='VenueRewardsProgram',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=False)),
                ('reward_rate_percent', models.DecimalField(decimal_places=2, default=Decimal('5.00'), max_digits=5, validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('100.00'))])),
                ('minimum_order_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[MinValueValidator(Decimal('0.00'))])),
                ('max_redemption_percent', models.DecimalField(decimal_places=2, default=Decimal('20.00'), max_digits=5, validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))])),
                ('reward_label', models.CharField(default='Rewards balance', max_length=80)),
                ('expiry_days', models.PositiveIntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(3650)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('venue', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='rewards_program', to='hospitality.venueprofile')),
            ],
        ),
        migrations.AddField(
            model_name='venueloyaltymembership',
            name='reward_balance',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[MinValueValidator(Decimal('0.00'))]),
        ),
        migrations.AddField(
            model_name='venueloyaltymembership',
            name='lifetime_rewards_earned',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[MinValueValidator(Decimal('0.00'))]),
        ),
        migrations.AddField(
            model_name='venueloyaltymembership',
            name='lifetime_rewards_redeemed',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[MinValueValidator(Decimal('0.00'))]),
        ),
    ]
