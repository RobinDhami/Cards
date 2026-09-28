from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
import json

from .models import AnalyticsEvent, GuestAccessSession, GuestStay, Hotel, HotelFeatureSettings, HotelLink, HotelMembership, HotelOffer, HotelOrderItem, HotelPackageEntitlement, HotelTheme, MenuCategory, MenuItem, NfcTouchpoint, Room, ServiceCategory, HotelService, ServiceRequest
from .entitlements import effective_modules
from .services import create_order, issue_guest_access_code, resolve_hotel_for_user


class HotelFoundationTests(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.user = self.User.objects.create_user(username='hotel.manager', password='password')
        self.other_user = self.User.objects.create_user(username='other.manager', password='password')
        self.hotel = Hotel.objects.create(name='Aurora', slug='aurora')
        self.other_hotel = Hotel.objects.create(name='Borealis', slug='borealis')
        HotelMembership.objects.create(user=self.user, hotel=self.hotel, role='manager')
        self.room = Room.objects.create(hotel=self.hotel, identifier='101')
        self.category = MenuCategory.objects.create(hotel=self.hotel, name='Breakfast', slug='breakfast')
        self.item = MenuItem.objects.create(hotel=self.hotel, category=self.category, name='Pancakes', price=Decimal('10.00'))

    def test_membership_resolution_requires_active_hotel_membership(self):
        self.assertEqual(resolve_hotel_for_user(self.user, self.hotel.pk), self.hotel)
        membership = HotelMembership.objects.get(user=self.user, hotel=self.hotel)
        self.assertEqual(membership.role, 'manager')
        membership.is_active = False
        membership.save()
        with self.assertRaises(PermissionDenied):
            resolve_hotel_for_user(self.user, self.hotel.pk)
        membership.is_active = True
        membership.save()
        with self.assertRaises(PermissionDenied):
            resolve_hotel_for_user(self.user, self.other_hotel.pk)
        with self.assertRaises(PermissionDenied):
            resolve_hotel_for_user(self.other_user, self.hotel.pk)

    def test_hotel_scoped_uniqueness(self):
        Room.objects.create(hotel=self.other_hotel, identifier='101')
        with self.assertRaises(IntegrityError):
            Room.objects.create(hotel=self.hotel, identifier='101')

    def test_cross_hotel_relationships_are_rejected(self):
        other_category = MenuCategory.objects.create(hotel=self.other_hotel, name='Other', slug='other')
        invalid_item = MenuItem(hotel=self.hotel, category=other_category, name='Invalid', price=Decimal('1.00'))
        with self.assertRaises(ValidationError):
            invalid_item.full_clean()
        other_room = Room.objects.create(hotel=self.other_hotel, identifier='202')
        stay = GuestStay(hotel=self.hotel, room=other_room, check_in_at='2026-01-01T10:00:00Z', token_expires_at='2026-01-02T10:00:00Z', access_token_hash='x' * 64)
        with self.assertRaises(ValidationError):
            stay.save()

        other_service_category = ServiceCategory.objects.create(hotel=self.other_hotel, name='Other', slug='other-service')
        other_service = HotelService.objects.create(hotel=self.other_hotel, category=other_service_category, name='Other Service')
        with self.assertRaises(ValidationError):
            ServiceRequest(hotel=self.hotel, room=other_room, guest_stay=stay, service=other_service).save()
        with self.assertRaises(ValidationError):
            HotelOrderItem(order=create_order(hotel=self.hotel, room=self.room, items=[{'menu_item': self.item, 'quantity': 1}]), menu_item=MenuItem.objects.create(hotel=self.other_hotel, category=other_category, name='Other Item', price=Decimal('2.00')), item_name_snapshot='Other Item', unit_price_snapshot=Decimal('2.00'), quantity=1, line_total=Decimal('2.00')).save()
        with self.assertRaises(ValidationError):
            NfcTouchpoint(hotel=self.hotel, room=other_room, label='Invalid').save()

    def test_guest_token_is_non_sequential_and_stored_as_hash(self):
        raw, digest = GuestStay.issue_token()
        self.assertNotEqual(raw, digest)
        self.assertEqual(len(digest), 64)
        self.assertEqual(GuestStay.hash_token(raw), digest)
        stay, returned_raw = GuestStay.create_with_token(
            hotel=self.hotel, room=self.room, check_in_at='2026-01-01T10:00:00Z',
            token_expires_at='2026-01-02T10:00:00Z',
        )
        self.assertNotEqual(returned_raw, stay.access_token_hash)
        self.assertEqual(stay.access_token_hash, GuestStay.hash_token(returned_raw))
        self.assertTrue(stay.matches_token(returned_raw))
        self.assertFalse(stay.matches_token('wrong-token'))

    def test_order_totals_and_menu_snapshots_are_calculated_server_side(self):
        order = create_order(hotel=self.hotel, room=self.room, items=[{'menu_item': self.item, 'quantity': 2}])
        self.assertEqual(order.subtotal, Decimal('20.00'))
        self.assertEqual(order.total, Decimal('20.00'))
        line = HotelOrderItem.objects.get(order=order)
        self.assertEqual((line.item_name_snapshot, line.unit_price_snapshot, line.line_total), ('Pancakes', Decimal('10.00'), Decimal('20.00')))
        self.item.name = 'Renamed Pancakes'
        self.item.price = Decimal('99.00')
        self.item.save()
        line.refresh_from_db()
        self.assertEqual((line.item_name_snapshot, line.unit_price_snapshot), ('Pancakes', Decimal('10.00')))

    def test_historical_orders_and_requests_are_protected_from_parent_deletion(self):
        order = create_order(hotel=self.hotel, room=self.room, items=[{'menu_item': self.item, 'quantity': 1}])
        service_category = ServiceCategory.objects.create(hotel=self.hotel, name='Housekeeping', slug='housekeeping')
        service = HotelService.objects.create(hotel=self.hotel, category=service_category, name='Towels')
        request = ServiceRequest.objects.create(hotel=self.hotel, room=self.room, service=service)
        with self.assertRaises(ProtectedError):
            self.room.delete()
        self.assertTrue(HotelOrderItem.objects.filter(order=order).exists())
        self.assertTrue(ServiceRequest.objects.filter(pk=request.pk).exists())
        with self.assertRaises(ProtectedError):
            self.hotel.delete()

    def test_analytics_rejects_unapproved_metadata_keys_and_cross_hotel_links(self):
        event = AnalyticsEvent(hotel=self.hotel, event_type='home_viewed', metadata={'password': 'secret'})
        with self.assertRaises(ValidationError):
            event.save()

    def test_hotel_feature_settings_have_safe_defaults_and_validate_combinations(self):
        features = HotelFeatureSettings.objects.get(hotel=self.hotel)
        self.assertEqual((features.menu_mode, features.service_mode, features.guest_access_enabled), ('view_only', 'view_only', False))
        features.menu_mode = 'ordering'
        with self.assertRaises(ValidationError):
            features.save()
        features.menu_mode = 'view_only'
        features.service_mode = 'whatsapp'
        with self.assertRaises(ValidationError):
            features.save()


class HotelGuestApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.hotel = Hotel.objects.create(name='Aurora', slug='aurora', google_review_url='https://reviews.example/aurora')
        HotelFeatureSettings.objects.update_or_create(hotel=self.hotel, defaults={'menu_mode': 'ordering', 'service_mode': 'digital_request', 'guest_access_enabled': True})
        HotelTheme.objects.create(hotel=self.hotel)
        HotelLink.objects.create(hotel=self.hotel, link_type='location', label='Location', value='https://maps.example/aurora')
        self.room = Room.objects.create(hotel=self.hotel, identifier='101')
        self.other_hotel = Hotel.objects.create(name='Borealis', slug='borealis')
        self.other_room = Room.objects.create(hotel=self.other_hotel, identifier='101')
        self.touchpoint = NfcTouchpoint.objects.create(hotel=self.hotel, room=self.room, touchpoint_type='room', label='Room 101')
        self.other_touchpoint = NfcTouchpoint.objects.create(hotel=self.other_hotel, room=self.other_room, label='Other')
        self.stay, self.raw_token = GuestStay.create_with_token(hotel=self.hotel, room=self.room, status='active', check_in_at=timezone.now() - timedelta(hours=1), token_expires_at=timezone.now() + timedelta(hours=1))
        self.category = ServiceCategory.objects.create(hotel=self.hotel, name='Housekeeping', slug='housekeeping', display_order=1)
        self.service = HotelService.objects.create(hotel=self.hotel, category=self.category, name='Towels', display_order=1)
        self.menu_category = MenuCategory.objects.create(hotel=self.hotel, name='Breakfast', slug='breakfast', display_order=1)
        self.menu_item = MenuItem.objects.create(hotel=self.hotel, category=self.menu_category, name='Pancakes', price=Decimal('10.00'), display_order=1)
        self.url = lambda name: reverse(name, args=[self.touchpoint.public_identifier])

    def auth_headers(self):
        return {'HTTP_X_GUEST_TOKEN': self.raw_token}

    def test_guest_access_activation_status_cookie_and_logout(self):
        code = issue_guest_access_code(self.stay)
        response = self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': code}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['verified'])
        self.assertIn('hotel_guest_access', response.cookies)
        self.assertTrue(response.cookies['hotel_guest_access']['httponly'])
        self.stay.refresh_from_db()
        self.assertNotEqual(code, self.stay.access_code_hash)
        self.assertTrue(self.stay.access_code_hash)
        session = GuestAccessSession.objects.get(stay=self.stay)
        self.assertNotIn(response.cookies['hotel_guest_access'].value, session.token_hash)
        status = self.client.get(self.url('hotel_guest_access_status_api'))
        self.assertTrue(status.json()['verified'])
        protected = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier, 'quantity': 1}), content_type='application/json', HTTP_IDEMPOTENCY_KEY='access-test-key-00001')
        self.assertEqual(protected.status_code, 201)
        logout = self.client.post(self.url('hotel_guest_access_logout_api'))
        self.assertEqual(logout.status_code, 200)
        session.refresh_from_db()
        self.assertIsNotNone(session.revoked_at)
        self.assertFalse(self.client.get(self.url('hotel_guest_access_status_api')).json()['verified'])

    def test_guest_access_rejects_wrong_code_and_cross_room(self):
        issue_guest_access_code(self.stay)
        response = self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': '000000'}), content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_guest_access_activation_requires_csrf_for_cookie_authentication(self):
        code = issue_guest_access_code(self.stay)
        csrf_client = Client(enforce_csrf_checks=True)
        response = csrf_client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': code}), content_type='application/json')
        self.assertEqual(response.status_code, 403)
        other_touchpoint = NfcTouchpoint.objects.create(hotel=self.hotel, room=Room.objects.create(hotel=self.hotel, identifier='202'), label='Room 202')
        response = self.client.post(reverse('hotel_guest_access_activate_api', args=[other_touchpoint.public_identifier]), data=json.dumps({'accessCode': '000000'}), content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_guest_access_expired_code_and_rotation_revoke_sessions(self):
        code = issue_guest_access_code(self.stay)
        self.stay.access_code_expires_at = timezone.now() - timedelta(minutes=1)
        self.stay.save(update_fields=['access_code_expires_at', 'updated_at'])
        self.assertEqual(self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': code}), content_type='application/json').status_code, 401)
        self.stay.access_code_expires_at = timezone.now() + timedelta(minutes=30)
        self.stay.save(update_fields=['access_code_expires_at', 'updated_at'])
        code = issue_guest_access_code(self.stay)
        self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': code}), content_type='application/json')
        old_session = GuestAccessSession.objects.get(stay=self.stay)
        issue_guest_access_code(self.stay)
        old_session.refresh_from_db()
        self.assertIsNotNone(old_session.revoked_at)
        self.assertFalse(self.client.get(self.url('hotel_guest_access_status_api')).json()['verified'])

    def test_public_context_is_guest_safe_and_resolves_active_touchpoint(self):
        response = self.client.get(self.url('hotel_guest_experience_api'))
        self.assertEqual(response.status_code, 200)
        payload = response.json()['experience']
        self.assertEqual(payload['hotel']['slug'], 'aurora')
        serialized = json.dumps(payload)
        self.assertNotIn('"id"', serialized)
        self.assertNotIn(self.stay.access_token_hash, serialized)
        self.assertEqual(payload['capabilities']['menuMode'], 'ordering')
        self.assertNotIn('guest_access_enabled', serialized)

    def test_view_only_and_whatsapp_modes_reject_digital_protected_actions(self):
        features = HotelFeatureSettings.objects.get(hotel=self.hotel)
        features.menu_mode = 'view_only'
        features.service_mode = 'view_only'
        features.guest_access_enabled = False
        features.save()
        self.assertEqual(self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': []}), content_type='application/json', **self.auth_headers()).status_code, 403)
        self.assertEqual(self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier}), content_type='application/json', **self.auth_headers()).status_code, 403)
        self.hotel.whatsapp = '+9779800000000'
        self.hotel.save(update_fields=['whatsapp', 'updated_at'])
        features.service_mode = 'whatsapp'
        features.save()
        self.assertEqual(self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier}), content_type='application/json', **self.auth_headers()).status_code, 403)
        self.assertEqual(self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': '000000'}), content_type='application/json').status_code, 403)

    def test_unknown_or_inactive_touchpoint_is_not_available(self):
        self.assertEqual(self.client.get(reverse('hotel_guest_experience_api', args=['missing'])).status_code, 404)
        self.touchpoint.is_active = False
        self.touchpoint.save()
        self.assertEqual(self.client.get(self.url('hotel_guest_experience_api')).status_code, 404)

    def test_services_and_menu_are_ordered_and_hide_inactive_records(self):
        inactive = HotelService.objects.create(hotel=self.hotel, category=self.category, name='Closed', is_active=False)
        response = self.client.get(self.url('hotel_guest_services_api'))
        self.assertEqual(response.json()['categories'][0]['services'][0]['identifier'], self.service.public_identifier)
        self.assertNotIn(inactive.public_identifier, json.dumps(response.json()))
        response = self.client.get(self.url('hotel_guest_menu_api'))
        self.assertEqual(response.json()['currency'], self.hotel.currency)
        self.assertEqual(response.json()['categories'][0]['items'][0]['identifier'], self.menu_item.public_identifier)
        self.menu_item.is_available = False
        self.menu_item.save()
        self.assertNotIn(self.menu_item.public_identifier, json.dumps(self.client.get(self.url('hotel_guest_menu_api')).json()))

    def test_protected_actions_require_valid_active_unexpired_token(self):
        missing = self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': []}), content_type='application/json')
        self.assertEqual(missing.status_code, 401)
        invalid = self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': []}), content_type='application/json', **{'HTTP_X_GUEST_TOKEN': 'wrong'})
        self.assertEqual(invalid.status_code, 401)
        self.stay.status = 'completed'
        self.stay.save()
        expired = self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': []}), content_type='application/json', **self.auth_headers())
        self.assertEqual(expired.status_code, 401)

    def test_service_request_rejects_malformed_input_and_accepts_valid_request(self):
        malformed = self.client.post(self.url('hotel_guest_service_request_api'), data='{', content_type='application/json', **self.auth_headers())
        self.assertEqual(malformed.status_code, 400)
        response = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier, 'quantity': 2, 'guestNote': 'Please bring towels.'}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY='service-request-key-00001')
        self.assertEqual(response.status_code, 201)
        request_record = ServiceRequest.objects.get()
        self.assertEqual((request_record.hotel_id, request_record.room_id, request_record.guest_stay_id), (self.hotel.id, self.room.id, self.stay.id))
        self.assertEqual(request_record.status, 'pending')
        self.assertEqual(len(request_record.public_identifier), 36)
        self.assertEqual(request_record.service_name_snapshot, 'Towels')
        self.assertNotIn('"id"', json.dumps(response.json()))
        self.service.name = 'Renamed Towels'
        self.service.save(update_fields=['name'])
        request_record.refresh_from_db()
        self.assertEqual(request_record.service_name_snapshot, 'Towels')

    def test_service_request_idempotency_replays_once_and_changed_payload_conflicts(self):
        key = 'service-replay-key-0001'
        payload = {'serviceIdentifier': self.service.public_identifier, 'quantity': 1}
        first = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps(payload), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY=key)
        second = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps(payload), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY=key)
        changed = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier, 'quantity': 2}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual((first.status_code, second.status_code, changed.status_code), (201, 200, 409))
        self.assertTrue(second.json()['idempotentReplay'])
        self.assertEqual(ServiceRequest.objects.count(), 1)
        self.assertEqual(AnalyticsEvent.objects.filter(event_type='service_request_submitted').count(), 1)

    def test_service_request_enforces_note_and_requested_time_rules(self):
        self.service.allows_guest_note = False
        self.service.save(update_fields=['allows_guest_note'])
        note = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier, 'guestNote': 'Do not accept'}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY='service-note-key-0001')
        naive = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier, 'requestedTime': '2026-09-19T10:00:00'}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY='service-time-key-0001')
        self.assertEqual((note.status_code, naive.status_code), (400, 400))

    def test_service_request_rejects_inactive_or_cross_hotel_service(self):
        self.service.is_active = False
        self.service.save(update_fields=['is_active'])
        inactive = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': self.service.public_identifier}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY='service-inactive-key-01')
        other_category = ServiceCategory.objects.create(hotel=self.other_hotel, name='Other', slug='other')
        other_service = HotelService.objects.create(hotel=self.other_hotel, category=other_category, name='Other service')
        cross_hotel = self.client.post(self.url('hotel_guest_service_request_api'), data=json.dumps({'serviceIdentifier': other_service.public_identifier}), content_type='application/json', **self.auth_headers(), HTTP_IDEMPOTENCY_KEY='service-cross-key-01')
        self.assertEqual((inactive.status_code, cross_hotel.status_code), (404, 404))

    def test_order_uses_server_prices_and_snapshots(self):
        response = self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': [{'menuItemIdentifier': self.menu_item.public_identifier, 'quantity': 2}], 'subtotal': '0.01', 'total': '0.01'}), content_type='application/json', **self.auth_headers(), **{'HTTP_IDEMPOTENCY_KEY': 'test-order-key-000001'})
        self.assertEqual(response.status_code, 201)
        order = self.hotel.orders.get()
        self.assertEqual((order.subtotal, order.total), (Decimal('20.00'), Decimal('20.00')))
        self.menu_item.name = 'Changed'
        self.menu_item.price = Decimal('99.00')
        self.menu_item.save()
        line = order.items.get()
        self.assertEqual((line.item_name_snapshot, line.unit_price_snapshot), ('Pancakes', Decimal('10.00')))

    def test_cross_touchpoint_context_is_forbidden(self):
        response = self.client.post(reverse('hotel_guest_order_api', args=[self.other_touchpoint.public_identifier]), data=json.dumps({'items': []}), content_type='application/json', **self.auth_headers())
        self.assertEqual(response.status_code, 403)

    def test_order_idempotency_replays_without_duplicate_or_duplicate_analytics(self):
        code = issue_guest_access_code(self.stay)
        self.assertEqual(self.client.post(self.url('hotel_guest_access_activate_api'), data=json.dumps({'accessCode': code}), content_type='application/json').status_code, 200)
        payload = json.dumps({'items': [{'menuItemIdentifier': self.menu_item.public_identifier, 'quantity': 1}]})
        headers = {'HTTP_IDEMPOTENCY_KEY': 'replay-order-key-00001'}
        first = self.client.post(self.url('hotel_guest_order_api'), data=payload, content_type='application/json', **headers)
        second = self.client.post(self.url('hotel_guest_order_api'), data=payload, content_type='application/json', **headers)
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertTrue(second.json()['idempotentReplay'])
        self.assertEqual(self.hotel.orders.count(), 1)
        self.assertEqual(AnalyticsEvent.objects.filter(event_type='order_submitted').count(), 1)
        changed = self.client.post(self.url('hotel_guest_order_api'), data=json.dumps({'items': [{'menuItemIdentifier': self.menu_item.public_identifier, 'quantity': 2}]}), content_type='application/json', **headers)
        self.assertEqual(changed.status_code, 409)

    def test_offer_filtering_review_click_analytics_and_rate_limit(self):
        HotelOffer.objects.create(hotel=self.hotel, title='Expired', is_active=True, ends_at=timezone.now() - timedelta(days=1))
        HotelOffer.objects.create(hotel=self.hotel, title='Current', is_active=True, starts_at=timezone.now() - timedelta(hours=1), ends_at=timezone.now() + timedelta(hours=1))
        context = self.client.get(self.url('hotel_guest_experience_api')).json()['experience']
        self.assertEqual(context['offer']['title'], 'Current')
        click = self.client.post(self.url('hotel_guest_google_review_click_api'), data='{}', content_type='application/json', **self.auth_headers())
        self.assertEqual(click.status_code, 200)
        self.assertTrue(AnalyticsEvent.objects.filter(event_type='google_review_opened').exists())
        bad = self.client.post(self.url('hotel_guest_analytics_api'), data=json.dumps({'eventType': 'not-approved', 'metadata': {}}), content_type='application/json')
        self.assertEqual(bad.status_code, 400)
        for _ in range(10):
            self.client.post(self.url('hotel_guest_review_api'), data=json.dumps({'rating': 5}), content_type='application/json', **self.auth_headers())
        self.assertEqual(self.client.post(self.url('hotel_guest_review_api'), data=json.dumps({'rating': 5}), content_type='application/json', **self.auth_headers()).status_code, 429)
        other_room = Room.objects.create(hotel=self.other_hotel, identifier='202')
        event = AnalyticsEvent(hotel=self.hotel, room=other_room, event_type='home_viewed')
        with self.assertRaises(ValidationError):
            event.save()


class HotelAdminApiTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(username='hotel.platform', password='password')
        self.staff = get_user_model().objects.create_user(username='hotel.staff', password='password')
        self.hotel = Hotel.objects.create(name='Aurora Admin', slug='aurora-admin')
        self.room = Room.objects.create(hotel=self.hotel, identifier='101')
        self.touchpoint = NfcTouchpoint.objects.create(hotel=self.hotel, room=self.room, label='Room 101')

    def test_super_admin_can_list_hotels_and_touchpoint_links(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse('hotel_directory_api'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['total'], 1)
        hotel = response.json()['hotels'][0]
        self.assertEqual((hotel['name'], hotel['roomCount'], hotel['touchpointCount']), ('Aurora Admin', 1, 1))
        detail = self.client.get(reverse('hotel_detail_api', args=[self.hotel.id]))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()['touchpoints'][0]['guestUrl'], f'/guest/{self.touchpoint.public_identifier}')

    def test_non_super_admin_cannot_access_hotel_directory(self):
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get(reverse('hotel_directory_api')).status_code, 403)

    def test_super_admin_can_create_hotel_and_update_theme(self):
        self.client.force_login(self.admin)
        response = self.client.post(reverse('hotel_directory_api'), data=json.dumps({'name': 'Hotel North', 'slug': 'hotel-north', 'currency': 'npr'}), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        hotel_id = response.json()['hotel']['id']
        response = self.client.patch(reverse('hotel_detail_api', args=[hotel_id]), data=json.dumps({'template_identifier': 'minimal', 'primary_color': '#123456'}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['hotel']['templateIdentifier'], 'minimal')
        self.assertEqual(HotelTheme.objects.get(hotel_id=hotel_id).primary_color, '#123456')

    def test_touchpoint_creation_rejects_foreign_room(self):
        other_hotel = Hotel.objects.create(name='Other Hotel', slug='other-hotel')
        other_room = Room.objects.create(hotel=other_hotel, identifier='201')
        self.client.force_login(self.admin)
        response = self.client.post(reverse('hotel_touchpoint_api', args=[self.hotel.id]), data=json.dumps({'label': 'Wrong room', 'roomId': other_room.id}), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(NfcTouchpoint.objects.filter(label='Wrong room').exists())

    def test_manager_is_limited_to_active_hotel_membership(self):
        manager = get_user_model().objects.create_user(username='hotel.manager', password='password')
        HotelMembership.objects.create(user=manager, hotel=self.hotel, role='manager', is_active=True)
        other = Hotel.objects.create(name='Other Admin Hotel', slug='other-admin-hotel')
        self.client.force_login(manager)
        self.assertEqual(self.client.get(reverse('hotel_detail_api', args=[self.hotel.id])).status_code, 200)
        self.assertEqual(self.client.get(reverse('hotel_detail_api', args=[other.id])).status_code, 403)
        self.assertEqual(self.client.post(reverse('hotel_rooms_api', args=[self.hotel.id]), data=json.dumps({'identifier': '201'}), content_type='application/json').status_code, 201)

    def test_package_entitlements_and_platform_assignment(self):
        modules = effective_modules(self.hotel)
        self.assertIn('menu_catalog', modules)
        self.assertNotIn('orders', modules)
        self.client.force_login(self.admin)
        response = self.client.patch(reverse('hotel_package_api', args=[self.hotel.id]), data=json.dumps({'package': HotelPackageEntitlement.SMART_GUEST}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('orders', {item['key'] for item in response.json()['modules'] if item['enabled']})
        self.client.force_login(self.staff)
        self.assertEqual(self.client.patch(reverse('hotel_package_api', args=[self.hotel.id]), data=json.dumps({'package': HotelPackageEntitlement.DIGITAL_GUIDE}), content_type='application/json').status_code, 403)

    def test_manager_can_manage_dynamic_menu_when_entitled(self):
        manager = get_user_model().objects.create_user(username='menu.manager', password='password')
        HotelMembership.objects.create(user=manager, hotel=self.hotel, role='manager', is_active=True)
        self.client.force_login(manager)
        response = self.client.post(reverse('hotel_menu_api', args=[self.hotel.id]), data=json.dumps({'categoryName': 'Breakfast', 'name': 'Pancakes', 'price': '12.50'}), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['item']['price'], '12.50')
        self.assertEqual(self.client.get(reverse('hotel_menu_api', args=[self.hotel.id])).status_code, 200)
