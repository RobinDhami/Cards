from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0025_venue_kitchen_access')]

    operations = [
        migrations.AddField(
            model_name='venueorder',
            name='cancellation_reason',
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name='venueorder',
            name='table_session_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='VenueWaiterCall',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('acknowledged', 'Acknowledged')], default='pending', max_length=20)),
                ('note', models.CharField(blank=True, max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('table', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waiter_calls', to='hospitality.venuetouchpoint')),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waiter_calls', to='hospitality.venueprofile')),
            ],
            options={'ordering': ['-created_at', '-id']},
        ),
        migrations.AddIndex(
            model_name='venuewaitercall',
            index=models.Index(fields=['venue', 'status', 'created_at'], name='hospitality_venue_i_23332e_idx'),
        ),
    ]
