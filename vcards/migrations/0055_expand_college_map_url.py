from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('vcards', '0054_alter_college_address_to_text')]

    operations = [
        migrations.AlterField(
            model_name='college',
            name='map_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
    ]
