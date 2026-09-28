import uuid

from django.db import migrations, models


def populate_public_identifiers(apps, schema_editor):
    HotelService = apps.get_model('hotels', 'HotelService')
    MenuItem = apps.get_model('hotels', 'MenuItem')
    for model in (HotelService, MenuItem):
        for record in model.objects.filter(public_identifier__isnull=True):
            record.public_identifier = str(uuid.uuid4())
            record.save(update_fields=['public_identifier'])


class Migration(migrations.Migration):
    dependencies = [('hotels', '0002_alter_gueststay_hotel_alter_hotelorder_hotel_and_more')]

    operations = [
        migrations.AddField(
            model_name='hotelservice', name='public_identifier',
            field=models.CharField(max_length=36, null=True, unique=True, editable=False),
        ),
        migrations.AddField(
            model_name='menuitem', name='public_identifier',
            field=models.CharField(max_length=36, null=True, unique=True, editable=False),
        ),
        migrations.RunPython(populate_public_identifiers, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='hotelservice', name='public_identifier',
            field=models.CharField(default=uuid.uuid4, editable=False, max_length=36, unique=True),
        ),
        migrations.AlterField(
            model_name='menuitem', name='public_identifier',
            field=models.CharField(default=uuid.uuid4, editable=False, max_length=36, unique=True),
        ),
    ]
