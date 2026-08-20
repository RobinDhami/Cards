from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('professional_cards', '0014_professionalconnection'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionalconnection',
            name='blocked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='blocked_connections',
                to='professional_cards.professionalprofile',
            ),
        ),
        migrations.AlterField(
            model_name='professionalconnection',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('accepted', 'Accepted'),
                    ('rejected', 'Rejected'),
                    ('blocked', 'Blocked'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]
