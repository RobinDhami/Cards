from django.db import migrations


MODULE_PERMISSIONS = [
    ('access_platform_overview', 'Can access platform overview'),
    ('access_platform_organizations', 'Can access platform organizations'),
    ('access_platform_members', 'Can access platform members'),
    ('access_platform_professionals', 'Can access platform professional profiles'),
    ('access_platform_templates', 'Can access platform Template Studio'),
    ('access_platform_cards', 'Can access platform cards'),
    ('access_platform_activity', 'Can access platform activity'),
    ('access_platform_reports', 'Can access platform reports'),
    ('access_platform_settings', 'Can access platform settings'),
]


def create_graphics_designer_group(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    content_type, _ = ContentType.objects.get_or_create(
        app_label='vcards',
        model='platformaccess',
    )
    permissions = {}
    for codename, name in MODULE_PERMISSIONS:
        permission, _ = Permission.objects.get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={'name': name},
        )
        permissions[codename] = permission
    group, _ = Group.objects.get_or_create(name='Graphics Designer')
    group.permissions.set([permissions['access_platform_templates']])


def remove_graphics_designer_group(apps, schema_editor):
    apps.get_model('auth', 'Group').objects.filter(name='Graphics Designer').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('vcards', '0037_alter_studentprofile_email_and_more'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformAccess',
            fields=[],
            options={
                'proxy': True,
                'indexes': [],
                'constraints': [],
                'default_permissions': (),
                'permissions': MODULE_PERMISSIONS,
            },
            bases=('auth.user',),
        ),
        migrations.RunPython(create_graphics_designer_group, remove_graphics_designer_group),
    ]
