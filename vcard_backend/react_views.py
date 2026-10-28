from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import redirect

from vcards.organization_access import accessible_organizations
from vcards.platform_access import (
    has_platform_module_access,
    required_platform_module_for_path,
)


REACT_INDEX = Path(settings.BASE_DIR) / 'theme' / 'static' / 'react' / 'index.html'


def legacy_organizations_redirect(request):
    """Keep old bookmarks working without exposing the former Schools URL."""
    if not has_platform_module_access(request.user, 'organizations'):
        return HttpResponseForbidden('You do not have access to this platform module.')
    destination = '/dashboard/organizations/'
    query_string = request.META.get('QUERY_STRING', '')
    if query_string:
        destination = f'{destination}?{query_string}'
    return redirect(destination)


def react_app(request, *args, **kwargs):
    if request.path.rstrip('/') == '/dashboard/settings/staff-access' and not (
        request.user.is_authenticated and request.user.is_superuser
    ):
        return HttpResponseForbidden('Only Super Admins can manage Platform Staff.')
    organization_id = None
    if request.path.startswith('/dashboard/organizations/'):
        try:
            organization_id = int(request.path.split('/')[3])
        except (IndexError, ValueError):
            organization_id = None

    # Organization workspaces are private to their assigned team. Platform
    # module permissions grant access to the directory, not to customer data.
    if organization_id and not (
        request.user.is_authenticated
        and (
            request.user.is_superuser
            or accessible_organizations(request.user).filter(pk=organization_id).exists()
        )
    ):
        return HttpResponseForbidden('You do not have access to this organization.')

    required_module = required_platform_module_for_path(request.path)
    if required_module and not has_platform_module_access(request.user, required_module):
        organization_access = bool(
            organization_id
            and request.user.is_authenticated
            and accessible_organizations(request.user).filter(pk=organization_id).exists()
        )
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
