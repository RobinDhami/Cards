from concurrent.futures import ThreadPoolExecutor
import json

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.test import TestCase, TransactionTestCase
from django.urls import reverse

from .models import College, StudentProfile
from .usernames import (
    create_organization_member, generate_organization_member_username,
    member_initials, validate_member_username,
)


class OrganizationUsernameTests(TestCase):
    def setUp(self):
        self.organization = College.objects.create(name='Vedanga International School', organization_code='vis')

    def test_first_username_and_normalized_code(self):
        self.assertEqual(self.organization.organization_code, 'VIS')
        self.assertEqual(generate_organization_member_username(self.organization, 'Lionel Messi'), 'VISLM0001')

    def test_first_last_and_middle_ignored(self):
        self.assertEqual(member_initials('Sita Sharma'), 'SS')
        self.assertEqual(member_initials('Ram Bahadur Thapa'), 'RT')

    def test_single_word(self):
        self.assertEqual(member_initials('Sushant'), 'SU')

    def create_member(self, name='Lionel Messi', **extra):
        return create_organization_member('SafePassword123!', name=name, college=self.organization,
            phone='9800000000', password='SafePassword123!', **extra)

    def test_deleted_sequence_not_reused(self):
        member = self.create_member()
        self.assertEqual(member.username, 'VISLM0001')
        member.delete()
        self.assertEqual(generate_organization_member_username(self.organization, 'Sita Sharma'), 'VISSS0002')

    def test_over_9999(self):
        College.objects.filter(pk=self.organization.pk).update(member_username_sequence=9999)
        self.assertEqual(generate_organization_member_username(self.organization, 'Lionel Messi'), 'VISLM10000')

    def test_stale_organization_save_does_not_reset_sequence(self):
        generate_organization_member_username(self.organization, 'Lionel Messi')
        self.organization.slogan = 'Updated settings'
        self.organization.save()
        self.assertEqual(generate_organization_member_username(self.organization, 'Sita Sharma'), 'VISSS0002')

    def test_case_insensitive_collision_skips_account(self):
        existing = User.objects.create_user(username='vislm0001', password='Existing123!')
        member = self.create_member()
        self.assertEqual(member.username, 'VISLM0002')
        self.assertNotEqual(member.auth_user_id, existing.pk)
        existing.refresh_from_db()
        self.assertEqual(existing.username, 'vislm0001')

    def test_manual_normalization_and_validation(self):
        self.assertEqual(self.create_member(username=' custom.name ').username, 'CUSTOM.NAME')
        with self.assertRaises(ValidationError):
            validate_member_username('bad/name')

    def test_deleted_manual_formatted_sequence_not_reused(self):
        self.create_member(username='VISLM0003').delete()
        self.assertEqual(generate_organization_member_username(self.organization, 'Lionel Messi'), 'VISLM0004')

    def test_manual_globally_unique_across_organizations(self):
        other = College.objects.create(name='Other', organization_code='OTHER')
        StudentProfile.objects.create(name='Other User', username='taken', college=other, phone='1')
        with self.assertRaises(ValidationError):
            self.create_member(username='TAKEN')

    def test_database_auth_case_constraint(self):
        User.objects.create(username='GlobalName')
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create(username='globalname')

    def test_database_member_case_constraint(self):
        StudentProfile.objects.create(name='Old', username='Legacy.Name', phone='1')
        with self.assertRaises(IntegrityError), transaction.atomic():
            StudentProfile.objects.create(name='New', username='legacy.name', phone='1')

    def test_existing_usernames_unchanged(self):
        user = User.objects.create(username='old.Mixed')
        member = StudentProfile.objects.create(name='Old', username='old.Mixed', auth_user=user, college=self.organization, phone='1')
        self.create_member()
        member.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(member.username, 'old.Mixed')
        self.assertEqual(user.username, 'old.Mixed')

    def test_allocation_rollback(self):
        with self.assertRaises(ValueError), transaction.atomic():
            generate_organization_member_username(self.organization, 'Lionel Messi')
            raise ValueError('Abort')
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.member_username_sequence, 0)

    def test_missing_code_is_clear_error(self):
        self.organization.organization_code = None
        self.organization.save()
        with self.assertRaises(ValidationError):
            generate_organization_member_username(self.organization, 'Lionel Messi')

    def test_creation_api_uses_central_generator_and_scope(self):
        admin = User.objects.create_user(username='school.admin', password='Admin123!')
        self.organization.admin_user = admin
        self.organization.save()
        self.client.force_login(admin)
        response = self.client.post(reverse('react_dashboard_members_api'),
            data=json.dumps({'name': 'Lionel Messi', 'phone': '9800000000', 'member_type': 'student'}),
            content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        member = StudentProfile.objects.get(name='Lionel Messi')
        self.assertEqual(member.username, 'VISLM0001')
        self.assertEqual(member.college_id, self.organization.pk)

    def test_creation_api_manual_global_collision_returns_error(self):
        self.client.force_login(User.objects.create_superuser(username='platform', password='Admin123!'))
        User.objects.create(username='taken')
        response = self.client.post(f"{reverse('react_dashboard_members_api')}?school={self.organization.pk}",
            data=json.dumps({'name': 'Lionel Messi', 'phone': '9800000000', 'username': 'TAKEN'}),
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(StudentProfile.objects.filter(name='Lionel Messi').exists())


class ConcurrentOrganizationUsernameTests(TransactionTestCase):
    def test_concurrent_member_creation(self):
        organization = College.objects.create(name='Concurrent Creation', organization_code='VIS')

        def create(index):
            close_old_connections()
            try:
                return create_organization_member('SafePassword123!', college=organization,
                    name='Lionel Messi', phone=str(index), password='SafePassword123!').username
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=3) as workers:
            usernames = list(workers.map(create, range(4)))
        self.assertEqual(set(usernames), {f'VISLM{sequence:04d}' for sequence in range(1, 5)})
        self.assertEqual(StudentProfile.objects.count(), 4)
        self.assertEqual(User.objects.count(), 4)

    def test_concurrent_generation(self):
        organization = College.objects.create(name='Concurrent School', organization_code='VIS')

        def allocate(index):
            close_old_connections()
            try:
                return generate_organization_member_username(organization, 'Lionel Messi')
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=4) as workers:
            usernames = list(workers.map(allocate, range(8)))
        self.assertEqual(set(usernames), {f'VISLM{sequence:04d}' for sequence in range(1, 9)})
        organization.refresh_from_db()
        self.assertEqual(organization.member_username_sequence, 8)
