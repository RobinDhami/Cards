from django.db import migrations, models
import django.utils.timezone


def normalize_feedback_statuses(apps, schema_editor):
    feedback = apps.get_model('hospitality', 'VenueFeedback')
    feedback.objects.filter(status='reviewed').update(status='in_progress')
    feedback.objects.filter(status='archived').update(status='resolved')


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0009_menu_management')]

    operations = [
        migrations.AddField(
            model_name='venuefeedback', name='contact_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='venuefeedback', name='contact_name',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='venuefeedback', name='contact_phone',
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AddField(
            model_name='venuefeedback', name='internal_note',
            field=models.TextField(blank=True, max_length=5000),
        ),
        migrations.AddField(
            model_name='venuefeedback', name='touchpoint_source',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='venuefeedback', name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(normalize_feedback_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='venuefeedback', name='status',
            field=models.CharField(
                choices=[('new', 'New'), ('in_progress', 'In progress'), ('resolved', 'Resolved')],
                default='new', max_length=20,
            ),
        ),
    ]
