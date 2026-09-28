from django.db import migrations


HOTEL_TABLES = [
    'hotels_analyticsevent', 'hotels_guestreview', 'hotels_nfctouchpoint',
    'hotels_hoteltheme', 'hotels_hotellink', 'hotels_hoteloffer',
    'hotels_hotelorderitem', 'hotels_hotelorder', 'hotels_menuitem',
    'hotels_menucategory', 'hotels_servicerequest', 'hotels_hotelservice',
    'hotels_servicecategory', 'hotels_guestaccesssession', 'hotels_gueststay',
    'hotels_room', 'hotels_hotelmembership', 'hotels_hotelfeaturesettings',
    'hotels_hotelpackageentitlement', 'hotels_hotel',
]


def remove_legacy_hotel_tables(apps, schema_editor):
    existing = set(schema_editor.connection.introspection.table_names())
    quote = schema_editor.quote_name
    for table in HOTEL_TABLES:
        if table in existing:
            schema_editor.execute(f'DROP TABLE {quote(table)}')


class Migration(migrations.Migration):
    dependencies = [('vcards', '0050_alter_platformaccess_options_and_more')]
    operations = [migrations.RunPython(remove_legacy_hotel_tables, migrations.RunPython.noop)]
