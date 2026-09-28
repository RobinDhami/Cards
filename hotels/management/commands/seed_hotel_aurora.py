from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from hotels.models import Hotel, HotelFeatureSettings, HotelLink, HotelMembership, HotelService, MenuCategory, MenuItem, NfcTouchpoint, Room, ServiceCategory, HotelOffer, HotelTheme


class Command(BaseCommand):
    help = 'Create or update idempotent Hotel Aurora development data.'

    def handle(self, *args, **options):
        User = get_user_model()
        user, _ = User.objects.get_or_create(username='aurora.manager', defaults={'email': 'manager@hotelaurora.example'})
        hotel, _ = Hotel.objects.update_or_create(slug='hotel-aurora', defaults={
            'name': 'Hotel Aurora', 'short_description': 'A calm stay beneath the northern lights.',
            'description': 'Hotel Aurora offers comfortable rooms, thoughtful service and memorable dining.',
            'phone': '+977-1-5550100', 'whatsapp': '+977-9800000000', 'email': 'hello@hotelaurora.example',
            'website': 'https://hotelaurora.example', 'address': 'Aurora Avenue, Kathmandu',
            'google_maps_url': 'https://maps.google.com/?q=Hotel+Aurora',
            'google_review_url': 'https://www.google.com/maps', 'time_zone': 'Asia/Kathmandu', 'currency': 'NPR',
        })
        HotelMembership.objects.update_or_create(user=user, hotel=hotel, defaults={'role': 'manager', 'is_active': True})
        HotelTheme.objects.update_or_create(hotel=hotel, defaults={'template_identifier': 'aurora'})
        HotelFeatureSettings.objects.update_or_create(hotel=hotel, defaults={'menu_mode': 'ordering', 'service_mode': 'digital_request', 'guest_access_enabled': True})
        for identifier, floor, room_type in [('101', '1', 'Deluxe'), ('102', '1', 'Deluxe'), ('201', '2', 'Suite')]:
            Room.objects.update_or_create(hotel=hotel, identifier=identifier, defaults={'floor': floor, 'room_type': room_type, 'is_active': True})
        services = {
            'Housekeeping': ('housekeeping', 'sparkles'), 'Laundry': ('laundry', 'shirt'),
            'Taxi / Airport Pickup': ('transport', 'car'), 'Spa': ('spa', 'flower-2'),
            'Extra Towels': ('towels', 'bed-double'), 'Late Checkout': ('late-checkout', 'timer'),
        }
        for order, (name, (slug, icon_identifier)) in enumerate(services.items()):
            category, _ = ServiceCategory.objects.update_or_create(hotel=hotel, slug=slug, defaults={'name': name, 'display_order': order})
            HotelService.objects.update_or_create(hotel=hotel, name=name, defaults={'category': category, 'short_description': f'{name} at Hotel Aurora', 'icon_identifier': icon_identifier, 'display_order': order, 'is_active': True})
        menu = {'Breakfast': ('breakfast', [('Pancake Breakfast', '850.00'),]), 'Main Course': ('main-course', [('Club Sandwich', '950.00'), ('Chicken Momo', '700.00')]), 'Snacks': ('snacks', []), 'Drinks': ('drinks', [('Cappuccino', '350.00'), ('Fresh Lime Soda', '300.00')])}
        for order, (name, (slug, items)) in enumerate(menu.items()):
            category, _ = MenuCategory.objects.update_or_create(hotel=hotel, slug=slug, defaults={'name': name, 'display_order': order})
            for item_order, (item_name, price) in enumerate(items):
                MenuItem.objects.update_or_create(hotel=hotel, category=category, name=item_name, defaults={'price': price, 'display_order': item_order, 'is_available': True})
        HotelOffer.objects.update_or_create(hotel=hotel, title='Aurora Welcome Offer', defaults={'short_description': 'Enjoy a complimentary welcome drink.', 'display_order': 0, 'is_active': True})
        links = [('location', 'Location', 'https://maps.google.com/?q=Hotel+Aurora'), ('instagram', 'Instagram', 'https://instagram.com/'), ('facebook', 'Facebook', 'https://facebook.com/'), ('whatsapp', 'WhatsApp', 'https://wa.me/9779800000000')]
        for order, (link_type, label, value) in enumerate(links):
            HotelLink.objects.update_or_create(hotel=hotel, link_type=link_type, defaults={'label': label, 'value': value, 'display_order': order, 'is_active': True})
        room = Room.objects.get(hotel=hotel, identifier='101')
        NfcTouchpoint.objects.get_or_create(hotel=hotel, public_identifier='aurora-room-101', defaults={'room': room, 'touchpoint_type': 'room', 'label': 'Room 101 Guest Touchpoint', 'destination': {'screen': 'home'}, 'is_active': True})
        self.stdout.write(self.style.SUCCESS('Hotel Aurora seed data is ready.'))
