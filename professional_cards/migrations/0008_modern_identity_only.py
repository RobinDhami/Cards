from django.db import migrations, models


def set_modern_identity(apps, schema_editor):
    ProfessionalProfile = apps.get_model('professional_cards', 'ProfessionalProfile')
    ProfessionalProfile.objects.exclude(template_name='modern_identity').update(
        template_name='modern_identity'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('professional_cards', '0007_alter_professionaldocument_document_type'),
    ]

    operations = [
        migrations.RunPython(set_modern_identity, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='professionalprofile',
            name='template_name',
            field=models.CharField(
                choices=[('modern_identity', 'Modern Identity')],
                default='modern_identity',
                max_length=80,
            ),
        ),
    ]
