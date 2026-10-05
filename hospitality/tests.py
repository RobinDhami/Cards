from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import Client, TestCase

from vcards.models import College
from .models import VenueAnalyticsEvent, VenueMenuCategory, VenueMenuItem, VenueProfile


class HospitalityWorkspaceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username='venue-admin', password='pass')
        self.org = College.objects.create(name='Aurora Cafe', organization_code='AURORA', organization_type='hospitality', admin_user=self.user)
        self.venue = VenueProfile.objects.create(organization=self.org)
        self.category = VenueMenuCategory.objects.create(venue=self.venue, name='Breakfast', slug='breakfast')
        VenueMenuItem.objects.create(venue=self.venue, category=self.category, name='Pancakes', price='12.00', is_today_special=True)

    def test_public_payload_contains_active_ordered_menu(self):
        response = self.client.get(f'/api/venue/{self.venue.public_identifier}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['categories'][0]['items'][0]['name'], 'Pancakes')

    def test_menu_item_rejects_cross_venue_category(self):
        other = VenueProfile.objects.create(organization=College.objects.create(name='Other Cafe', organization_code='OTHER'))
        foreign = VenueMenuCategory.objects.create(venue=other, name='Other', slug='other')
        item = VenueMenuItem(venue=self.venue, category=foreign, name='Invalid', price='1.00')
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_management_requires_organization_membership(self):
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/')
        self.assertEqual(response.status_code, 403)
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/').status_code, 200)

    def test_empty_cafe_receives_useful_default_categories(self):
        self.venue.menu_items.all().delete()
        self.category.delete()
        self.venue.venue_type = 'cafe'
        self.venue.save(update_fields=['venue_type'])
        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/menu/categories/')
        names = [category['name'] for category in response.json()['categories']]
        self.assertIn('Beverages', names)
        self.assertIn('Offers', names)

    def test_anonymous_feedback_is_created(self):
        response = self.client.post(f'/api/venue/{self.venue.public_identifier}/feedback/', {'rating': 5, 'comment': 'Lovely'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.venue.feedback.count(), 1)

    def test_menu_item_accepts_multipart_boolean_values(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {
                'category_id': self.category.pk,
                'name': 'Masala Tea',
                'price': '85',
                'original_price': '',
                'is_available': 'true',
                'is_today_special': 'false',
                'is_offer': 'false',
            },
        )
        self.assertEqual(response.status_code, 201)
        item = VenueMenuItem.objects.get(name='Masala Tea')
        self.assertTrue(item.is_available)
        self.assertFalse(item.is_today_special)
        self.assertFalse(item.is_offer)

    def test_public_activity_is_tracked_and_visible_to_admin(self):
        self.client.get(f'/api/venue/{self.venue.public_identifier}/')
        self.client.post(
            f'/api/venue/{self.venue.public_identifier}/track/',
            {'eventType': 'social_click', 'target': 'instagram'},
            content_type='application/json',
        )
        self.assertEqual(VenueAnalyticsEvent.objects.filter(venue=self.venue).count(), 2)
        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/analytics/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['analytics']['totals']['profile_view'], 1)
        self.assertEqual(response.json()['analytics']['socialClicks'][0]['target'], 'instagram')

    def test_analytics_requires_organization_membership(self):
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/analytics/')
        self.assertEqual(response.status_code, 403)
