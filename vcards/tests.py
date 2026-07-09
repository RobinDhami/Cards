from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

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
        response = self.client.get(reverse('student_contact_card', args=[self.student.id]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Current focus')
        self.assertContains(response, self.student.about_intro)
        self.assertContains(response, self.student.about_featured)
        self.assertContains(response, self.student.about_current)
        self.assertContains(response, self.skill.name)
        self.assertContains(response, 'Login is required')
        self.assertNotContains(response, self.student.emergency_contact_name)
        self.assertNotContains(response, self.student.emergency_contact_phone)
        self.assertNotContains(response, self.student.address)

    def test_owner_can_view_private_details(self):
        self.client.force_login(self.owner)

        response = self.client.get(reverse('student_contact_card', args=[self.student.id]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.student.emergency_contact_name)
        self.assertContains(response, self.student.emergency_contact_phone)
        self.assertContains(response, self.student.address)

    def test_profile_credentials_create_full_owner_session(self):
        response = self.client.post(
            reverse('edit_student_auth', args=[self.student.id]),
            {
                'username': self.student.username,
                'password': 'OwnerPass123!',
            },
        )

        self.assertRedirects(
            response,
            reverse('student_owner_dashboard', args=[self.student.id]),
            fetch_redirect_response=False,
        )
        self.assertEqual(int(self.client.session['_auth_user_id']), self.owner.id)
        dashboard = self.client.get(
            reverse('student_owner_dashboard', args=[self.student.id])
        )
        self.assertEqual(dashboard.status_code, 200)

    def test_main_login_routes_student_to_owner_dashboard(self):
        response = self.client.post(
            reverse('dashboard_login'),
            {'username': self.owner.username, 'password': 'OwnerPass123!'},
        )

        self.assertRedirects(
            response,
            reverse('student_owner_dashboard', args=[self.student.id]),
            fetch_redirect_response=False,
        )

    def test_owner_can_edit_about_fields(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            reverse('edit_student_manual', args=[self.student.id]),
            {
                'name': self.student.name,
                'username': self.student.username,
                'email': self.student.email,
                'phone': self.student.phone,
                'about_intro': 'Updated public introduction.',
                'about_featured': 'Updated achievement.',
                'about_current': 'Available for a science club project.',
                'custom_skills': 'Python, Robotics',
                'show_contact_card': 'on',
            },
        )

        self.assertRedirects(
            response,
            reverse('contact_card', args=[self.student.id]),
            fetch_redirect_response=False,
        )
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
            reverse('edit_student_manual', args=[self.student.id])
        )

        self.assertRedirects(
            response,
            reverse('edit_student_auth', args=[self.student.id]),
            fetch_redirect_response=False,
        )

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
            reverse('admin_dashboard'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['current_school'], self.school_a)
        self.assertEqual(response.context['analytics']['student_count'], 1)
        self.assertContains(response, 'School A')
        self.assertNotContains(response, 'Student B')

    def test_school_admin_cannot_open_platform_school_directory(self):
        self.client.force_login(self.school_admin_a)

        response = self.client.get(reverse('dashboard_schools'))

        self.assertRedirects(response, reverse('admin_dashboard'))

    def test_reports_are_scoped_to_the_assigned_school(self):
        self.client.force_login(self.school_admin_a)

        response = self.client.get(
            reverse('dashboard_reports'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['current_school'], self.school_a)
        self.assertEqual(response.context['student_count'], 1)

    def test_super_admin_can_switch_school_workspaces(self):
        self.client.force_login(self.super_admin)

        response = self.client.get(
            reverse('admin_dashboard'),
            {'school': self.school_b.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['current_school'], self.school_b)

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
