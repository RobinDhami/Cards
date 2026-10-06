from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('vcards', '0053_consolidate_hospitality_types'),
    ]

    operations = [
        migrations.AlterField(
            model_name='college',
            name='address',
            field=models.TextField(blank=True, null=True),
        ),
    ]
