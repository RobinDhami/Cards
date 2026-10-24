from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0019_rewards_program_types')]

    operations = [
        migrations.AddField(
            model_name='loyaltycustomer',
            name='full_name',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
