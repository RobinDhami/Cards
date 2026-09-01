import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from professional_cards.models import ProfessionalProfile
from vcards.models import College, ProfileActivity, Skill, StudentProfile


class StudentDigitalCardTests(TestCase):
    def setUp(self):
        self.school = College.objects.create(
            name='Tap2Connect Academy',
            email='school@example.com',
            phone='9800000000',
        )
        self.owner = User.objects.create_user(
            username='student.owner',
            password='OwnerPass123!',
            first_name='Student Owner',
        )
        self.student = StudentProfile.objects.create(
            college=self.school,
            auth_user=self.owner,
            name='Student Owner',
            username='student.owner',
            password='OwnerPass123!',
            phone='9811111111',
            email='student@example.com',
            member_type='student',
            academic_level='grade_10',
            section='A',
            emergency_contact_name='Private Guardian',
            emergency_contact_phone='9822222222',
            blood_group='O+',
            address='Private home address',
            about_intro='A curious student interested in technology and community projects.',
            about_featured='School robotics finalist.',
            about_current='Learning Python and open to student collaborations.',
            show_contact_card=True,
        )
        self.skill = Skill.objects.create(name='Python')
        self.student.skills.add(self.skill)

    def test_public_card_shows_about_but_hides_private_details(self):
        response = self.client.get(
            reverse('react_student_public_api', args=[self.student.id])
        )

        self.assertEqual(response.status_code, 200)
        profile = response.json()['profile']
        self.assertEqual(profile['intro'], self.student.about_intro)
        self.assertEqual(profile['featured'], self.student.about_featured)
        self.assertEqual(profile['current'], self.student.about_current)
        self.assertEqual(profile['skills'], [self.skill.name])
        self.assertFalse(profile['canViewPrivateDetails'])
        self.assertEqual(profile['guardianName'], '')
        self.assertEqual(profile['emergencyPhone'], '')
        self.assertEqual(profile['bloodGroup'], '')

    def test_owner_can_view_private_details(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            reverse('react_student_public_api', args=[self.student.id])
        )

        self.assertEqual(response.status_code, 200)
        profile = response.json()['profile']
        self.assertTrue(profile['canViewPrivateDetails'])
        self.assertEqual(profile['guardianName'], self.student.emergency_contact_name)
        self.assertEqual(profile['emergencyPhone'], self.student.emergency_contact_phone)
        self.assertEqual(profile['address'], self.student.address)

    def test_profile_credentials_create_full_owner_session(self):
        response = self.client.post(
            reverse('react_student_login_api', args=[self.student.id]),
            data=json.dumps({
                'username': self.student.username,
                'password': 'OwnerPass123!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirectPath'],
            reverse('student_owner_dashboard', args=[self.student.id]),
        )
        self.assertEqual(int(self.client.session['_auth_user_id']), self.owner.id)
        dashboard = self.client.get(
            reverse('react_student_dashboard_api', args=[self.student.id])
        )
        self.assertEqual(dashboard.status_code, 200)

    def test_main_login_routes_student_to_owner_dashboard(self):
        response = self.client.post(
            reverse('react_session_login_api'),
            data=json.dumps({
                'username': self.owner.username,
                'password': 'OwnerPass123!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['redirectPath'],
            reverse('student_owner_dashboard', args=[self.student.id]),
        )

    def test_owner_can_edit_about_fields(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            reverse('react_student_manage_api', args=[self.student.id]),
            data=json.dumps({
                'about_intro': 'Updated public introduction.',
                'about_featured': 'Updated achievement.',
                'about_current': 'Available for a science club project.',
                'skills': ['Python', 'Robotics'],
                'show_contact_card': True,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.about_intro, 'Updated public introduction.')
        self.assertEqual(self.student.about_featured, 'Updated achievement.')
        self.assertEqual(
            self.student.about_current,
            'Available for a science club project.',
        )
        self.assertSetEqual(
            set(self.student.skills.values_list('name', flat=True)),
            {'Python', 'Robotics'},
        )

    def test_other_user_cannot_edit_profile(self):
        outsider = User.objects.create_user(
            username='outsider',
            password='OutsiderPass123!',
        )
        self.client.force_login(outsider)

        response = self.client.get(
            reverse('react_student_manage_api', args=[self.student.id])
        )

        self.assertEqual(response.status_code, 403)

    def test_contact_action_is_tracked(self):
        response = self.client.get(
            reverse('track_contact_action', args=[self.student.id, 'phone'])
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], f'tel:{self.student.phone}')
        self.student.refresh_from_db()
        self.assertEqual(self.student.contact_clicks, 1)
        self.assertTrue(
            ProfileActivity.objects.filter(
                student=self.student,
                event_type='contact',
                action='phone',
            ).exists()
        )


class SchoolDashboardScopeTests(TestCase):
    def setUp(self):
        self.super_admin = User.objects.create_superuser(
            username='platform.admin',
            password='PlatformPass123!',
        )
        self.school_admin_a = User.objects.create_user(
            username='school.a.admin',
            password='SchoolPass123!',
        )
        self.school_admin_b = User.objects.create_user(
            username='school.b.admin',
            password='SchoolPass123!',
        )
        self.school_a = College.objects.create(
            name='School A',
            admin_user=self.school_admin_a,
        )
        self.school_b = College.objects.create(
            name='School B',
            admin_user=self.school_admin_b,
        )
        self.student_a = StudentProfile.objects.create(
            college=self.school_a,
            name='Student A',
            username='student.a',
            password='StudentPass123!',
            phone='9800000001',
            email='student.a@example.com',
            profile_category='school',
            member_type='student',
            academic_level='grade_9',
        )
        self.student_b = StudentProfile.objects.create(
            college=self.school_b,
            name='Student B',
            username='student.b',
            password='StudentPass123!',
            phone='9800000002',
            email='student.b@example.com',
            profile_category='school',
            member_type='student',
            academic_level='grade_10',
        )

    def test_school_admin_cannot_switch_to_another_school_by_query_string(self):
        self.client.force_login(self.school_admin_a)

        response = self.client.get(
            reverse('dashboard_overview_api'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['currentSchool']['id'], self.school_a.id)
        self.assertEqual(payload['analytics']['studentCount'], 1)

    def test_school_admin_cannot_open_platform_school_directory(self):
        self.client.force_login(self.school_admin_a)

        response = self.client.get(reverse('react_dashboard_schools_api'))

        self.assertEqual(response.status_code, 403)

    def test_reports_are_scoped_to_the_assigned_school(self):
        self.client.force_login(self.school_admin_a)

        response = self.client.get(
            reverse('react_dashboard_reports_api'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['shell']['currentSchool']['id'], self.school_a.id)
        self.assertEqual(payload['report']['studentCount'], 1)

    def test_super_admin_overview_ignores_selected_school_and_stays_platform_wide(self):
        self.client.force_login(self.super_admin)

        response = self.client.get(
            reverse('dashboard_overview_api'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload['currentSchool'])
        self.assertEqual(payload['organizationCount'], 2)
        self.assertEqual(payload['analytics']['memberCount'], 2)
        self.assertEqual(payload['analytics']['studentCount'], 2)

    def test_super_admin_overview_aggregates_all_organizations(self):
        self.client.force_login(self.super_admin)

        response = self.client.get(reverse('dashboard_overview_api'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload['currentSchool'])
        self.assertEqual(payload['organizationCount'], 2)
        self.assertEqual(payload['analytics']['memberCount'], 2)
        self.assertEqual(payload['analytics']['studentCount'], 2)

    def test_super_admin_can_view_all_member_types_in_one_organization_workspace(self):
        teacher = StudentProfile.objects.create(
            college=self.school_a,
            name='Teacher A',
            username='teacher.a',
            password='TeacherPass123!',
            phone='9800000003',
            email='teacher.a@example.com',
            profile_category='school',
            member_type='teacher',
        )
        self.client.force_login(self.super_admin)

        response = self.client.get(
            reverse('react_dashboard_members_api'),
            {'school': self.school_a.id, 'type': 'all'},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['shell']['currentSchool']['id'], self.school_a.id)
        self.assertEqual({member['id'] for member in payload['members']}, {self.student_a.id, teacher.id})

    def test_school_username_format_only_updates_assigned_school(self):
        self.client.force_login(self.school_admin_a)
        original_school_b_username = self.student_b.username

        response = self.client.post(
            reverse('assign_school_usernames'),
            {'school': self.school_b.id},
        )

        self.assertRedirects(
            response,
            f"{reverse('dashboard_students')}?school={self.school_a.id}",
            fetch_redirect_response=False,
        )
        self.student_a.refresh_from_db()
        self.student_b.refresh_from_db()
        self.assertTrue(self.student_a.username.startswith('school.a.'))
        self.assertEqual(self.student_b.username, original_school_b_username)

    def test_password_reset_is_post_only_and_school_scoped(self):
        self.client.force_login(self.school_admin_a)
        old_password = self.student_a.password

        get_response = self.client.get(
            reverse('reset_student_password', args=[self.student_a.id])
        )
        self.assertEqual(get_response.status_code, 405)

        post_response = self.client.post(
            reverse('reset_student_password', args=[self.student_a.id]),
            {'next': reverse('dashboard_students')},
        )
        self.assertRedirects(
            post_response,
            reverse('dashboard_students'),
            fetch_redirect_response=False,
        )
        self.student_a.refresh_from_db()
        self.assertNotEqual(self.student_a.password, old_password)
        self.assertTrue(self.student_a.password.startswith('pbkdf2_'))


class ReactMigrationApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='react.admin',
            password='ReactAdminPass123!',
        )
        self.school = College.objects.create(name='React Test School')
        self.client.force_login(self.admin)

    def test_vite_origin_can_complete_csrf_login(self):
        csrf_client = Client(enforce_csrf_checks=True, HTTP_HOST='127.0.0.1:8000')
        session_response = csrf_client.get(reverse('react_session_api'))
        token = session_response.json()['csrfToken']

        response = csrf_client.post(
            reverse('react_session_login_api'),
            data=json.dumps({
                'username': self.admin.username,
                'password': 'ReactAdminPass123!',
            }),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN='http://127.0.0.1:5173',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['authenticated'])
        self.assertEqual(response.json()['redirectPath'], '/dashboard/')

    def test_professional_profile_and_independent_service_are_created(self):
        response = self.client.post(
            reverse('react_professional_profiles_api'),
            {
                'profile_type': 'professional',
                'full_name': 'React Professional',
                'slug': 'react-professional',
                'header_identity': 'organization',
                'work_role': 'Chief Executive Officer',
                'work_organization': 'React International School',
                'academic_title': 'BSc CSIT',
                'academic_institution': 'Kathmandu Bernhardt College',
                'academic_level': "Bachelor's",
                'academic_year': 'Final Year / 6th Semester',
                'academic_specialization': 'Web Development / Networking',
                'academic_status': 'Seeking Internship / Open to Work',
                'is_active': 'on',
                'template_name': 'modern_identity',
                'accent_color': '#0f766e',
                'login_username': 'react.professional',
                'login_password': 'ProfessionalPass123!',
                'collections': json.dumps({
                    'services': [{
                        'title': 'School admissions',
                        'description': 'Organization service',
                        'icon': 'graduation-cap',
                    }],
                    'portfolio': [{
                        'title': 'Digital campus',
                        'highlight_type': 'project',
                        'organization': 'React International School',
                        'description': 'Independent highlight data',
                        'link': 'https://example.com/project',
                    }],
                    'testimonials': [],
                    'documents': [],
                }),
            },
        )

        self.assertEqual(response.status_code, 201)
        profile = ProfessionalProfile.objects.get(slug='react-professional')
        self.assertEqual(profile.work_role, 'Chief Executive Officer')
        self.assertEqual(profile.academic_status, 'Seeking Internship / Open to Work')
        self.assertEqual(profile.services.get().title, 'School admissions')
        self.assertEqual(
            profile.portfolio_items.get().organization,
            'React International School',
        )

    def test_school_member_can_be_created_without_email_or_whatsapp(self):
        response = self.client.post(
            f"{reverse('react_dashboard_members_api')}?school={self.school.id}",
            data=json.dumps({
                'name': 'Optional Contact Student',
                'phone': '9800000000',
                'email': '',
                'member_type': 'student',
                'academic_level': 'grade_10',
                'section': 'A',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        member = StudentProfile.objects.get(name='Optional Contact Student')
        self.assertEqual(member.email, '')
        self.assertIsNone(member.whatsapp)
        self.assertEqual(member.academic_level, 'grade_10')
