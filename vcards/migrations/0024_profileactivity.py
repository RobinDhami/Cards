from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vcards', '0023_studentprofile_profile_category_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProfileActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('view', 'Card View'), ('download', 'vCard Download'), ('contact', 'Contact Action')], max_length=20)),
                ('action', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='vcards.studentprofile')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
