from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0020_loyalty_customer_name')]

    operations = [
        migrations.AddField(
            model_name='venuerewardstransaction',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddConstraint(
            model_name='venuerewardstransaction',
            constraint=models.UniqueConstraint(
                condition=~models.Q(idempotency_key=''),
                fields=('venue', 'idempotency_key'),
                name='venue_rewards_idempotency_unique',
            ),
        ),
    ]
