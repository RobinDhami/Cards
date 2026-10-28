export type OrganizationRouteContext = {
  id: number
  slug: string
  type: string
}

declare global {
  interface Window {
    __TAP2CONNECT_ORGANIZATION__?: OrganizationRouteContext
  }
}

export function organizationRouteContext() {
  return window.__TAP2CONNECT_ORGANIZATION__ ?? null
}

export function currentOrganizationId() {
  const numeric = window.location.pathname.match(/^\/dashboard\/organizations\/(\d+)/)?.[1]
  return Number(numeric || organizationRouteContext()?.id || 0)
}

export function organizationWorkspaceHref(
  organizationId: number,
  section = '',
  query = '',
) {
  const context = organizationRouteContext()
  const normalizedSection = section.replace(/^\/+|\/+$/g, '')
  const suffix = normalizedSection ? `${normalizedSection}/` : ''
  const search = query ? `?${query.replace(/^\?/, '')}` : ''
  if (context?.id === organizationId) {
    return `/${context.slug}/dashboard/${suffix}${search}`
  }
  return `/dashboard/organizations/${organizationId}/${suffix}${search}`
}

export function vanityDashboardMatch() {
  return window.location.pathname.match(/^\/([a-z0-9-]+)\/dashboard(?:\/([^/]+))?\/?$/i)
}
