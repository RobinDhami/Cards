from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professional_cards', '0004_professionalprofile_modern_identity_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_section',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Optional class, batch, cohort, or section for student profiles.',
                max_length=80,
            ),
        ),
    ]
