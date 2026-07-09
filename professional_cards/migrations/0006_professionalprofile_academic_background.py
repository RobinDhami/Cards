from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professional_cards', '0005_professionalprofile_academic_section'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_certification',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_institution',
            field=models.CharField(blank=True, default='', help_text='College, university, school, or training institute.', max_length=180),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_level',
            field=models.CharField(blank=True, default='', help_text='For example: Bachelor, Master, Graduate, Undergraduate, or Diploma.', max_length=120),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_specialization',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_title',
            field=models.CharField(blank=True, default='', help_text='Degree, program, qualification, or academic title shown on the public card.', max_length=160),
        ),
        migrations.AddField(
            model_name='professionalprofile',
            name='academic_year',
            field=models.CharField(blank=True, default='', help_text='Graduation year, current year, batch, or expected completion.', max_length=80),
        ),
    ]
