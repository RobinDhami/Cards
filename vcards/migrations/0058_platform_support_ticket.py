from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('vcards', '0057_organization_team_access')]

    operations = [
        migrations.CreateModel(
            name='PlatformSupportTicket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=180)),
                ('message', models.TextField()),
                ('category', models.CharField(choices=[('technical', 'Technical issue'), ('account', 'Account access'), ('billing', 'Billing'), ('other', 'Other')], default='technical', max_length=20)),
                ('priority', models.CharField(choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')], default='normal', max_length=12)),
                ('status', models.CharField(choices=[('open', 'Open'), ('in_progress', 'In progress'), ('resolved', 'Resolved')], default='open', max_length=16)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('requester', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='platform_support_tickets', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-updated_at', '-id']},
        ),
        migrations.AlterModelOptions(
            name='platformaccess',
            options={'default_permissions': (), 'permissions': [('access_platform_overview', 'Can access platform overview'), ('access_platform_organizations', 'Can access platform organizations'), ('access_platform_members', 'Can access platform members'), ('access_platform_professionals', 'Can access platform professional profiles'), ('access_platform_templates', 'Can access platform Template Studio'), ('access_platform_cards', 'Can access platform cards'), ('access_platform_card_operations', 'Can access platform card operations'), ('access_platform_activity', 'Can access platform activity'), ('access_platform_tickets', 'Can access platform support tickets'), ('access_platform_reports', 'Can access platform reports'), ('access_platform_settings', 'Can access platform settings')]},
        ),
    ]
