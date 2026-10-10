import django.db.models.deletion
from django.db import migrations, models
import hospitality.models


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0010_private_customer_feedback'), ('vcards', '0056_cardbatchcard_organization')]
    operations = [
        migrations.CreateModel(
            name='VenueStaffProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_identifier', models.CharField(default=hospitality.models.public_identifier, editable=False, max_length=64, unique=True)),
                ('name', models.CharField(max_length=160)), ('position', models.CharField(blank=True, max_length=120)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='venue_staff/')), ('bio', models.TextField(blank=True, max_length=1000)),
                ('is_active', models.BooleanField(default=False)), ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='staff_profiles', to='hospitality.venueprofile')),
            ], options={'ordering': ['display_order', 'name', 'id']},
        ),
        migrations.CreateModel(
            name='VenueStaffLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('link_type', models.CharField(choices=[('phone','Work phone'),('email','Work email'),('whatsapp','WhatsApp'),('website','Website'),('linkedin','LinkedIn'),('instagram','Instagram')], max_length=20)),
                ('label', models.CharField(max_length=80)), ('value', models.CharField(max_length=500)),
                ('display_order', models.PositiveIntegerField(default=0)), ('is_active', models.BooleanField(default=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links', to='hospitality.venuestaffprofile')),
            ], options={'ordering': ['display_order', 'id']},
        ),
        migrations.CreateModel(
            name='VenueTouchpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_identifier', models.CharField(default=hospitality.models.public_identifier, editable=False, max_length=64, unique=True)),
                ('name', models.CharField(max_length=120)), ('destination', models.CharField(choices=[('profile','Business profile'),('menu','Menu'),('feedback','Feedback')], default='profile', max_length=20)),
                ('is_active', models.BooleanField(default=True)), ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='touchpoints', to='hospitality.venueprofile')),
            ], options={'ordering': ['name', 'id'], 'constraints': [models.UniqueConstraint(fields=('venue','name'), name='venue_touchpoint_name_unique')]},
        ),
        migrations.CreateModel(
            name='VenueCardAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_identifier', models.CharField(default=hospitality.models.public_identifier, editable=False, max_length=64, unique=True)),
                ('is_active', models.BooleanField(default=True)), ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
                ('physical_card', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='venue_assignment', to='vcards.cardbatchcard')),
                ('staff', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='card_assignment', to='hospitality.venuestaffprofile')),
                ('touchpoint', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='card_assignment', to='hospitality.venuetouchpoint')),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='card_assignments', to='hospitality.venueprofile')),
            ], options={'constraints': [models.CheckConstraint(condition=models.Q(models.Q(('staff__isnull', False), ('touchpoint__isnull', True)), models.Q(('staff__isnull', True), ('touchpoint__isnull', False)), _connector='OR'), name='venue_card_assignment_exactly_one_target')]},
        ),
        migrations.AddIndex(model_name='venuestaffprofile', index=models.Index(fields=['venue','is_active','display_order'], name='hospitality_venue_i_f27b29_idx')),
    ]
