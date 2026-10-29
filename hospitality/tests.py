import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.utils import timezone
from datetime import timedelta

from vcards.models import CardBatch, CardBatchCard, College, OrganizationModuleAccess, OrganizationServicePlan, OrganizationTeamMember
from .models import LoyaltyCustomer, VenueAnalyticsEvent, VenueCardAssignment, VenueFeedback, VenueLink, VenueLoyaltyMembership, VenueMenuCategory, VenueMenuItem, VenueMenuItemVariant, VenueProfile, VenueRewardsProgram, VenueRewardsTransaction, VenueStaffProfile, VenueTouchpoint


class HospitalityWorkspaceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username='venue-admin', password='pass')
        self.org = College.objects.create(name='Aurora Cafe', organization_code='AURORA', organization_type='hospitality', admin_user=self.user)
        self.venue = VenueProfile.objects.create(organization=self.org)
        self.category = VenueMenuCategory.objects.create(venue=self.venue, name='Breakfast', slug='breakfast')
        VenueMenuItem.objects.create(venue=self.venue, category=self.category, name='Pancakes', price='12.00', is_today_special=True)

    def test_public_payload_contains_active_ordered_menu(self):
        self.org.slogan = 'Traditional Taste, Modern Vibes'
        self.org.save(update_fields=['slogan'])
        response = self.client.get(f'/api/venue/{self.venue.public_identifier}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['categories'][0]['items'][0]['name'], 'Pancakes')
        self.assertEqual(response.json()['organization']['slogan'], self.org.slogan)

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

    def test_team_roles_are_enforced_by_hospitality_endpoints(self):
        manager = get_user_model().objects.create_user(username='venue-manager', password='pass', email='manager@example.com')
        editor = get_user_model().objects.create_user(username='venue-editor', password='pass', email='editor@example.com')
        OrganizationTeamMember.objects.create(organization=self.org, user=manager, invite_email=manager.email, role='manager')
        OrganizationTeamMember.objects.create(organization=self.org, user=editor, invite_email=editor.email, role='menu_editor')

        self.client.force_login(editor)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/menu/items/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/feedback/').status_code, 403)
        self.assertEqual(self.client.post(f'/api/organizations/{self.org.pk}/venue/settings/', data='{"action":"invite","email":"new@example.com","role":"manager"}', content_type='application/json').status_code, 403)

        self.client.force_login(manager)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/feedback/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/analytics/').status_code, 200)
        self.assertEqual(self.client.post(f'/api/organizations/{self.org.pk}/venue/settings/', data='{"action":"invite","email":"new@example.com","role":"manager"}', content_type='application/json').status_code, 403)

    def test_super_admin_plan_controls_loyalty_visibility_and_api_access(self):
        super_admin = get_user_model().objects.create_superuser(username='platform-admin', password='pass')
        self.client.force_login(super_admin)
        response = self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/settings/',
            data=json.dumps({'action': 'subscription', 'name': 'Menu package', 'modules': ['overview', 'profile', 'menu', 'feedback']}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['subscription']['modules'][5]['enabled'])
        self.assertFalse(OrganizationModuleAccess.objects.get(organization=self.org, module_key='loyalty').is_enabled)

        self.client.force_login(self.user)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/rewards/members/').status_code, 403)
        self.assertFalse(self.client.get(f'/api/venue/{self.venue.public_identifier}/').json()['loyalty']['enabled'])

    def test_assigned_technical_owner_cannot_access_the_organization_workspace(self):
        support = get_user_model().objects.create_user(username='support-agent', password='pass')
        OrganizationServicePlan.objects.create(organization=self.org, technical_owner=support)
        other = College.objects.create(name='Unassigned Cafe', organization_code='UNASSIGNED', organization_type='hospitality')
        VenueProfile.objects.create(organization=other)

        self.client.force_login(support)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/menu/items/').status_code, 403)
        self.assertEqual(self.client.get(f'/api/organizations/{other.pk}/venue/menu/items/').status_code, 403)

    def test_super_admin_selects_hospitality_modules_when_creating_an_organization(self):
        super_admin = get_user_model().objects.create_superuser(username='create-admin', password='pass')
        self.client.force_login(super_admin)
        response = self.client.post('/api/dashboard/schools/', data=json.dumps({
            'name': 'Menu Only Cafe', 'organizationCode': 'MENUONLY', 'organizationType': 'hospitality',
            'workspaceSlug': 'menu-only-cafe',
            'adminUsername': 'menu-only-owner', 'adminPassword': 'OwnerPass123!',
            'modules': ['overview', 'profile', 'menu'],
        }), content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        created = College.objects.get(name='Menu Only Cafe')
        enabled = set(OrganizationModuleAccess.objects.filter(organization=created, is_enabled=True).values_list('module_key', flat=True))
        self.assertEqual(enabled, {'overview', 'profile', 'menu'})

    def test_settings_prevents_removing_the_last_owner(self):
        self.client.force_login(self.user)
        settings = self.client.get(f'/api/organizations/{self.org.pk}/venue/settings/').json()
        owner = next(member for member in settings['team'] if member['isCurrentUser'])
        response = self.client.delete(
            f'/api/organizations/{self.org.pk}/venue/settings/',
            data=json.dumps({'action': 'remove', 'id': owner['id']}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('last owner', response.json()['error'])

    def test_owner_can_configure_spend_rewards_program(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/settings/',
            data=json.dumps({
                'action': 'rewards_program', 'isActive': True, 'rewardRatePercent': '5',
                'minimumOrderAmount': '500', 'maxRedemptionPercent': '20',
                'rewardLabel': 'Jyapu rewards', 'expiryDays': 180,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        program = VenueRewardsProgram.objects.get(venue=self.venue)
        self.assertTrue(program.is_active)
        self.assertEqual(str(program.minimum_order_amount), '500.00')
        self.assertEqual(response.json()['rewardsProgram']['rewardLabel'], 'Jyapu rewards')

    def test_business_profile_save_is_atomic_and_updates_public_payload(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/',
            {
                'name': 'Aurora Coffee House',
                'venue_type': 'cafe',
                'description': 'Coffee roasted in Kathmandu.',
                'address': 'Lazimpat, Kathmandu',
                'map_url': 'https://maps.google.com/?q=Aurora',
                'phone': '+9779812345678',
                'email': 'hello@example.com',
                'website': 'https://example.com',
                'whatsapp_same_as_phone': 'true',
                'opening_schedule': '{"monday":{"closed":false,"intervals":[{"start":"08:00","end":"12:00"},{"start":"14:00","end":"20:00"}]},"sunday":{"closed":true,"intervals":[]}}',
                'links': '[{"link_type":"instagram","label":"Instagram","value":"https://instagram.com/aurora","is_active":true},{"link_type":"facebook","label":"Facebook","value":"https://facebook.com/aurora","is_active":false}]',
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.org.refresh_from_db(); self.venue.refresh_from_db()
        self.assertEqual(self.org.name, 'Aurora Coffee House')
        self.assertEqual(self.venue.whatsapp, self.org.phone)
        self.assertEqual(len(self.venue.opening_schedule['monday']['intervals']), 2)
        self.assertEqual(VenueLink.objects.filter(venue=self.venue).count(), 2)

        public = self.client.get(f'/api/venue/{self.venue.public_identifier}/').json()
        self.assertEqual(public['organization']['name'], 'Aurora Coffee House')
        self.assertEqual(public['venue']['address'], 'Lazimpat, Kathmandu')
        self.assertEqual(public['venue']['openingSchedule']['monday']['intervals'][1]['start'], '14:00')
        self.assertEqual([link['label'] for link in public['links']], ['Instagram'])

    def test_business_profile_reports_legacy_conflicts_then_aligns_on_save(self):
        self.org.description = 'Old Settings copy'
        self.org.theme_primary = '#123456'
        self.org.save(update_fields=['description', 'theme_primary'])
        self.venue.description = 'Current public copy'
        self.venue.primary_color = '#654321'
        self.venue.save(update_fields=['description', 'primary_color'])
        self.client.force_login(self.user)

        before = self.client.get(f'/api/organizations/{self.org.pk}/venue/').json()
        self.assertCountEqual(before['sourceConflicts'], ['description', 'primary colour', 'accent colour'])
        saved = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/',
            {'description': 'Current public copy', 'primary_color': '#654321'},
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()['sourceConflicts'], [])
        self.org.refresh_from_db()
        self.assertEqual(self.org.description, 'Current public copy')
        self.assertEqual(self.org.theme_primary, '#654321')

    def test_legacy_social_link_is_preserved_for_profile_consolidation(self):
        self.org.instagram = 'https://instagram.com/legacy-aurora'
        self.org.save(update_fields=['instagram'])
        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/').json()
        self.assertEqual(response['links'][0]['value'], 'https://instagram.com/legacy-aurora')
        self.assertTrue(response['links'][0]['legacy'])

    def test_business_profile_rejects_invalid_social_link_without_partial_save(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/',
            {'name': 'Should Not Persist', 'links': '[{"link_type":"instagram","label":"Instagram","value":"javascript:alert(1)"}]'},
        )
        self.assertEqual(response.status_code, 400)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, 'Aurora Cafe')

    def test_hospitality_settings_cannot_overwrite_public_profile_fields(self):
        self.client.force_login(self.user)
        response = self.client.post(
            f'/api/dashboard/settings/?school={self.org.pk}',
            {'name': 'Wrong editor', 'phone': '+9770000000000', 'organizationCode': 'AURORA2'},
        )
        self.assertEqual(response.status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, 'Aurora Cafe')
        self.assertFalse(self.org.phone)
        self.assertEqual(self.org.organization_code, 'AURORA2')

    def test_empty_cafe_receives_useful_default_categories(self):
        self.venue.menu_items.all().delete()
        self.category.delete()
        self.venue.venue_type = 'cafe'
        self.venue.save(update_fields=['venue_type'])
        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/menu/categories/')
        names = [category['name'] for category in response.json()['categories']]
        self.assertIn('Beverages', names)
        self.assertNotIn('Offers', names)
        self.assertNotIn("Today's Special", names)

    def test_anonymous_feedback_is_created(self):
        response = self.client.post(f'/api/venue/{self.venue.public_identifier}/feedback/', {'rating': 5, 'comment': 'Lovely'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.venue.feedback.count(), 1)

    def test_loyalty_join_normalizes_a_nepali_number_and_reopens_the_same_card(self):
        self.venue.venue_type = 'restaurant'
        self.venue.save(update_fields=['venue_type'])
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True)
        endpoint = f'/api/venue/{self.venue.public_identifier}/loyalty/join/'
        first = self.client.post(endpoint, {'name': 'Robin Dhami', 'phone': '9812345678'}, content_type='application/json')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertTrue(first.json()['created'])
        self.assertEqual(first.json()['membership']['stampGoal'], 5)
        self.assertEqual(LoyaltyCustomer.objects.get().phone_e164, '+9779812345678')

        second = self.client.post(endpoint, {'phone': '+977 9812345678'}, content_type='application/json')
        self.assertEqual(second.status_code, 200, second.content)
        self.assertFalse(second.json()['created'])
        self.assertEqual(second.json()['membership']['memberId'], first.json()['membership']['memberId'])
        self.assertEqual(VenueLoyaltyMembership.objects.count(), 1)

    def test_staff_can_collect_and_redeem_stamps(self):
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer, stamp_goal=3)
        program = VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='stamps', stamp_goal=3, stamp_reward_label='Free coffee')
        self.client.force_login(self.user)
        endpoint = f'/api/organizations/{self.org.pk}/venue/rewards/transactions/'

        for _ in range(3):
            response = self.client.post(endpoint, {'action': 'earn', 'memberId': membership.public_identifier, 'billAmount': '0'}, content_type='application/json')
            self.assertEqual(response.status_code, 200, response.content)
        membership.refresh_from_db()
        self.assertEqual(membership.stamp_count, 3)

        response = self.client.post(endpoint, {'action': 'redeem', 'memberId': membership.public_identifier, 'billAmount': '0'}, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        membership.refresh_from_db()
        self.assertEqual(membership.stamp_count, 0)
        self.assertEqual(membership.rewards_redeemed, 1)
        self.assertEqual(program.stamp_reward_label, 'Free coffee')

    def test_staff_can_collect_and_redeem_points(self):
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer)
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='points', points_per_currency='2', points_to_reward=10, reward_label='Free coffee')
        self.client.force_login(self.user)
        endpoint = f'/api/organizations/{self.org.pk}/venue/rewards/transactions/'
        earned = self.client.post(endpoint, {'action': 'earn', 'memberId': membership.public_identifier, 'billAmount': '5'}, content_type='application/json')
        self.assertEqual(earned.status_code, 200, earned.content)
        self.assertEqual(earned.json()['member']['rewardBalance'], '10.00')
        redeemed = self.client.post(endpoint, {'action': 'redeem', 'memberId': membership.public_identifier, 'billAmount': '0'}, content_type='application/json')
        self.assertEqual(redeemed.status_code, 200, redeemed.content)
        membership.refresh_from_db()
        self.assertEqual(str(membership.reward_balance), '0.00')
        self.assertEqual(membership.rewards_redeemed, 1)

    def test_transaction_retry_is_idempotent(self):
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer)
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='points', points_per_currency='2')
        self.client.force_login(self.user)
        endpoint = f'/api/organizations/{self.org.pk}/venue/rewards/transactions/'
        payload = {'action': 'earn', 'memberId': membership.public_identifier, 'billAmount': '100', 'idempotencyKey': 'phone-request-1'}

        first = self.client.post(endpoint, payload, content_type='application/json')
        second = self.client.post(endpoint, payload, content_type='application/json')

        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.status_code, 200, second.content)
        self.assertTrue(second.json()['duplicate'])
        membership.refresh_from_db()
        self.assertEqual(str(membership.reward_balance), '200.00')
        self.assertEqual(VenueRewardsTransaction.objects.filter(membership=membership).count(), 1)

    def test_archived_member_is_hidden_and_rejoining_restores_the_same_card(self):
        self.venue.venue_type = 'cafe'
        self.venue.save(update_fields=['venue_type'])
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='stamps', stamp_goal=6)
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer, stamp_count=2, stamp_goal=5)
        self.client.force_login(self.user)

        archived = self.client.delete(f'/api/organizations/{self.org.pk}/venue/rewards/members/{membership.public_identifier}/')
        self.assertEqual(archived.status_code, 200, archived.content)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/rewards/members/').json()['members'], [])

        self.client.logout()
        restored = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/loyalty/join/',
            {'name': 'Robin Dhami', 'phone': '+9779812345678'},
            content_type='application/json',
        )
        self.assertEqual(restored.status_code, 200, restored.content)
        membership.refresh_from_db()
        self.assertTrue(membership.is_active)
        self.assertEqual(membership.stamp_count, 2)
        self.assertEqual(membership.stamp_goal, 6)
        self.assertEqual(restored.json()['membership']['memberId'], membership.public_identifier)

    def test_customer_can_restore_saved_loyalty_card(self):
        self.venue.venue_type = 'cafe'
        self.venue.save(update_fields=['venue_type'])
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='points', points_to_reward=100)
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer, reward_balance='45')

        response = self.client.get(f'/api/venue/{self.venue.public_identifier}/loyalty/card/{membership.public_identifier}/')

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['membership']['rewardBalance'], '45.00')
        self.assertEqual(response.json()['program']['programType'], 'points')

    def test_changing_loyalty_system_requires_confirmed_balance_reset(self):
        program = VenueRewardsProgram.objects.create(venue=self.venue, is_active=True, program_type='points')
        customer = LoyaltyCustomer.objects.create(full_name='Robin Dhami', phone_e164='+9779812345678')
        membership = VenueLoyaltyMembership.objects.create(venue=self.venue, customer=customer, reward_balance='45')
        self.client.force_login(self.user)
        endpoint = f'/api/organizations/{self.org.pk}/venue/settings/'
        payload = {'action': 'rewards_program', 'programType': 'stamps', 'stampGoal': 8, 'stampRewardLabel': 'Free coffee'}

        blocked = self.client.patch(endpoint, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(blocked.status_code, 409, blocked.content)
        program.refresh_from_db()
        self.assertEqual(program.program_type, 'points')

        payload['resetExistingBalances'] = True
        changed = self.client.patch(endpoint, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(changed.status_code, 200, changed.content)
        membership.refresh_from_db()
        program.refresh_from_db()
        self.assertEqual(program.program_type, 'stamps')
        self.assertEqual(membership.stamp_goal, 8)
        self.assertEqual(str(membership.reward_balance), '0.00')
        self.assertEqual(membership.rewards_transactions.get().transaction_type, 'expire')

    def test_a_loyalty_customer_can_have_one_card_per_cafe(self):
        self.venue.venue_type = 'cafe'
        self.venue.save(update_fields=['venue_type'])
        other = VenueProfile.objects.create(
            organization=College.objects.create(name='Second Cafe', organization_code='SECOND', organization_type='hospitality'),
            venue_type='cafe',
        )
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True)
        VenueRewardsProgram.objects.create(venue=other, is_active=True)
        self.client.post(f'/api/venue/{self.venue.public_identifier}/loyalty/join/', {'name': 'Robin Dhami', 'phone': '9812345678'}, content_type='application/json')
        response = self.client.post(f'/api/venue/{other.public_identifier}/loyalty/join/', {'phone': '9812345678'}, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(LoyaltyCustomer.objects.count(), 1)
        self.assertEqual(VenueLoyaltyMembership.objects.count(), 2)

    def test_loyalty_join_accepts_an_international_e164_number(self):
        self.venue.venue_type = 'restaurant'
        self.venue.save(update_fields=['venue_type'])
        VenueRewardsProgram.objects.create(venue=self.venue, is_active=True)
        response = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/loyalty/join/',
            {'name': 'Robin Dhami', 'phone': '+44 7700 900123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(LoyaltyCustomer.objects.get().phone_e164, '+447700900123')

    def test_feedback_optional_contact_is_private_and_internal_note_never_public(self):
        response = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/feedback/',
            {
                'rating': 4, 'comment': 'Please improve the wait time.', 'shareContact': True,
                'contactName': 'Sam', 'contactEmail': 'sam@example.com',
                'contactPhone': '+977 9812345678', 'source': 'qr_code',
            },
            content_type='application/json', REMOTE_ADDR='198.51.100.10',
        )
        self.assertEqual(response.status_code, 201, response.content)
        entry = self.venue.feedback.get()
        self.assertEqual(entry.contact_email, 'sam@example.com')
        self.assertEqual(entry.touchpoint_source, 'qr_code')

        self.client.force_login(self.user)
        updated = self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/feedback/',
            {'id': entry.pk, 'status': 'in_progress', 'internal_note': 'Call after the lunch rush.'},
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        entry.refresh_from_db()
        self.assertEqual(entry.status, 'in_progress')
        self.assertEqual(entry.internal_note, 'Call after the lunch rush.')

        public_payload = self.client.get(f'/api/venue/{self.venue.public_identifier}/').json()
        self.assertNotIn('feedback', public_payload)
        self.assertNotIn('internal_note', str(public_payload))
        self.assertNotIn('sam@example.com', str(public_payload))

    def test_feedback_management_filters_summary_and_permissions(self):
        VenueFeedback.objects.create(venue=self.venue, rating=5, comment='Great', status='new')
        VenueFeedback.objects.create(venue=self.venue, rating=2, comment='Slow', status='in_progress')
        VenueFeedback.objects.create(venue=self.venue, rating=4, comment='Fixed', status='resolved')
        denied = self.client.get(f'/api/organizations/{self.org.pk}/venue/feedback/')
        self.assertEqual(denied.status_code, 403)

        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/feedback/?status=in_progress&rating=2&days=30')
        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertEqual(len(payload['feedback']), 1)
        self.assertEqual(payload['summary']['count'], 3)
        self.assertEqual(payload['summary']['unresolved'], 2)
        self.assertAlmostEqual(payload['summary']['average'], 11 / 3)

    def test_feedback_empty_summary_uses_null_average(self):
        self.client.force_login(self.user)
        payload = self.client.get(f'/api/organizations/{self.org.pk}/venue/feedback/').json()
        self.assertEqual(payload['summary'], {
            'count': 0, 'average': None, 'unresolved': 0,
            'statusCounts': {'new': 0, 'in_progress': 0, 'resolved': 0},
        })

    def test_feedback_honeypot_and_rate_limit(self):
        bot = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/feedback/',
            {'rating': 5, 'comment': 'Spam', 'company_website': 'https://spam.example'},
            content_type='application/json', REMOTE_ADDR='198.51.100.20',
        )
        self.assertEqual(bot.status_code, 201)
        self.assertEqual(self.venue.feedback.count(), 0)
        first = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/feedback/',
            {'rating': 5, 'comment': 'First'}, content_type='application/json', REMOTE_ADDR='198.51.100.21',
        )
        second = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/feedback/',
            {'rating': 4, 'comment': 'Second'}, content_type='application/json', REMOTE_ADDR='198.51.100.21',
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 429)

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

    def test_menu_item_photo_can_be_updated_with_multipart_post(self):
        self.client.force_login(self.user)
        item = VenueMenuItem.objects.create(
            venue=self.venue, category=self.category, name='Plain toast', price='120'
        )
        item_count = VenueMenuItem.objects.count()
        image = SimpleUploadedFile(
            'toast.gif',
            b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;',
            content_type='image/gif',
        )

        response = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {
                'id': item.pk,
                'category_id': self.category.pk,
                'name': 'Toast with jam',
                'price': '140',
                'is_available': 'true',
                'is_published': 'true',
                'image': image,
            },
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(VenueMenuItem.objects.count(), item_count)
        item.refresh_from_db()
        self.assertEqual(item.name, 'Toast with jam')
        self.assertTrue(item.image.name.startswith('venue_menu/toast'))

    def test_published_sold_out_item_stays_public_and_unpublished_item_is_hidden(self):
        sold_out = VenueMenuItem.objects.create(
            venue=self.venue, category=self.category, name='Sold out cake', price='250', is_available=False, is_published=True,
        )
        VenueMenuItem.objects.create(
            venue=self.venue, category=self.category, name='Draft cake', price='300', is_available=True, is_published=False,
        )
        payload = self.client.get(f'/api/venue/{self.venue.public_identifier}/').json()
        items = {item['name']: item for item in payload['categories'][0]['items']}
        self.assertIn(sold_out.name, items)
        self.assertFalse(items[sold_out.name]['isAvailable'])
        self.assertNotIn('Draft cake', items)

    def test_menu_item_create_edit_variants_and_offer_validation(self):
        self.client.force_login(self.user)
        created = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {
                'category_id': self.category.pk, 'name': 'Milk tea', 'price': '80',
                'is_published': 'true', 'is_available': 'false',
                'price_variants': '[{"label":"Large","price":"120"}]',
            },
        )
        self.assertEqual(created.status_code, 201, created.content)
        item_id = created.json()['item']['id']
        self.assertEqual(VenueMenuItemVariant.objects.get(item_id=item_id).label, 'Large')

        edited = self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'id': item_id, 'name': 'Masala milk tea', 'price': '90', 'is_offer': True, 'original_price': '130', 'offer_label': 'Save NPR 40'},
            content_type='application/json',
        )
        self.assertEqual(edited.status_code, 200, edited.content)
        self.assertEqual(edited.json()['item']['name'], 'Masala milk tea')

        invalid = self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'id': item_id, 'price': '100', 'is_offer': True, 'original_price': '90'},
            content_type='application/json',
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertIn('greater than the current price', invalid.json()['message'])

    def test_menu_item_duplicate_reorder_and_bulk_availability_are_scoped(self):
        second = VenueMenuItem.objects.create(venue=self.venue, category=self.category, name='Coffee', price='100', display_order=1)
        self.client.force_login(self.user)
        duplicated = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'action': 'duplicate', 'id': second.pk}, content_type='application/json',
        )
        self.assertEqual(duplicated.status_code, 201)
        self.assertFalse(duplicated.json()['item']['is_published'])
        duplicate_id = duplicated.json()['item']['id']

        reordered = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'action': 'reorder', 'items': [{'id': duplicate_id}, {'id': second.pk}]}, content_type='application/json',
        )
        self.assertEqual(reordered.status_code, 200)
        self.assertEqual(VenueMenuItem.objects.get(pk=duplicate_id).display_order, 0)

        bulk = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'action': 'bulk_availability', 'ids': [duplicate_id, second.pk], 'is_available': False}, content_type='application/json',
        )
        self.assertEqual(bulk.status_code, 200)
        self.assertFalse(VenueMenuItem.objects.get(pk=second.pk).is_available)

        other_venue = VenueProfile.objects.create(organization=College.objects.create(name='Scoped Cafe', organization_code='SCOPED'))
        other_category = VenueMenuCategory.objects.create(venue=other_venue, name='Other', slug='other')
        other_item = VenueMenuItem.objects.create(venue=other_venue, category=other_category, name='Private', price='10')
        denied = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/menu/items/',
            {'action': 'bulk_availability', 'ids': [other_item.pk], 'is_available': False}, content_type='application/json',
        )
        self.assertEqual(denied.json()['updated'], 0)
        other_item.refresh_from_db(); self.assertTrue(other_item.is_available)

    def test_category_delete_requires_safe_reassignment(self):
        target = VenueMenuCategory.objects.create(venue=self.venue, name='Drinks', slug='drinks')
        self.client.force_login(self.user)
        blocked = self.client.delete(
            f'/api/organizations/{self.org.pk}/venue/menu/categories/',
            {'id': self.category.pk}, content_type='application/json',
        )
        self.assertEqual(blocked.status_code, 409)
        moved = self.client.delete(
            f'/api/organizations/{self.org.pk}/venue/menu/categories/',
            {'id': self.category.pk, 'target_category_id': target.pk}, content_type='application/json',
        )
        self.assertEqual(moved.status_code, 200)
        self.assertFalse(VenueMenuCategory.objects.filter(pk=self.category.pk).exists())
        self.assertFalse(VenueMenuItem.objects.exclude(category=target).exists())

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
        analytics = response.json()['analytics']
        self.assertEqual(analytics['metrics']['profileViews'], 1)
        self.assertEqual(analytics['linkDestinations'][0]['destination'], 'instagram')

    def test_analytics_requires_organization_membership(self):
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/analytics/')
        self.assertEqual(response.status_code, 403)

    def test_analytics_uses_scoped_timezone_range_and_trusted_definitions(self):
        other_org = College.objects.create(name='Unrelated Cafe', organization_code='UNRELATED', organization_type='hospitality')
        other_venue = VenueProfile.objects.create(organization=other_org)
        VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='profile_view', visitor_hash='visitor-a')
        VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='profile_view', visitor_hash='visitor-a')
        VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='menu_open')
        VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='menu_item_click', target='destination:menu_item|detail:Pancakes')
        VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='google_review_click', target='destination:google_review')
        VenueAnalyticsEvent.objects.create(venue=other_venue, event_type='profile_view', visitor_hash='other-visitor')
        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/analytics/?range=custom&start={timezone.localdate().isoformat()}&end={timezone.localdate().isoformat()}')
        self.assertEqual(response.status_code, 200, response.content)
        analytics = response.json()['analytics']
        self.assertEqual(analytics['metrics']['profileViews'], 2)
        self.assertEqual(analytics['metrics']['estimatedUniqueVisitors'], 1)
        self.assertEqual(analytics['metrics']['menuItemDetailViews'], 1)
        self.assertEqual(analytics['metrics']['googleReviewClicks'], 1)
        self.assertEqual(analytics['linkDestinations'][0], {'destination': 'google_review', 'count': 1})
        self.assertIn('not orders or sales', analytics['definitions']['menuItemDetailViews'])

    def test_authenticated_dashboard_preview_does_not_record_a_view(self):
        self.client.force_login(self.user)
        response = self.client.get(f'/api/venue/{self.venue.public_identifier}/?preview=dashboard')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(VenueAnalyticsEvent.objects.filter(venue=self.venue, event_type='profile_view').exists())

    def test_overview_uses_real_scoped_event_and_feedback_counts(self):
        for event_type in ('profile_view', 'menu_open', 'rating_click'):
            VenueAnalyticsEvent.objects.create(venue=self.venue, event_type=event_type)
        previous_view = VenueAnalyticsEvent.objects.create(venue=self.venue, event_type='profile_view')
        VenueAnalyticsEvent.objects.filter(pk=previous_view.pk).update(created_at=timezone.now() - timedelta(days=8))
        tracked_review_click = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/track/',
            {'eventType': 'google_review_click', 'target': 'google_review'},
            content_type='application/json',
        )
        self.assertEqual(tracked_review_click.status_code, 201)
        VenueFeedback.objects.create(venue=self.venue, rating=4, comment='Good coffee', status='new')
        VenueFeedback.objects.create(venue=self.venue, rating=2, comment='Already reviewed', status='in_progress')
        managed_branch = College.objects.create(
            name='Aurora Cafe Branch', organization_code='AURORABR', organization_type='hospitality', admin_user=self.user,
        )
        VenueProfile.objects.create(organization=managed_branch)
        other_org = College.objects.create(name='Other Business', organization_code='OTHERBIZ', organization_type='hospitality')
        other_venue = VenueProfile.objects.create(organization=other_org)
        VenueAnalyticsEvent.objects.create(venue=other_venue, event_type='profile_view')

        self.client.force_login(self.user)
        response = self.client.get(f'/api/organizations/{self.org.pk}/venue/overview/?days=7')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['metrics'], {
            'profileViews': 1,
            'menuOpens': 1,
            'googleReviewClicks': 1,
            'feedbackSubmissions': 0,
        })
        self.assertEqual(payload['previousMetrics']['profileViews'], 1)
        self.assertEqual(len(payload['dailyVisits']), 7)
        self.assertEqual(sum(day['count'] for day in payload['dailyVisits']), 1)
        self.assertEqual(len(payload['recentFeedback']), 2)
        self.assertNotIn('name', payload['recentFeedback'][0])
        self.assertEqual(payload['setup'], [
            {'key': 'profile', 'label': 'Profile details published', 'complete': False},
            {'key': 'menu', 'label': 'Menu has items', 'complete': True},
            {'key': 'feedback', 'label': 'Feedback form enabled', 'complete': True},
        ])
        self.assertEqual(payload['readiness'], {
            'profileReady': False,
            'menuItemCount': 1,
            'feedbackEnabled': True,
        })
        self.assertIn('loyalty', payload['enabledModules'])
        self.assertEqual(payload['loyaltyMetrics'], {
            'activeMembers': 0,
            'activityCount': 0,
            'earnedCount': 0,
            'redeemedCount': 0,
        })
        self.assertEqual(payload['organizations'], [
            {'id': self.org.pk, 'name': self.org.name},
            {'id': managed_branch.pk, 'name': managed_branch.name},
        ])

    def test_overview_validates_date_filter_and_requires_membership(self):
        self.client.force_login(self.user)
        invalid = self.client.get(f'/api/organizations/{self.org.pk}/venue/overview/?days=14')
        self.assertEqual(invalid.status_code, 400)

        outsider = get_user_model().objects.create_user(username='other-admin', password='pass')
        self.client.force_login(outsider)
        denied = self.client.get(f'/api/organizations/{self.org.pk}/venue/overview/?days=7')
        self.assertEqual(denied.status_code, 403)

    def test_staff_profile_is_public_identity_without_dashboard_account(self):
        self.client.force_login(self.user)
        user_count = get_user_model().objects.count()
        created = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {
                'action': 'create_staff', 'name': 'Asha Shrestha', 'position': 'Manager',
                'bio': 'Welcome to Aurora Cafe.', 'is_active': True,
                'links': [{'link_type': 'phone', 'label': 'Work phone', 'value': '+977 9812345678'}],
            }, content_type='application/json',
        )
        self.assertEqual(created.status_code, 200, created.content)
        staff = VenueStaffProfile.objects.get(name='Asha Shrestha')
        self.assertEqual(get_user_model().objects.count(), user_count)
        public = self.client.get(f'/api/venue/{self.venue.public_identifier}/staff/{staff.public_identifier}/')
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()['staff']['links'][0]['value'], '+977 9812345678')

        self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {'action': 'update_staff', 'id': staff.pk, 'is_active': False}, content_type='application/json',
        )
        inactive = self.client.get(f'/api/venue/{self.venue.public_identifier}/staff/{staff.public_identifier}/').json()['staff']
        self.assertFalse(inactive['isActive'])
        self.assertNotIn('links', inactive)

    def test_card_assignment_lifecycle_and_organization_isolation(self):
        batch = CardBatch.objects.create(batch_name='Hospitality cards', cards_printed=2)
        card = CardBatchCard.objects.create(batch=batch, card_label='NFC-104', organization=self.org)
        other_org = College.objects.create(name='Other Venue', organization_code='OVCARD', organization_type='hospitality')
        other_venue = VenueProfile.objects.create(organization=other_org)
        other_card = CardBatchCard.objects.create(batch=batch, card_label='NFC-999', organization=other_org)
        staff = VenueStaffProfile.objects.create(venue=self.venue, name='Milan', is_active=True)
        self.client.force_login(self.user)

        denied = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {'action': 'assign_card', 'target_type': 'staff', 'target_id': staff.pk, 'card_id': other_card.pk}, content_type='application/json',
        )
        self.assertEqual(denied.status_code, 400)
        assigned = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {'action': 'assign_card', 'target_type': 'staff', 'target_id': staff.pk, 'card_id': card.pk}, content_type='application/json',
        )
        self.assertEqual(assigned.status_code, 200, assigned.content)
        assignment = VenueCardAssignment.objects.get(staff=staff)
        active = self.client.get(f'/api/venue/card/{assignment.public_identifier}/').json()
        self.assertTrue(active['active'])
        self.assertIn('entry=nfc', active['destination'])

        self.client.patch(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {'action': 'update_staff', 'id': staff.pk, 'is_active': False}, content_type='application/json',
        )
        inactive = self.client.get(f'/api/venue/card/{assignment.public_identifier}/').json()
        self.assertFalse(inactive['active'])
        self.assertEqual(inactive['destination'], '')
        self.assertNotIn('Milan', inactive['message'])

        outsider = get_user_model().objects.create_user(username='outsider', password='pass')
        self.client.force_login(outsider)
        self.assertEqual(self.client.get(f'/api/organizations/{self.org.pk}/venue/staff-cards/').status_code, 403)
        self.assertFalse(other_venue.card_assignments.exists())

    def test_touchpoint_qr_and_nfc_destinations_keep_source_tags(self):
        batch = CardBatch.objects.create(batch_name='Touchpoint cards', cards_printed=1)
        card = CardBatchCard.objects.create(batch=batch, card_label='TABLE-4', organization=self.org)
        touchpoint = VenueTouchpoint.objects.create(venue=self.venue, name='Table 4', destination='feedback')
        self.client.force_login(self.user)
        assigned = self.client.post(
            f'/api/organizations/{self.org.pk}/venue/staff-cards/',
            {'action': 'assign_card', 'target_type': 'touchpoint', 'target_id': touchpoint.pk, 'card_id': card.pk}, content_type='application/json',
        )
        self.assertEqual(assigned.status_code, 200, assigned.content)
        payload = assigned.json()['touchpoints'][0]
        self.assertIn(f'source={touchpoint.public_identifier}', payload['qrUrl'])
        self.assertIn('entry=qr', payload['qrUrl'])
        nfc = self.client.get(f"/api/venue/card/{touchpoint.card_assignment.public_identifier}/").json()
        self.assertIn(f'source={touchpoint.public_identifier}', nfc['destination'])
        self.assertIn('entry=nfc', nfc['destination'])
        self.client.get(f'/api/venue/{self.venue.public_identifier}/?source={touchpoint.public_identifier}&entry=qr')
        self.assertEqual(
            VenueAnalyticsEvent.objects.filter(venue=self.venue, event_type='profile_view').latest('created_at').target,
            f'destination:profile|source:{touchpoint.public_identifier}|entry:qr',
        )
        feedback = self.client.post(
            f'/api/venue/{self.venue.public_identifier}/feedback/',
            {'rating': 5, 'comment': 'Great', 'source': f'{touchpoint.public_identifier}:qr'},
            content_type='application/json', REMOTE_ADDR='203.0.113.44',
        )
        self.assertEqual(feedback.status_code, 201)
        self.assertEqual(self.venue.feedback.latest('created_at').touchpoint_source, f'{touchpoint.public_identifier}:qr')
