from django.db import migrations


def normalize_club_members(apps, schema_editor):
    College = apps.get_model('vcards', 'College')
    StudentProfile = apps.get_model('vcards', 'StudentProfile')
    club_ids = College.objects.filter(organization_type='club').values_list('id', flat=True)
    StudentProfile.objects.filter(college_id__in=club_ids).exclude(member_type='member').update(member_type='member')


class Migration(migrations.Migration):
    dependencies = [
        ('vcards', '0047_college_club_zone_clubevent'),
    ]

    operations = [
        migrations.RunPython(normalize_club_members, migrations.RunPython.noop),
    ]
