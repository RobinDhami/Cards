from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('vcards', '0056_cardbatchcard_organization')]

    operations = [
        migrations.CreateModel(
            name='OrganizationTeamMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invite_email', models.EmailField(blank=True, max_length=254)),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('manager', 'Manager'), ('menu_editor', 'Menu editor')], default='manager', max_length=20)),
                ('status', models.CharField(choices=[('active', 'Active'), ('invited', 'Invited')], default='active', max_length=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_members', to='vcards.college')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='organization_team_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['role', 'id']},
        ),
        migrations.CreateModel(
            name='OrganizationNotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('new_feedback_email', models.BooleanField(default=True)),
                ('low_rating_feedback_email', models.BooleanField(default=True)),
                ('weekly_summary_email', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preferences', to='vcards.college')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='organization_notification_preferences', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(model_name='organizationteammember', constraint=models.UniqueConstraint(fields=('organization', 'user'), name='organization_team_member_unique_user')),
        migrations.AddConstraint(model_name='organizationnotificationpreference', constraint=models.UniqueConstraint(fields=('organization', 'user'), name='organization_notification_preference_unique_user')),
    ]
