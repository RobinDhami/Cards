from collections import OrderedDict


PLATFORM_MODULES = OrderedDict([
    ('overview', {'label': 'Overview', 'destination': '/dashboard/'}),
    ('organizations', {'label': 'Organizations', 'destination': '/dashboard/schools/'}),
    ('members', {'label': 'Members', 'destination': '/dashboard/students/'}),
    ('professionals', {'label': 'Profiles', 'destination': '/dashboard/professional-cards/'}),
    ('templates', {'label': 'Templates', 'destination': '/dashboard/templates/'}),
    ('cards', {'label': 'Cards', 'destination': '/dashboard/print/'}),
    ('activity', {'label': 'Activity', 'destination': '/dashboard/activity/'}),
    ('reports', {'label': 'Reports', 'destination': '/dashboard/reports/'}),
    ('settings', {'label': 'Settings', 'destination': '/dashboard/settings/'}),
])


def platform_permission_codename(module):
    return f'access_platform_{module}'


def platform_permission_name(module):
    return f'vcards.{platform_permission_codename(module)}'


def get_allowed_platform_modules(user):
    if not user.is_authenticated:
        return []
    if user.is_superuser:
        return list(PLATFORM_MODULES)
    return [
        module
        for module in PLATFORM_MODULES
        if user.has_perm(platform_permission_name(module))
    ]


def has_platform_module_access(user, module):
    return bool(
        user.is_authenticated
        and module in PLATFORM_MODULES
        and (user.is_superuser or user.has_perm(platform_permission_name(module)))
    )


def default_platform_destination(user):
    modules = get_allowed_platform_modules(user)
    return PLATFORM_MODULES[modules[0]]['destination'] if modules else ''


def platform_access_payload(user):
    return {
        'isSuperAdmin': bool(user.is_authenticated and user.is_superuser),
        'allowedModules': get_allowed_platform_modules(user),
    }


def required_platform_module_for_path(path):
    normalized = path.rstrip('/') or '/'
    if normalized == '/dashboard':
        return 'overview'
    if normalized == '/dashboard/schools':
        return 'organizations'
    if normalized.startswith('/dashboard/organizations/'):
        if '/members' in normalized:
            return 'members'
        if '/settings' in normalized:
            return 'settings'
        if '/bulk-upload' in normalized:
            return 'members'
        return 'organizations'
    if normalized.startswith('/dashboard/professional-cards'):
        return 'professionals'
    if normalized == '/dashboard/templates':
        return 'templates'
    if normalized.startswith(('/dashboard/students', '/dashboard/teachers')):
        return 'members'
    if normalized.startswith(('/dashboard/print', '/dashboard/qr-export')):
        return 'cards'
    if normalized == '/dashboard/activity':
        return 'activity'
    if normalized == '/dashboard/reports':
        return 'reports'
    if normalized.startswith('/dashboard/settings'):
        return 'settings'
    return None
