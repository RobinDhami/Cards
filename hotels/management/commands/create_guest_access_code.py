from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from hotels.models import GuestStay, NfcTouchpoint
from hotels.services import issue_guest_access_code


class Command(BaseCommand):
    help = 'Create a temporary active guest stay and print its one-time room access code.'

    def add_arguments(self, parser):
        parser.add_argument('public_identifier', help='Active room touchpoint public identifier, e.g. aurora-room-101')
        parser.add_argument('--guest-name', default='Development Guest')
        parser.add_argument('--hours', type=int, default=24)

    def handle(self, *args, **options):
        touchpoint = NfcTouchpoint.objects.select_related('hotel', 'room').filter(public_identifier=options['public_identifier'], is_active=True, hotel__is_active=True, room__isnull=False).first()
        if not touchpoint:
            raise CommandError('An active room touchpoint was not found.')
        now = timezone.now()
        stay = GuestStay.objects.create(hotel=touchpoint.hotel, room=touchpoint.room, guest_name=options['guest_name'], status='active', check_in_at=now, check_out_at=now + timedelta(hours=max(1, options['hours'])), token_expires_at=now + timedelta(hours=max(1, options['hours'])))
        code = issue_guest_access_code(stay, validity_seconds=min(max(300, options['hours'] * 3600), 86400))
        self.stdout.write(self.style.SUCCESS(f'Guest stay {stay.pk} created for {touchpoint.hotel.name}, room {touchpoint.room.identifier}.'))
        self.stdout.write(f'One-time access code: {code}')
