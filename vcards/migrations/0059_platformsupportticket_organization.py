from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('vcards', '0058_platform_support_ticket')]

    operations = [
        migrations.AddField(
            model_name='platformsupportticket',
            name='organization',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='support_tickets', to='vcards.college'),
        ),
    ]
