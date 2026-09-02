from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden

from vcards.platform_access import (
    has_platform_module_access,
    required_platform_module_for_path,
)


REACT_INDEX = Path(settings.BASE_DIR) / 'theme' / 'static' / 'react' / 'index.html'


def react_app(request, *args, **kwargs):
    if request.path.rstrip('/') == '/dashboard/settings/staff-access' and not (
        request.user.is_authenticated and request.user.is_superuser
    ):
        return HttpResponseForbidden('Only Super Admins can manage Platform Staff.')
    required_module = required_platform_module_for_path(request.path)
    if required_module and not has_platform_module_access(request.user, required_module):
        organization_access = False
        if request.user.is_authenticated and required_module in {'members', 'cards', 'reports', 'settings'}:
            organization_access = request.user.managed_schools.exists()
        elif request.user.is_authenticated and request.path.startswith('/dashboard/organizations/'):
            try:
                organization_id = int(request.path.split('/')[3])
            except (IndexError, ValueError):
                organization_id = 0
            organization_access = request.user.managed_schools.filter(id=organization_id).exists()
        if not organization_access:
            return HttpResponseForbidden('You do not have access to this platform module.')
    try:
        html = REACT_INDEX.read_text(encoding='utf-8')
    except FileNotFoundError:
        message = (
            'The React frontend has not been built. Run "pnpm build" in the '
            'frontend directory, or open http://127.0.0.1:5173 during development.'
        )
        return HttpResponse(message, status=503, content_type='text/plain; charset=utf-8')

    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response
