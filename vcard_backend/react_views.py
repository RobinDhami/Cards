import json
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import redirect
from django.urls import reverse

from vcards.organization_access import accessible_organizations
from vcards.models import College
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
    vanity_organization = None
    organization_slug = kwargs.get('organization_slug')
    if organization_slug:
        vanity_organization = College.objects.filter(workspace_slug__iexact=organization_slug).first()
        if not vanity_organization:
            return HttpResponse('Organization workspace not found.', status=404)
        organization_id = vanity_organization.id
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

    # Owners and organization teams use the branded tenant URL. Numeric paths
    # remain available to Super Admin for platform configuration and as legacy
    # entry points for old bookmarks.
    if (
        organization_id
        and not vanity_organization
        and request.user.is_authenticated
        and not request.user.is_superuser
    ):
        organization = accessible_organizations(request.user).filter(pk=organization_id).first()
        if organization:
            relative = request.path.split(f'/dashboard/organizations/{organization_id}/', 1)[-1].strip('/')
            pieces = relative.split('/') if relative else []
            section = ''
            if pieces[:1] == ['hospitality']:
                section = request.GET.get('tab', 'overview')
            elif pieces[:1] == ['club'] and len(pieces) <= 2:
                section = pieces[1] if len(pieces) == 2 else ''
            elif len(pieces) == 1 and pieces[0] in {
                'members', 'bulk-upload', 'print', 'exports', 'reports', 'settings', 'support',
            }:
                section = pieces[0]
            should_redirect = (
                not pieces
                or (pieces[:1] == ['hospitality'] and len(pieces) == 1)
                or (pieces[:1] == ['club'] and len(pieces) <= 2)
                or (len(pieces) == 1 and bool(section))
            )
            if should_redirect:
                destination = reverse('organization_vanity_dashboard', args=[organization.workspace_slug])
                if section and section != 'overview':
                    destination = f'{destination}{section}/'
                remaining_query = request.GET.copy()
                remaining_query.pop('tab', None)
                if remaining_query:
                    destination = f'{destination}?{remaining_query.urlencode()}'
                return redirect(destination)

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

    if vanity_organization:
        context = json.dumps({
            'id': vanity_organization.id,
            'slug': vanity_organization.workspace_slug,
            'type': vanity_organization.organization_type or 'generic',
        }).replace('<', '\\u003c')
        html = html.replace('<head>', f'<head><script>window.__TAP2CONNECT_ORGANIZATION__={context};</script>', 1)
    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response
