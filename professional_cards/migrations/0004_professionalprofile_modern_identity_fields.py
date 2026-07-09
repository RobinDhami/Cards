from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professional_cards', '0003_professionalprofile_show_map_on_profile'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalprofile',
            name='current_focus',
            field=models.TextField(
                blank=True,
                default='',
                help_text='What you are currently building, learning, offering, or working toward.',
            ),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='featured_interest',
            field=models.TextField(
                blank=True,
                default='',
                help_text='A featured specialty, interest, initiative, or professional goal.',
            ),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='organization_tagline',
            field=models.CharField(
                blank=True,
                default='',
                help_text='A short line shown below the company, college, or organization name.',
                max_length=180,
            ),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='organization_logo',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='professional_profiles/organization_logos/',
            ),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='profile_identifier',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='profile_identifier_label',
            field=models.CharField(
                blank=True,
                default='Profile ID',
                help_text='For example: Employee ID, Member ID, Registration No., or Creator ID.',
                max_length=60,
            ),
        ),
        migrations.AlterField(
            model_name='professionalprofile',
            name='template_name',
            field=models.CharField(
                choices=[
                    ('professional_premium', 'Professional Premium'),
                    ('modern_identity', 'Modern Identity'),
                ],
                default='professional_premium',
                max_length=80,
            ),
        ),
    ]
