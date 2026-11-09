from django.db import migrations, models


def migrate_legacy_menu_editors(apps, schema_editor):
    TeamMember = apps.get_model('vcards', 'OrganizationTeamMember')
    TeamMember.objects.filter(role='menu_editor').update(role='manager')


class Migration(migrations.Migration):
    dependencies = [('vcards', '0061_college_workspace_slug')]

    operations = [
        migrations.RunPython(migrate_legacy_menu_editors, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='organizationteammember',
            name='role',
            field=models.CharField(choices=[('owner', 'Owner'), ('manager', 'Manager'), ('waiter', 'Waiter'), ('kitchen', 'Kitchen'), ('reception', 'Reception')], default='manager', max_length=20),
        ),
    ]
