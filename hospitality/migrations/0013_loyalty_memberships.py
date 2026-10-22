# Generated manually to keep the public loyalty identity model explicit.

import hospitality.models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hospitality', '0012_trustworthy_analytics'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoyaltyCustomer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_e164', models.CharField(max_length=20, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='VenueLoyaltyMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_identifier', models.CharField(default=hospitality.models.public_identifier, editable=False, max_length=64, unique=True)),
                ('stamp_count', models.PositiveSmallIntegerField(default=0)),
                ('stamp_goal', models.PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(50)])),
                ('rewards_redeemed', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='loyalty_memberships', to='hospitality.loyaltycustomer')),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='loyalty_memberships', to='hospitality.venueprofile')),
            ],
        ),
        migrations.AddConstraint(
            model_name='venueloyaltymembership',
            constraint=models.UniqueConstraint(fields=('venue', 'customer'), name='venue_loyalty_membership_unique'),
        ),
        migrations.AddIndex(
            model_name='venueloyaltymembership',
            index=models.Index(fields=['venue', 'is_active', 'created_at'], name='hospitality_venue_i_a6b624_idx'),
        ),
    ]
