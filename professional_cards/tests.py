from django.contrib.auth.models import User
from django.test import TestCase

from .models import ProfessionalConnection, ProfessionalProfile, ProfessionalService


class OrganizationProfileTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='organization-owner', password='OwnerPass123!')
        self.profile = ProfessionalProfile.objects.create(
            owner=self.owner,
            full_name='Mina Rai',
            slug='digital-nepal',
            company_name='Digital Nepal',
            designation='Sales Manager',
            phone='+9779800000000',
            whatsapp_number='+9779811111111',
            email='hello@example.com',
            website='https://example.com',
            office_address='Kathmandu, Nepal',
            tiktok_url='https://www.tiktok.com/@digitalnepal',
            booking_url='https://example.com/demo',
            primary_cta_type='demo',
            business_hours='Mon - Fri, 9:00 AM - 6:00 PM',
        )
        self.offering = ProfessionalService.objects.create(
            profile=self.profile,
            title='Digital Identity',
            description='Digital identity solutions for organizations.',
            icon='shield-check',
            link='https://example.com/digital-identity',
        )

    def test_new_profiles_use_locked_modern_template_with_organization_focus(self):
        self.assertEqual(self.profile.template_name, 'modern_identity')
        self.assertEqual(self.profile.profile_focus, 'organization')
        self.assertEqual(ProfessionalProfile.TEMPLATE_CHOICES, [('modern_identity', 'Modern')])

    def test_public_payload_has_tracked_cta_and_offering_without_private_analytics(self):
        response = self.client.get('/api/professional-profiles/digital-nepal/')
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['profile']['profileFocus'], 'organization')
        self.assertEqual(payload['actions']['featuredCta']['label'], 'Request Demo')
        self.assertEqual(payload['actions']['featuredCta']['href'], '/p/digital-nepal/action/')
        self.assertEqual(
            [item['label'] for item in payload['actions']['organizationLinks']],
            ['WhatsApp', 'Email', 'Website', 'Map'],
        )
        self.assertIn('TikTok', [item['label'] for item in payload['actions']['extra']])
        self.assertEqual(payload['services'][0]['href'], f'/p/digital-nepal/offering/{self.offering.id}/')
        self.assertEqual(payload['actions']['analyticsUrl'], '')
        self.assertNotIn('views', payload)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.views, 1)

    def test_owner_preview_does_not_inflate_views_and_actions_are_counted(self):
        self.client.force_login(self.owner)
        owner_response = self.client.get('/api/professional-profiles/digital-nepal/')
        self.assertEqual(
            owner_response.json()['actions']['analyticsUrl'],
            '/p/digital-nepal/edit/#owner-analytics-title',
        )
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.views, 0)

        cta_response = self.client.get('/p/digital-nepal/action/')
        offering_response = self.client.get(f'/p/digital-nepal/offering/{self.offering.id}/')
        save_response = self.client.get('/p/digital-nepal/vcard/')
        self.profile.refresh_from_db()

        self.assertEqual(cta_response.status_code, 302)
        self.assertEqual(offering_response.status_code, 302)
        self.assertEqual(save_response.status_code, 200)
        self.assertEqual(self.profile.cta_clicks, 1)
        self.assertEqual(self.profile.offering_clicks, 1)
        self.assertEqual(self.profile.downloads, 1)


class ProfessionalConnectionApiTests(TestCase):
    def setUp(self):
        self.alex_user = User.objects.create_user(username='alex-id', password='AlexPass123!')
        self.blair_user = User.objects.create_user(username='blair-id', password='BlairPass123!')
        self.alex = ProfessionalProfile.objects.create(
            owner=self.alex_user,
            full_name='Alex Carter',
            slug='alex-carter',
            profession='Designer',
        )
        self.blair = ProfessionalProfile.objects.create(
            owner=self.blair_user,
            full_name='Blair Singh',
            slug='blair-singh',
            profession='Developer',
        )

    def test_connection_request_requires_valid_profile_credentials(self):
        response = self.client.post(
            '/api/professional-profiles/blair-singh/connect/',
            {'username': 'alex-id', 'password': 'wrong'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ProfessionalConnection.objects.exists())

    def test_signed_in_profile_sends_request_without_reentering_credentials(self):
        self.client.force_login(self.alex_user)

        response = self.client.post(
            '/api/professional-profiles/blair-singh/connect/',
            {},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            ProfessionalConnection.objects.filter(requester=self.alex, recipient=self.blair).exists()
        )

    def test_valid_account_without_professional_profile_gets_card_and_connects(self):
        account = User.objects.create_user(username='admin-only', password='AdminPass123!')

        response = self.client.post(
            '/api/professional-profiles/blair-singh/connect/',
            {'username': account.username, 'password': 'AdminPass123!'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        profile = ProfessionalProfile.objects.get(owner=account)
        self.assertEqual(profile.full_name, account.username)
        self.assertTrue(profile.is_active)
        self.assertTrue(ProfessionalConnection.objects.filter(requester=profile, recipient=self.blair).exists())

    def test_request_creates_recipient_notification_and_accepts(self):
        response = self.client.post(
            '/api/professional-profiles/blair-singh/connect/',
            {'username': 'alex-id', 'password': 'AlexPass123!'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        connection = ProfessionalConnection.objects.get()
        self.assertEqual(connection.requester, self.alex)
        self.assertEqual(connection.recipient, self.blair)
        self.assertEqual(connection.status, ProfessionalConnection.STATUS_PENDING)

        self.client.force_login(self.blair_user)
        notification_response = self.client.get('/api/connections/')
        notification_data = notification_response.json()
        self.assertEqual(notification_response.status_code, 200)
        self.assertEqual(notification_data['notificationCount'], 1)
        self.assertEqual(
            notification_data['notifications'][0]['notification'],
            'Alex Carter added you as a connection. Want to connect?',
        )

        accept_response = self.client.post(
            f'/api/connections/{connection.id}/respond/',
            {'action': 'accept'},
            content_type='application/json',
        )
        self.assertEqual(accept_response.status_code, 200)
        connection.refresh_from_db()
        self.assertEqual(connection.status, ProfessionalConnection.STATUS_ACCEPTED)

        self.client.force_login(self.alex_user)
        connections_response = self.client.get('/api/connections/')
        self.assertEqual(connections_response.status_code, 200)
        self.assertEqual(connections_response.json()['connections'][0]['person']['fullName'], 'Blair Singh')
        self.assertIn('phone', connections_response.json()['connections'][0]['person'])

    def test_recipient_can_reject_request(self):
        connection = ProfessionalConnection.objects.create(requester=self.alex, recipient=self.blair)
        self.client.force_login(self.blair_user)

        response = self.client.post(
            f'/api/connections/{connection.id}/respond/',
            {'action': 'reject'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        connection.refresh_from_db()
        self.assertEqual(connection.status, ProfessionalConnection.STATUS_REJECTED)

    def test_profile_cannot_connect_to_itself(self):
        response = self.client.post(
            '/api/professional-profiles/alex-carter/connect/',
            {'username': 'alex-id', 'password': 'AlexPass123!'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ProfessionalConnection.objects.exists())

    def test_either_person_can_remove_an_accepted_connection(self):
        connection = ProfessionalConnection.objects.create(
            requester=self.alex,
            recipient=self.blair,
            status=ProfessionalConnection.STATUS_ACCEPTED,
        )
        self.client.force_login(self.alex_user)

        response = self.client.post(
            f'/api/connections/{connection.id}/manage/',
            {'action': 'remove'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ProfessionalConnection.objects.exists())

    def test_block_hides_connection_from_both_sides_and_prevents_reconnecting(self):
        connection = ProfessionalConnection.objects.create(
            requester=self.alex,
            recipient=self.blair,
            status=ProfessionalConnection.STATUS_ACCEPTED,
        )
        self.client.force_login(self.alex_user)

        response = self.client.post(
            f'/api/connections/{connection.id}/manage/',
            {'action': 'block'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        connection.refresh_from_db()
        self.assertEqual(connection.status, ProfessionalConnection.STATUS_BLOCKED)
        self.assertEqual(connection.blocked_by, self.alex)
        alex_connections = self.client.get('/api/connections/').json()
        self.assertEqual(alex_connections['connections'], [])
        self.assertEqual(len(alex_connections['blocked']), 1)

        self.client.force_login(self.blair_user)
        blair_connections = self.client.get('/api/connections/').json()
        self.assertEqual(blair_connections['connections'], [])
        self.assertEqual(blair_connections['blocked'], [])
        reconnect_response = self.client.post(
            '/api/professional-profiles/alex-carter/connect/',
            {},
            content_type='application/json',
        )
        self.assertEqual(reconnect_response.status_code, 403)

    def test_blocking_person_can_unblock_and_connect_again_later(self):
        connection = ProfessionalConnection.objects.create(
            requester=self.alex,
            recipient=self.blair,
            status=ProfessionalConnection.STATUS_BLOCKED,
            blocked_by=self.alex,
        )
        self.client.force_login(self.alex_user)

        response = self.client.post(
            f'/api/connections/{connection.id}/manage/',
            {'action': 'unblock'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ProfessionalConnection.objects.exists())
        reconnect_response = self.client.post(
            '/api/professional-profiles/blair-singh/connect/',
            {},
            content_type='application/json',
        )
        self.assertEqual(reconnect_response.status_code, 201)
