from django.db import migrations, models
from django.db.models.functions import Lower
from django.utils.text import slugify


RESERVED_SLUGS = {
    'admin', 'api', 'card-editor', 'club-members', 'connections', 'dashboard',
    'health', 'login', 'logout', 'media', 'platform', 'profile', 'robots',
    'static', 'student', 'venue', 'workspaces',
}


def populate_workspace_slugs(apps, schema_editor):
    College = apps.get_model('vcards', 'College')
    used = set(RESERVED_SLUGS)
    for organization in College.objects.order_by('id'):
        base = slugify(organization.name)[:70] or f'organization-{organization.id}'
        candidate = base
        suffix = 2
        while candidate.lower() in used:
            candidate = f'{base[:70 - len(str(suffix))]}-{suffix}'
            suffix += 1
        organization.workspace_slug = candidate
        organization.save(update_fields=['workspace_slug'])
        used.add(candidate.lower())


class Migration(migrations.Migration):
    dependencies = [('vcards', '0060_organizationserviceplan_organizationmoduleaccess')]

    operations = [
        migrations.AddField(
            model_name='college',
            name='workspace_slug',
            field=models.SlugField(blank=True, max_length=80, null=True),
        ),
        migrations.RunPython(populate_workspace_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='college',
            name='workspace_slug',
            field=models.SlugField(max_length=80, unique=True),
        ),
        migrations.AddConstraint(
            model_name='college',
            constraint=models.UniqueConstraint(Lower('workspace_slug'), name='college_workspace_slug_ci_unique'),
        ),
    ]
