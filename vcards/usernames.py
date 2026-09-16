"""Global member usernames and durable, organization-wide sequence allocation."""
import re
import unicodedata
import time
from functools import wraps

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, OperationalError, connection, transaction
from django.db.models import F


def retry_sqlite_lock(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        deadline = time.monotonic() + 5
        nested = connection.in_atomic_block
        while True:
            try:
                return function(*args, **kwargs)
            except OperationalError as exc:
                if nested or connection.vendor != 'sqlite' or 'locked' not in str(exc).lower() or time.monotonic() >= deadline:
                    raise
                # Retry the entire transaction, never a broken savepoint.
                time.sleep(0.02)
    return wrapped


def normalize_member_username(value):
    value = unicodedata.normalize('NFKC', str(value or '')).strip().upper()
    if not value or len(value) > 150 or not re.fullmatch(r'[A-Z0-9@._+-]+', value):
        raise ValidationError('Username must be 1–150 letters, numbers, or @ . + - _ characters.')
    return value


def username_is_taken(value, student=None):
    from .models import StudentProfile
    users = User.objects.filter(username__iexact=value)
    profiles = StudentProfile.objects.filter(username__iexact=value)
    if student and student.pk:
        profiles = profiles.exclude(pk=student.pk)
        if student.auth_user_id:
            users = users.exclude(pk=student.auth_user_id)
    return users.exists() or profiles.exists()


def validate_member_username(value, student=None):
    value = normalize_member_username(value)
    if username_is_taken(value, student):
        raise ValidationError('That username is already in use across Tap2Connect.')
    return value


def member_initials(name):
    words = []
    for word in str(name or '').split():
        letters = re.sub('[^A-Z]', '', unicodedata.normalize('NFKD', word).encode('ascii', 'ignore').decode().upper())
        if letters:
            words.append(letters)
    if not words:
        raise ValidationError('Enter a name containing Latin letters to generate a username.')
    return words[0][0] + words[-1][0] if len(words) > 1 else words[0][:2]


@retry_sqlite_lock
def generate_organization_member_username(organization, name):
    from .models import College
    initials = member_initials(name)
    # UPDATE is the first database operation: it takes the write/row lock even
    # on SQLite, where SELECT FOR UPDATE alone does not lock anything.
    with transaction.atomic():
        if not College.objects.filter(pk=organization.pk).update(member_username_sequence=F('member_username_sequence') + 1):
            raise ValidationError('Choose a saved organization first.')
        locked = College.objects.only('organization_code', 'member_username_sequence').get(pk=organization.pk)
        code = (locked.organization_code or '').strip().upper()
        if not re.fullmatch('[A-Z0-9]{1,12}', code):
            raise ValidationError('Assign a valid organization code before creating members.')
        while True:
            candidate = f'{code}{initials}{locked.member_username_sequence:04d}'
            if not username_is_taken(candidate):
                return candidate
            College.objects.filter(pk=locked.pk).update(member_username_sequence=F('member_username_sequence') + 1)
            locked.refresh_from_db(fields=['member_username_sequence'])


@retry_sqlite_lock
def create_organization_member(raw_password, **fields):
    from .models import College, StudentProfile
    from .views import _sync_profile_auth_user
    requested = fields.get('username')
    fields.setdefault('password_change_required', True)
    while True:
        candidate = ''
        try:
            with transaction.atomic():
                if requested:
                    organization = fields['college']
                    if not College.objects.filter(pk=organization.pk).update(member_username_sequence=F('member_username_sequence') + 1):
                        raise ValidationError('Choose a saved organization first.')
                    candidate = validate_member_username(requested)
                    code = College.objects.values_list('organization_code', flat=True).get(pk=organization.pk) or ''
                    formatted = re.fullmatch(re.escape(code.upper()) + r'[A-Z]{1,2}(\d{4,})', candidate) if code else None
                    if formatted:
                        sequence = int(formatted.group(1))
                        College.objects.filter(pk=organization.pk, member_username_sequence__lt=sequence).update(member_username_sequence=sequence)
                else:
                    candidate = generate_organization_member_username(fields['college'], fields['name'])
                member = StudentProfile.objects.create(**{**fields, 'username': candidate})
                _sync_profile_auth_user(member, raw_password)
                member.save(update_fields=['auth_user', 'username'])
                return member
        except (IntegrityError, ValidationError):
            # Only retry a generated-username race. Never hide unrelated database
            # failures, append a manual suffix, or attach to the colliding user.
            if requested or not candidate or not username_is_taken(candidate):
                raise


def persist_organization_member(member, raw_password):
    """Use the same creation transaction for legacy form-built instances."""
    fields = {
        field.name: getattr(member, field.name)
        for field in member._meta.concrete_fields
        if not field.primary_key and field.name != 'auth_user'
        and not getattr(field, 'auto_now_add', False)
        and not getattr(field, 'auto_now', False)
    }
    return create_organization_member(raw_password, **fields)
