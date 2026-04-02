from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0022_studentprofile_contact_template_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studentprofile',
            name='college',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='vcards.college'),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='organization_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='profile_category',
            field=models.CharField(choices=[('school', 'School / College Profile'), ('professional', 'Independent Professional')], default='school', max_length=20),
        ),
    ]
