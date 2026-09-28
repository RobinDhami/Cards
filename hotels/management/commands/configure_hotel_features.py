from django.core.management.base import BaseCommand, CommandError

from hotels.models import Hotel, HotelFeatureSettings
from hotels.services import hotel_capabilities


class Command(BaseCommand):
    help = 'Configure the guest-experience capabilities for a hotel.'

    def add_arguments(self, parser):
        parser.add_argument('hotel_slug')
        parser.add_argument('--menu-mode', choices=['view_only', 'ordering'], required=True)
        parser.add_argument('--service-mode', choices=['view_only', 'whatsapp', 'digital_request'], required=True)
        access = parser.add_mutually_exclusive_group(required=True)
        access.add_argument('--guest-access-enabled', action='store_true')
        access.add_argument('--guest-access-disabled', action='store_true')

    def handle(self, *args, **options):
        try:
            hotel = Hotel.objects.get(slug=options['hotel_slug'])
        except Hotel.DoesNotExist as exc:
            raise CommandError('Hotel not found.') from exc
        settings, _ = HotelFeatureSettings.objects.get_or_create(hotel=hotel)
        settings.menu_mode = options['menu_mode']
        settings.service_mode = options['service_mode']
        settings.guest_access_enabled = options['guest_access_enabled']
        try:
            settings.save()
        except Exception as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(f'Configured {hotel.name}: {hotel_capabilities(hotel)}'))
