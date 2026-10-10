from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('vcards', '0055_expand_college_map_url')]
    operations = [
        migrations.AddField(
            model_name='cardbatchcard',
            name='organization',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='physical_cards', to='vcards.college'),
        ),
    ]
