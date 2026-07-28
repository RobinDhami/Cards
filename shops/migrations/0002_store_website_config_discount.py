from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='website_config',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='React storefront section visibility, order, navigation, and presentation settings.',
            ),
        ),
        migrations.CreateModel(
            name='Discount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=160)),
                ('code', models.CharField(max_length=50)),
                ('discount_type', models.CharField(choices=[('percentage', 'Percentage'), ('fixed', 'Fixed amount'), ('free_delivery', 'Free delivery')], default='percentage', max_length=30)),
                ('value', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('minimum_order_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('usage_limit', models.PositiveIntegerField(blank=True, null=True)),
                ('usage_count', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='discounts', to='shops.store')),
            ],
            options={
                'ordering': ['-is_active', '-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='discount',
            constraint=models.UniqueConstraint(fields=('store', 'code'), name='unique_discount_code_per_store'),
        ),
    ]
