from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client, TestCase

from vcards.models import College
from .models import VenueMenuCategory, VenueMenuItem, VenueProfile


class HospitalityWorkspaceTests(TestCase):
    def setUp(self):
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

    def test_anonymous_feedback_is_created(self):
        response = self.client.post(f'/api/venue/{self.venue.public_identifier}/feedback/', {'rating': 5, 'comment': 'Lovely'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.venue.feedback.count(), 1)
