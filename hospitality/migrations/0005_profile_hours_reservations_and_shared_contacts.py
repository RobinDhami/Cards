from django.db import migrations, models


def move_shared_contacts_to_organization(apps, schema_editor):
    VenueProfile = apps.get_model('hospitality', 'VenueProfile')
    VenueLink = apps.get_model('hospitality', 'VenueLink')
    College = apps.get_model('vcards', 'College')
    for venue in VenueProfile.objects.select_related('organization').iterator():
        organization = College.objects.get(pk=venue.organization_id)
        changed = []
        for venue_field, organization_field in (
            ('phone', 'phone'),
            ('email', 'email'),
            ('website', 'website'),
            ('address', 'address'),
            ('map_url', 'map_url'),
        ):
            if not getattr(organization, organization_field) and getattr(venue, venue_field):
                value = getattr(venue, venue_field)
                setattr(organization, organization_field, value)
                changed.append(organization_field)
        if changed:
            organization.save(update_fields=changed)

    for link in VenueLink.objects.select_related('venue__organization').filter(
        link_type__in=('website', 'phone', 'map', 'google_review', 'whatsapp')
    ).order_by('id').iterator():
        venue = link.venue
        organization = venue.organization
        if link.link_type == 'website' and not organization.website:
            organization.website = link.value[:200]
            organization.save(update_fields=['website'])
        elif link.link_type == 'phone' and not organization.phone:
            organization.phone = link.value[:20]
            organization.save(update_fields=['phone'])
        elif link.link_type == 'map' and not organization.map_url:
            organization.map_url = link.value[:200]
            organization.save(update_fields=['map_url'])
        elif link.link_type == 'google_review' and not venue.google_review_url:
            venue.google_review_url = link.value[:200]
            venue.save(update_fields=['google_review_url'])
        elif link.link_type == 'whatsapp' and not venue.whatsapp:
            venue.whatsapp = link.value[:32]
            venue.save(update_fields=['whatsapp'])
        link.delete()


class Migration(migrations.Migration):
    dependencies = [
        ('hospitality', '0004_venueanalyticsevent'),
        ('vcards', '0054_alter_college_address_to_text'),
    ]

    operations = [
        migrations.AddField(
            model_name='venueprofile',
            name='opening_hours',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='venueprofile',
            name='reservation_url',
            field=models.URLField(blank=True),
        ),
        migrations.RunPython(move_shared_contacts_to_organization, migrations.RunPython.noop),
        migrations.RemoveField(model_name='venueprofile', name='phone'),
        migrations.RemoveField(model_name='venueprofile', name='email'),
        migrations.RemoveField(model_name='venueprofile', name='website'),
        migrations.RemoveField(model_name='venueprofile', name='address'),
        migrations.RemoveField(model_name='venueprofile', name='map_url'),
    ]
