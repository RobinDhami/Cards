from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0031_use_student_digital_card_template'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='additional_info_heading',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='additional_info_description',
            field=models.TextField(blank=True, default=''),
        ),
    ]
