from django.db import migrations, models


def preserve_existing_profile_focus(apps, schema_editor):
    ProfessionalProfile = apps.get_model('professional_cards', 'ProfessionalProfile')
    ProfessionalProfile.objects.filter(template_name='modern_identity').update(profile_focus='personal')
    ProfessionalProfile.objects.filter(template_name='organization_focus').update(
        profile_focus='organization',
        template_name='modern_identity',
    )


class Migration(migrations.Migration):
    dependencies = [
        ('professional_cards', '0015_professionalconnection_blocked_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalprofile',
            name='profile_focus',
            field=models.CharField(
                choices=[('organization', 'Organization'), ('personal', 'Personal')],
                default='organization',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='cta_clicks',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='offering_clicks',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='professionalservice',
            name='link',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='professionalprofile',
            name='primary_cta_type',
            field=models.CharField(
                choices=[
                    ('contact', 'Contact'),
                    ('apply', 'Apply Now'),
                    ('shop', 'Shop Collection'),
                    ('training', 'Join Training'),
                    ('demo', 'Request Demo'),
                    ('call', 'Make Call'),
                    ('website', 'Visit Website'),
                    ('booking', 'Book a Meeting'),
                    ('save_contact', 'Save Contact'),
                    ('custom', 'Custom Link'),
                ],
                default='contact',
                max_length=30,
            ),
        ),
        migrations.RunPython(preserve_existing_profile_focus, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='professionalprofile',
            name='template_name',
            field=models.CharField(
                choices=[('modern_identity', 'Modern')],
                default='modern_identity',
                max_length=80,
            ),
        ),
    ]
