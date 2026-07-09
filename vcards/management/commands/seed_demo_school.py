from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from vcards.models import College, ProfileActivity, Skill, StudentCard, StudentProfile


DEMO_NAMES = [
    'Aarav Shrestha', 'Aarya Karki', 'Aayush Thapa', 'Anisha Gurung',
    'Bibek Maharjan', 'Diya Poudel', 'Ishan Rai', 'Kabir Adhikari',
    'Kritika Bista', 'Manish Lama', 'Maya Tamang', 'Nabin Koirala',
    'Nisha Khadka', 'Prabin Ghimire', 'Pragya Basnet', 'Pratiksha KC',
    'Rijan Bhattarai', 'Riya Joshi', 'Roshan Ale', 'Samiksha Chand',
    'Sanjay Gautam', 'Sarina Magar', 'Siddhant Neupane', 'Sneha Raut',
    'Sujal Pandey', 'Swastika Malla', 'Ujjwal Bohara', 'Yuna Shahi',
]

DEMO_LEVELS = (
    ['grade_6'] * 3
    + ['grade_7'] * 5
    + ['grade_8'] * 4
    + ['grade_9'] * 6
    + ['grade_10'] * 4
    + ['grade_11'] * 3
    + ['grade_12'] * 3
)


class Command(BaseCommand):
    help = 'Seed idempotent demo students, cards, skills, and engagement for one school.'

    def add_arguments(self, parser):
        parser.add_argument('--school-id', type=int, required=True)

    def handle(self, *args, **options):
        school = College.objects.filter(id=options['school_id']).first()
        if not school:
            raise CommandError(f"School {options['school_id']} does not exist.")

        skills = {
            name: Skill.objects.get_or_create(name=name)[0]
            for name in ('Communication', 'Python', 'Robotics', 'Public speaking', 'Sports')
        }
        created_count = 0
        updated_count = 0
        activity_count = 0

        for index, (name, academic_level) in enumerate(zip(DEMO_NAMES, DEMO_LEVELS), start=1):
            username = f'demo.student.{school.id}.{index:02d}'
            live = index % 5 != 0
            student, created = StudentProfile.objects.update_or_create(
                username=username,
                defaults={
                    'college': school,
                    'name': name,
                    'password': 'DemoStudent123!',
                    'phone': f'98{school.id:02d}{index:06d}'[:10],
                    'email': f'demo.student.{school.id}.{index:02d}@example.edu',
                    'profile_category': 'school',
                    'member_type': 'student',
                    'role': 'Student',
                    'organization_name': school.name,
                    'academic_level': academic_level,
                    'section': ('A', 'B', 'C')[index % 3],
                    'roll_number': f'{index:03d}',
                    'gender': ('male', 'female', 'other')[index % 3],
                    'blood_group': ('A+', 'B+', 'O+', 'AB+')[index % 4],
                    'address': f'Demo residential address {index}',
                    'emergency_contact_name': f'Demo Guardian {index}',
                    'emergency_contact_phone': f'97{school.id:02d}{index:06d}'[:10],
                    'about_intro': f'{name} is building a verified academic identity through {school.name}.',
                    'about_current': 'Participating in classroom projects and co-curricular activities.',
                    'about_featured': 'Active learner with consistent school participation.',
                    'facebook': 'https://www.facebook.com/',
                    'instagram': 'https://www.instagram.com/',
                    'twitter': 'https://x.com/',
                    'linkedin': 'https://www.linkedin.com/',
                    'youtube': 'https://www.youtube.com/',
                    'tiktok': 'https://www.tiktok.com/',
                    'github': 'https://github.com/',
                    'figma': 'https://www.figma.com/',
                    'upwork': 'https://www.upwork.com/',
                    'website': school.website or 'https://tap2connect.com/',
                    'social_stack': 'facebook,instagram,linkedin,youtube',
                    'show_contact_card': live,
                    'views': 12 + (index * 7),
                    'contact_clicks': 2 + (index % 8),
                    'downloads': index % 6,
                },
            )
            created_count += int(created)
            updated_count += int(not created)
            student.skills.set([
                skills[('Communication', 'Python', 'Robotics', 'Public speaking', 'Sports')[index % 5]],
                skills['Communication'],
            ])

            if index % 4 != 0:
                StudentCard.objects.update_or_create(
                    card_uid=f'DEMO-{school.id}-{index:04d}',
                    defaults={
                        'student': student,
                        'card_number': f'{school.id:02d}-{index:05d}',
                        'is_active': True,
                        'lost_or_blocked': False,
                    },
                )
            elif index % 8 == 0:
                StudentCard.objects.update_or_create(
                    card_uid=f'DEMO-{school.id}-{index:04d}',
                    defaults={
                        'student': student,
                        'card_number': f'{school.id:02d}-{index:05d}',
                        'is_active': False,
                        'lost_or_blocked': True,
                    },
                )

            ProfileActivity.objects.filter(student=student, action__startswith='demo-').delete()
            events = [
                ('view', 'demo-card-view', (index * 2) % 7),
                ('view', 'demo-qr-view', (index * 3) % 14),
                ('contact', 'demo-phone', (index * 5) % 21),
            ]
            if index % 3 == 0:
                events.append(('download', 'demo-vcard', (index * 4) % 28))
            for event_type, action, days_ago in events:
                activity = ProfileActivity.objects.create(
                    student=student,
                    event_type=event_type,
                    action=action,
                )
                ProfileActivity.objects.filter(pk=activity.pk).update(
                    created_at=timezone.now() - timedelta(days=days_ago, hours=index % 12)
                )
                activity_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Demo data ready for {school.name}: '
            f'{created_count} students created, {updated_count} refreshed, '
            f'{activity_count} activities seeded.'
        ))
