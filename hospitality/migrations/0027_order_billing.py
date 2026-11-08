from decimal import Decimal

from django.db import migrations, models


def populate_final_totals(apps, schema_editor):
    VenueOrder = apps.get_model('hospitality', 'VenueOrder')
    VenueOrder.objects.filter(final_total=Decimal('0.00')).exclude(total=Decimal('0.00')).update(final_total=models.F('total'))


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0026_order_safeguards')]

    operations = [
        migrations.AddField(model_name='venueorder', name='discount_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='venueorder', name='final_total', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='venueorder', name='paid_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venueorder', name='payment_status', field=models.CharField(choices=[('unpaid', 'Unpaid'), ('paid_cash', 'Paid cash'), ('paid_online', 'Paid online'), ('complimentary', 'Complimentary')], default='unpaid', max_length=20)),
        migrations.AddField(model_name='venueorder', name='service_charge_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='venueorder', name='tax_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.RunPython(populate_final_totals, migrations.RunPython.noop),
    ]
