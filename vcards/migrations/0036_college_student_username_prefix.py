from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0035_remove_library_module'),
    ]

    operations = [
        migrations.AddField(
            model_name='college',
            name='student_username_prefix',
            field=models.CharField(blank=True, default='', max_length=80),
        ),
    ]
