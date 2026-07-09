from django.core.management.base import BaseCommand, CommandError

from vcards.models import College, StudentProfile
from vcards.views import _suggest_school_username, _sync_profile_auth_user


class Command(BaseCommand):
    help = 'Apply each school name and username convention to its existing students.'

    def add_arguments(self, parser):
        parser.add_argument('--school-id', type=int)

    def handle(self, *args, **options):
        schools = College.objects.order_by('id')
        if options['school_id']:
            schools = schools.filter(id=options['school_id'])
            if not schools.exists():
                raise CommandError(f"School {options['school_id']} does not exist.")

        total_updated = 0
        for school in schools:
            school_updated = 0
            students = StudentProfile.objects.filter(
                college=school,
                profile_category='school',
                member_type='student',
            ).order_by('id')
            for student in students:
                suffix = student.roll_number or student.unique_identifier or student.name
                new_username = _suggest_school_username(
                    school,
                    student.name,
                    suffix,
                    student,
                )
                changed_fields = []
                if student.username != new_username:
                    student.username = new_username
                    changed_fields.append('username')
                if student.organization_name != school.name:
                    student.organization_name = school.name
                    changed_fields.append('organization_name')
                if not changed_fields:
                    continue
                student.save(update_fields=changed_fields)
                if 'username' in changed_fields and student.auth_user_id:
                    _sync_profile_auth_user(student)
                    student.save(update_fields=['auth_user', 'username'])
                school_updated += 1

            total_updated += school_updated
            self.stdout.write(f'{school.name}: {school_updated} student records updated.')

        self.stdout.write(self.style.SUCCESS(
            f'School defaults applied to {total_updated} student records.'
        ))
