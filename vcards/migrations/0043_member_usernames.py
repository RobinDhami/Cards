import re

from django.db import migrations, models
from django.db.models.functions import Lower


def protect_auth_usernames(apps, schema_editor):
    user = apps.get_model('auth', 'User')
    duplicates = user.objects.using(schema_editor.connection.alias).annotate(
        folded=Lower('username'),
    ).values('folded').annotate(total=models.Count('pk')).filter(total__gt=1)
    if duplicates.exists():
        raise RuntimeError('Case-insensitive duplicate auth usernames must be resolved before migrating. No accounts were renamed.')
    if not schema_editor.connection.features.supports_expression_indexes:
        raise RuntimeError('This database must support expression indexes to enforce global username uniqueness.')
    schema_editor.add_constraint(user, models.UniqueConstraint(Lower('username'), name='tap2connect_auth_username_ci_unique'))


def unprotect_auth_usernames(apps, schema_editor):
    schema_editor.remove_constraint(apps.get_model('auth', 'User'), models.UniqueConstraint(Lower('username'), name='tap2connect_auth_username_ci_unique'))


def seed_sequences(apps, schema_editor):
    alias = schema_editor.connection.alias
    college = apps.get_model('vcards', 'College')
    sources = [apps.get_model('auth', 'User'), apps.get_model('vcards', 'StudentProfile')]
    for organization in college.objects.using(alias).exclude(organization_code__isnull=True).exclude(organization_code='').iterator():
        code = organization.organization_code.upper()
        pattern = re.compile(r'^' + re.escape(code) + r'[A-Z]{1,2}(\d{4,})$')
        highest = 0
        for source in sources:
            for username in source.objects.using(alias).filter(username__istartswith=code).values_list('username', flat=True).iterator():
                match = pattern.fullmatch(username.upper())
                if match:
                    highest = max(highest, int(match.group(1)))
        college.objects.using(alias).filter(pk=organization.pk).update(member_username_sequence=highest)


class Migration(migrations.Migration):
    dependencies = [('vcards', '0042_college_organization_code')]
    operations = [
        migrations.AddField(model_name='college', name='member_username_sequence', field=models.PositiveBigIntegerField(default=0, editable=False)),
        migrations.AddConstraint(model_name='college', constraint=models.UniqueConstraint(Lower('organization_code'), name='college_code_ci_unique')),
        migrations.AddConstraint(model_name='studentprofile', constraint=models.UniqueConstraint(Lower('username'), name='member_username_ci_unique')),
        migrations.RunPython(protect_auth_usernames, unprotect_auth_usernames),
        migrations.RunPython(seed_sequences, migrations.RunPython.noop),
    ]
