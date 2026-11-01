from decimal import Decimal
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import hospitality.models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0022_venuestaffprofile_editor_user')]

    operations = [
        migrations.AlterField(model_name='venuetouchpoint', name='destination', field=models.CharField(choices=[('profile', 'Business profile'), ('menu', 'Menu'), ('feedback', 'Feedback'), ('ordering', 'Table ordering')], default='profile', max_length=20)),
        migrations.CreateModel(name='VenueOrder', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('public_identifier', models.CharField(default=hospitality.models.public_identifier, editable=False, max_length=64, unique=True)),
            ('order_number', models.PositiveIntegerField()), ('customer_name', models.CharField(blank=True, max_length=120)), ('customer_phone', models.CharField(blank=True, max_length=40)), ('note', models.TextField(blank=True, max_length=1000)), ('status', models.CharField(choices=[('new', 'New'), ('accepted', 'Accepted'), ('preparing', 'Preparing'), ('ready', 'Ready'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='new', max_length=20)), ('total', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)), ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
            ('table', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='hospitality.venuetouchpoint')), ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='hospitality.venueprofile')),
        ], options={'ordering': ['-created_at', '-id']}),
        migrations.CreateModel(name='VenueOrderItem', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')), ('name', models.CharField(max_length=160)), ('unit_price', models.DecimalField(decimal_places=2, max_digits=12)), ('quantity', models.PositiveSmallIntegerField(default=1, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(50)])), ('note', models.CharField(blank=True, max_length=300)),
            ('menu_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order_items', to='hospitality.venuemenuitem')), ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='hospitality.venueorder')),
        ]),
        migrations.AddConstraint(model_name='venueorder', constraint=models.UniqueConstraint(fields=('venue', 'order_number'), name='venue_order_number_unique')),
    ]
