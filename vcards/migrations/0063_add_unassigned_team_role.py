from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('vcards', '0062_expand_hospitality_team_roles')]

    operations = [
        migrations.AlterField(
            model_name='organizationteammember',
            name='role',
            field=models.CharField(
                choices=[
                    ('none', 'No dashboard role'), ('owner', 'Owner'), ('manager', 'Manager'),
                    ('waiter', 'Waiter'), ('kitchen', 'Kitchen'), ('reception', 'Reception'),
                ],
                default='none', max_length=20,
            ),
        ),
    ]
