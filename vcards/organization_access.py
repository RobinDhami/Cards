from django.db.models import Q

from django.utils import timezone

from .models import College, OrganizationModuleAccess, OrganizationTeamMember


ROLE_CAPABILITIES = {
    'owner': {'overview', 'profile', 'menu', 'feedback', 'staff', 'loyalty', 'analytics', 'settings', 'team'},
    'manager': {'overview', 'profile', 'menu', 'feedback', 'staff', 'loyalty', 'analytics'},
    'menu_editor': {'menu'},
}

MODULE_CAPABILITIES = {
    'overview': {'overview'},
    'profile': {'profile'},
    'menu': {'menu'},
    'feedback': {'feedback'},
    'staff_cards': {'staff'},
    'loyalty': {'loyalty'},
    'analytics': {'analytics'},
    'ordering': set(),  # Reserved until the ordering workspace is released.
}
MODULE_KEYS = tuple(MODULE_CAPABILITIES)
DEFAULT_HOSPITALITY_MODULES = {'overview', 'profile', 'menu', 'feedback', 'staff_cards', 'loyalty', 'analytics'}


def ensure_organization_modules(organization):
    """Preserve the current hospitality workspace until Super Admin selects its plan."""
    if organization.organization_type != 'hospitality':
        return []
    existing = {row.module_key for row in organization.module_access.all()}
    now = timezone.now()
    for key in MODULE_KEYS:
        if key not in existing:
            OrganizationModuleAccess.objects.create(
                organization=organization,
                module_key=key,
                is_enabled=key in DEFAULT_HOSPITALITY_MODULES,
                enabled_at=now if key in DEFAULT_HOSPITALITY_MODULES else None,
            )
    return list(organization.module_access.all())


def enabled_organization_modules(organization):
    if organization.organization_type != 'hospitality':
        return set(MODULE_KEYS)
    ensure_organization_modules(organization)
    now = timezone.now()
    return {
        row.module_key for row in organization.module_access.all()
        if row.is_enabled and (not row.ends_at or row.ends_at >= now)
    }


def effective_capabilities(user, organization):
    role = organization_role(user, organization)
    capabilities = set(ROLE_CAPABILITIES.get(role, set()))
    if organization.organization_type != 'hospitality':
        return capabilities
    enabled = enabled_organization_modules(organization)
    module_capabilities = set().union(*(MODULE_CAPABILITIES[key] for key in enabled)) if enabled else set()
    # Settings is the route used to review the plan and request a change.
    return (capabilities & module_capabilities) | (capabilities & {'settings', 'team'})


def ensure_organization_owner(organization):
    if organization.admin_user_id:
        member, _ = OrganizationTeamMember.objects.get_or_create(
            organization=organization,
            user_id=organization.admin_user_id,
            defaults={'invite_email': organization.admin_user.email or '', 'role': 'owner', 'status': 'active'},
        )
        if member.role != 'owner' or member.status != 'active':
            member.role, member.status = 'owner', 'active'
            member.save(update_fields=['role', 'status', 'updated_at'])


def organization_role(user, organization):
    if not user or not user.is_authenticated:
        return ''
    if user.is_superuser:
        return 'owner'
    ensure_organization_owner(organization)
    member = OrganizationTeamMember.objects.filter(
        organization=organization, user=user, status='active',
    ).first()
    if member:
        return member.role
    return ''


def can_access_organization(user, organization, capability):
    return capability in effective_capabilities(user, organization)


def accessible_organizations(user):
    if user.is_superuser:
        return College.objects.all()
    return College.objects.filter(
        Q(admin_user=user) | Q(team_members__user=user, team_members__status='active'),
    ).distinct()
