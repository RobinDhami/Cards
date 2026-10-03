from django.db import migrations, models


def consolidate_hospitality_types(apps, schema_editor):
    College = apps.get_model('vcards', 'College')
    VenueProfile = apps.get_model('hospitality', 'VenueProfile')
    for organization in College.objects.filter(organization_type__in=['hotel', 'cafe']):
        venue_type = organization.organization_type
        organization.organization_type = 'hospitality'
        organization.save(update_fields=['organization_type'])
        VenueProfile.objects.filter(organization_id=organization.pk).update(venue_type=venue_type)


class Migration(migrations.Migration):
    dependencies = [
        ('hospitality', '0002_venueprofile_hotel_type'),
        ('vcards', '0052_hotel_cafe_organization_types'),
    ]

    operations = [
        migrations.RunPython(consolidate_hospitality_types, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='college',
            name='organization_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('education', 'Education'),
                    ('club', 'Club'),
                    ('business', 'Business'),
                    ('hospitality', 'Hospitality'),
                    ('other', 'Other'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
