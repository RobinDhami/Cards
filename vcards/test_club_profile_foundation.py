import json

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse

from vcards.models import ClubMemberProfile, ClubProfileSettings, ClubSocialLink, College, StudentProfile


class ClubProfileFoundationTests(TestCase):
    def setUp(self):
        self.manager_a = User.objects.create_user('club.a.manager', password='ManagerPass123!')
        self.manager_b = User.objects.create_user('club.b.manager', password='ManagerPass123!')
        self.club_a = College.objects.create(
            name='Club A', organization_type='club', organization_code='CLBA', admin_user=self.manager_a,
            email='club-a@example.test', phone='9800000001', address='Kathmandu', club_district='District A',
        )
        self.club_b = College.objects.create(
            name='Club B', organization_type='club', organization_code='CLBB', admin_user=self.manager_b,
        )
        self.member_a = StudentProfile.objects.create(
            college=self.club_a, name='Member A', username='member.a', password='MemberPass123!',
            phone='9800000002', email='member-a@example.test', address='Private address', member_type='member',
            role='Secretary', committee='Board', membership_term='2024-2025', unique_identifier='CLBA-001',
        )
        self.member_b = StudentProfile.objects.create(
            college=self.club_b, name='Member B', username='member.b', password='MemberPass123!',
            phone='9800000003', member_type='member', unique_identifier='CLBB-001',
        )
        self.client.force_login(self.manager_a)

    def _json(self, url, payload, method='patch'):
        return getattr(self.client, method)(url, data=json.dumps(payload), content_type='application/json')

    def test_settings_are_one_to_one_and_organization_data_stays_on_college(self):
        settings = ClubProfileSettings.objects.create(organization=self.club_a, about='Shared about text')
        with self.assertRaises(ValidationError):
            ClubProfileSettings.objects.create(organization=self.club_a)
        self.assertEqual(settings.organization.club_district, 'District A')
        self.assertFalse(hasattr(settings, 'district'))

    def test_club_social_links_are_organization_scoped(self):
        response = self.client.post(
            f"{reverse('club_social_links_api')}?school={self.club_a.id}",
            data=json.dumps({'platform': 'instagram', 'url': 'https://instagram.example.test/club-a'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(ClubSocialLink.objects.get().organization, self.club_a)

    def test_member_profile_and_social_link_belong_to_existing_member(self):
        response = self._json(
            f"{reverse('club_member_profile_api', args=[self.member_a.id])}?school={self.club_a.id}",
            {'quote': 'Service above self', 'show_phone': False},
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(ClubMemberProfile.objects.get(member=self.member_a).quote, 'Service above self')
        social = self.client.post(
            f"{reverse('club_member_social_links_api', args=[self.member_a.id])}?school={self.club_a.id}",
            data=json.dumps({'platform': 'linkedin', 'url': 'https://linkedin.example.test/member-a'}),
            content_type='application/json',
        )
        self.assertEqual(social.status_code, 201, social.content)
        self.assertEqual(self.member_a.club_social_links.get().member_id, self.member_a.id)

    def test_models_reject_non_club_organizations_and_members(self):
        school = College.objects.create(name='Not a Club', organization_type='education', organization_code='EDU9')
        student = StudentProfile.objects.create(
            college=school, name='Education Student', username='education.student', password='MemberPass123!',
            phone='9800000009', member_type='student', unique_identifier='EDU-001',
        )
        with self.assertRaises(ValidationError):
            ClubProfileSettings.objects.create(organization=school)
        with self.assertRaises(ValidationError):
            ClubMemberProfile.objects.create(member=student)

    def test_manager_cannot_access_another_club_settings_or_member(self):
        settings = self._json(
            f"{reverse('club_profile_settings_api')}?school={self.club_b.id}", {'about': 'No access'}, method='put',
        )
        member = self._json(
            f"{reverse('club_member_profile_api', args=[self.member_b.id])}?school={self.club_b.id}", {'quote': 'No access'},
        )
        self.assertEqual(settings.status_code, 403)
        self.assertEqual(member.status_code, 403)

    def test_public_profile_obeys_contact_visibility_and_reuses_member_data(self):
        ClubProfileSettings.objects.create(organization=self.club_a, about='Club A exists to serve.')
        ClubMemberProfile.objects.create(
            member=self.member_a, quote='Lead with service', show_email=False, show_phone=False, show_address=False,
        )
        ClubSocialLink.objects.create(organization=self.club_a, platform='instagram', url='https://instagram.example.test/club-a')
        hidden = self.client.get(reverse('club_member_public_profile_api', args=[self.member_a.id]))
        self.assertEqual(hidden.status_code, 200, hidden.content)
        payload = hidden.json()['profile']
        self.assertEqual(payload['organization']['name'], 'Club A')
        self.assertEqual(payload['organization']['slogan'], '')
        self.assertEqual(payload['member']['member_id'], 'CLBA-001')
        self.assertEqual(payload['member']['role'], 'Secretary')
        self.assertEqual(payload['member']['committee'], 'Board')
        self.assertEqual(payload['member']['membership_term'], '2024-2025')
        self.assertEqual(payload['member']['email'], '')
        self.assertEqual(payload['member']['phone'], '')
        self.assertEqual(payload['member']['address'], '')
        self.assertTrue(payload['member']['is_active'])
        self.assertEqual(len(payload['organization']['social_links']), 1)

    def test_active_legacy_club_member_gets_default_public_profile_records(self):
        ClubMemberProfile.objects.filter(member=self.member_a).delete()
        ClubProfileSettings.objects.filter(organization=self.club_a).delete()

        response = self.client.get(reverse('club_member_public_profile_api', args=[self.member_a.id]))

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(ClubProfileSettings.objects.filter(organization=self.club_a, is_public=True).exists())
        self.assertTrue(ClubMemberProfile.objects.filter(member=self.member_a, is_published=True).exists())

    def test_public_profile_hides_unpublished_member_and_invisible_social_links(self):
        ClubProfileSettings.objects.create(organization=self.club_a)
        ClubMemberProfile.objects.create(member=self.member_a, is_published=False)
        self.assertEqual(self.client.get(reverse('club_member_public_profile_api', args=[self.member_a.id])).status_code, 404)
        ClubMemberProfile.objects.filter(member=self.member_a).update(is_published=True)
        ClubSocialLink.objects.create(organization=self.club_a, platform='facebook', url='https://facebook.example.test/hidden', is_visible=False)
        payload = self.client.get(reverse('club_member_public_profile_api', args=[self.member_a.id])).json()['profile']
        self.assertEqual(payload['organization']['social_links'], [])
