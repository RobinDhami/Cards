from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0030_studentprofile_emergency_contact_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studentprofile',
            name='contact_template',
            field=models.CharField(default='student_digital_card.html', max_length=50),
        ),
        migrations.RunSQL(
            "UPDATE vcards_studentprofile SET contact_template = 'student_digital_card.html'",
            migrations.RunSQL.noop,
        ),
    ]
