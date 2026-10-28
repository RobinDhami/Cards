from django.utils.text import slugify


RESERVED_ORGANIZATION_SLUGS = {
    'admin', 'api', 'card-editor', 'club-members', 'connections', 'dashboard',
    'health', 'login', 'logout', 'media', 'platform', 'profile', 'robots',
    'static', 'student', 'venue', 'workspaces',
}


def normalize_organization_slug(value):
    return slugify(str(value or '').strip())[:80]


def validate_organization_slug(value, *, queryset, exclude_pk=None):
    slug = normalize_organization_slug(value)
    if len(slug) < 3:
        return slug, 'Use at least 3 letters or numbers.'
    if slug in RESERVED_ORGANIZATION_SLUGS:
        return slug, 'This address is reserved. Choose another slug.'
    matches = queryset.filter(workspace_slug__iexact=slug)
    if exclude_pk:
        matches = matches.exclude(pk=exclude_pk)
    if matches.exists():
        return slug, 'This organization address is already taken.'
    return slug, ''
