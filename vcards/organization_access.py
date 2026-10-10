from django.db.models import Q

from .models import College, OrganizationTeamMember


ROLE_CAPABILITIES = {
    'owner': {'overview', 'profile', 'menu', 'feedback', 'staff', 'analytics', 'settings', 'team'},
    'manager': {'overview', 'profile', 'menu', 'feedback', 'staff', 'analytics'},
    'menu_editor': {'menu'},
}


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
    return member.role if member else ''


def can_access_organization(user, organization, capability):
    return capability in ROLE_CAPABILITIES.get(organization_role(user, organization), set())


def accessible_organizations(user):
    if user.is_superuser:
        return College.objects.all()
    return College.objects.filter(
        Q(admin_user=user) | Q(team_members__user=user, team_members__status='active'),
    ).distinct()
