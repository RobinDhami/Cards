from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0015_rewards_program')]
    operations = [
        migrations.AddField(model_name='venueloyaltymembership', name='last_activity_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AlterField(model_name='venuerewardsprogram', name='expiry_days', field=models.PositiveIntegerField(blank=True, default=180, null=True, validators=[MinValueValidator(1), MaxValueValidator(3650)])),
        migrations.CreateModel(
            name='VenueRewardsTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_type', models.CharField(choices=[('earn', 'Reward earned'), ('redeem', 'Reward redeemed'), ('expire', 'Rewards expired')], max_length=12)),
                ('reward_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=12)),
                ('order_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('receipt_reference', models.CharField(blank=True, max_length=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='venue_rewards_transactions', to=settings.AUTH_USER_MODEL)),
                ('membership', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rewards_transactions', to='hospitality.venueloyaltymembership')),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rewards_transactions', to='hospitality.venueprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(model_name='venuerewardstransaction', index=models.Index(fields=['venue', 'created_at'], name='hospitality_venue_r_b1ca9f_idx')),
        migrations.AddIndex(model_name='venuerewardstransaction', index=models.Index(fields=['membership', 'created_at'], name='hospitality_venue_l_b3fe5a_idx')),
    ]
