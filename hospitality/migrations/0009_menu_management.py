from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
from decimal import Decimal


def normalize_special_categories(apps, schema_editor):
    Category = apps.get_model('hospitality', 'VenueMenuCategory')
    Item = apps.get_model('hospitality', 'VenueMenuItem')
    for category in Category.objects.all().order_by('venue_id', 'display_order', 'id').iterator():
        normalized = category.name.lower().replace("'", '').replace('’', '').strip()
        if normalized not in {'todays special', 'today special', 'offers', 'offer'}:
            continue
        target = Category.objects.filter(venue_id=category.venue_id).exclude(pk=category.pk).exclude(
            name__in=["Today's Special", 'Today’s Special', 'Offers', 'Offer']
        ).order_by('display_order', 'id').first()
        if target is None:
            target = Category.objects.create(
                venue_id=category.venue_id,
                name='Other',
                slug=f'other-{category.venue_id}',
                display_order=category.display_order,
            )
        updates = {'category_id': target.pk}
        if 'special' in normalized:
            updates['is_today_special'] = True
        else:
            updates['is_offer'] = True
            updates['offer_label'] = 'Offer'
        Item.objects.filter(category_id=category.pk).update(**updates)
        category.delete()


class Migration(migrations.Migration):
    dependencies = [('hospitality', '0008_business_profile_schedule')]

    operations = [
        migrations.AddField(model_name='venuemenuitem', name='is_published', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='venuemenuitem', name='special_starts_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venuemenuitem', name='special_ends_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venuemenuitem', name='offer_starts_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='venuemenuitem', name='offer_ends_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.CreateModel(
            name='VenueMenuItemVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=80)),
                ('price', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='price_variants', to='hospitality.venuemenuitem')),
            ],
            options={'ordering': ['display_order', 'id']},
        ),
        migrations.RunPython(normalize_special_categories, migrations.RunPython.noop),
    ]
