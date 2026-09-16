from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('vcards', '0043_member_usernames')]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='password_change_required',
            field=models.BooleanField(default=False),
        ),
    ]
