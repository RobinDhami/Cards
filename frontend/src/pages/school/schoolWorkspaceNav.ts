import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import LayoutList from 'lucide-react/dist/esm/icons/layout-list.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js'
import Printer from 'lucide-react/dist/esm/icons/printer.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import Palette from 'lucide-react/dist/esm/icons/palette.js'
import Info from 'lucide-react/dist/esm/icons/info.js'
import Store from 'lucide-react/dist/esm/icons/store.js'
import Gift from 'lucide-react/dist/esm/icons/gift.js'
import { queryString } from '../../lib/api'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { workspaceMemberNavigation } from './organizationModuleConfig'
import { organizationRouteContext, organizationWorkspaceHref } from '../../lib/organizationRoute'

export function withSchool(path: string, schoolId?: number | null) {
  return `${path}${schoolId ? queryString({ school: schoolId }) : ''}`
}

export function schoolWorkspaceNav(schoolId?: number | null, isSuperAdmin = false, organizationType = '', capabilities?: string[]) {
  const path = window.location.pathname
  const search = window.location.search
  const vanity = organizationRouteContext()

  if (schoolId && (path.startsWith('/dashboard/organizations/') || vanity?.id === schoolId)) {
    const workspaceRoot = `/dashboard/organizations/${schoolId}`
    if (organizationType === 'hospitality') {
      const hospitalityRoot = `${workspaceRoot}/hospitality`
      const section = path.match(/^\/[a-z0-9-]+\/dashboard(?:\/([^/]+))?\/?$/i)?.[1] || new URLSearchParams(search).get('tab') || 'overview'
      const items = [
        { label: 'Overview', href: vanity ? organizationWorkspaceHref(schoolId) : `${hospitalityRoot}/?tab=overview`, icon: LayoutDashboard, active: section === 'overview' },
        { label: 'Profile', href: vanity ? organizationWorkspaceHref(schoolId, 'profile') : `${hospitalityRoot}/?tab=profile`, icon: Store, active: section === 'profile' },
        { label: 'Menu', href: vanity ? organizationWorkspaceHref(schoolId, 'menu') : `${hospitalityRoot}/?tab=menu`, icon: Utensils, active: section === 'menu' },
        { label: 'Feedback', href: vanity ? organizationWorkspaceHref(schoolId, 'feedback') : `${hospitalityRoot}/?tab=feedback`, icon: MessageSquare, active: section === 'feedback' },
        { label: 'Staff & Cards', href: vanity ? organizationWorkspaceHref(schoolId, 'staff') : `${hospitalityRoot}/?tab=staff`, icon: Users, active: section === 'staff' },
        { label: 'Rewards', href: vanity ? organizationWorkspaceHref(schoolId, 'loyalty') : `${hospitalityRoot}/?tab=loyalty`, icon: Gift, active: section === 'loyalty' },
        { label: 'Members', href: vanity ? organizationWorkspaceHref(schoolId, 'members') : `${hospitalityRoot}/?tab=members`, icon: Users, active: section === 'members' },
        { label: 'Analytics', href: vanity ? organizationWorkspaceHref(schoolId, 'analytics') : `${hospitalityRoot}/?tab=analytics`, icon: BarChart3, active: section === 'analytics' },
        { label: 'Settings', href: vanity ? organizationWorkspaceHref(schoolId, 'settings') : `${workspaceRoot}/settings/`, icon: Settings, active: section === 'settings' || path.includes('/settings') },
      ]
      const capabilityFor: Record<string, string> = {
        Overview: 'overview', Profile: 'profile', Menu: 'menu', Feedback: 'feedback',
        'Staff & Cards': 'staff', Rewards: 'loyalty', Members: 'loyalty', Analytics: 'analytics', Settings: 'settings',
      }
      return capabilities ? items.filter((item) => capabilities.includes(capabilityFor[item.label])) : items
    }
    if (organizationType === 'club') {
      const clubRoot = `${workspaceRoot}/club`
      return [
        { label: 'Overview', href: vanity ? organizationWorkspaceHref(schoolId) : `${clubRoot}/`, icon: LayoutDashboard, active: !path.match(/dashboard\/.+/) || path === clubRoot || path === `${clubRoot}/` },
        { label: 'Members', href: vanity ? organizationWorkspaceHref(schoolId, 'members') : `${clubRoot}/members/`, icon: Users, active: path.includes('/members/') },
        { label: 'Profile Design', href: vanity ? organizationWorkspaceHref(schoolId, 'profile-design') : `${clubRoot}/profile-design/`, icon: Palette, active: path.includes('/profile-design/') },
        { label: 'Club Information', href: vanity ? organizationWorkspaceHref(schoolId, 'club-information') : `${clubRoot}/club-information/`, icon: Info, active: path.includes('/club-information/') },
        { label: 'Analytics', href: vanity ? organizationWorkspaceHref(schoolId, 'reports') : `${workspaceRoot}/reports/`, icon: BarChart3, active: path.includes('/reports') },
        { label: 'Settings', href: vanity ? organizationWorkspaceHref(schoolId, 'settings') : `${clubRoot}/settings/`, icon: Settings, active: path.includes('/settings/') },
      ]
    }
    return [
      { label: 'Overview', href: vanity ? organizationWorkspaceHref(schoolId) : `${workspaceRoot}/`, icon: LayoutDashboard, active: path === workspaceRoot || path === `${workspaceRoot}/` || Boolean(vanity && !path.match(/dashboard\/.+/)) },
      ...workspaceMemberNavigation(organizationType).map((item) => ({
        label: item.label, href: vanity ? organizationWorkspaceHref(schoolId, 'members', item.query) : `${workspaceRoot}/members/${item.query}`, icon: LayoutList,
        active: path.includes('/members') && (item.query ? search === item.query : !search),
      })),
      { label: 'Bulk Upload', href: vanity ? organizationWorkspaceHref(schoolId, 'bulk-upload') : `${workspaceRoot}/bulk-upload/`, icon: Upload, active: path.includes('/bulk-upload') },
      { label: 'Print Studio', href: vanity ? organizationWorkspaceHref(schoolId, 'print') : `${workspaceRoot}/print/`, icon: Printer, active: path.includes('/print') },
      { label: 'QR & Export', href: vanity ? organizationWorkspaceHref(schoolId, 'exports') : `${workspaceRoot}/exports/`, icon: QrCode, active: path.includes('/exports') },
      { label: 'Analytics', href: vanity ? organizationWorkspaceHref(schoolId, 'reports') : `${workspaceRoot}/reports/`, icon: BarChart3, active: path.includes('/reports') },
      { label: 'Settings', href: vanity ? organizationWorkspaceHref(schoolId, 'settings') : `${workspaceRoot}/settings/`, icon: Settings, active: path.includes('/settings') },
    ]
  }

  if (isSuperAdmin) {
    return platformNavigation([
      'overview', 'organizations', 'members', 'professionals', 'templates',
      'cards', 'card_operations', 'activity', 'reports', 'settings',
    ], path)
  }

  return [
    { label: 'Overview', href: withSchool('/dashboard/', schoolId), icon: LayoutDashboard, active: path === '/dashboard/' || path === '/dashboard' },
    { label: 'Students', href: withSchool('/dashboard/students/', schoolId), icon: GraduationCap, active: path.includes('/students') || path.includes('/credentials') },
    { label: 'Teachers & Staff', href: withSchool('/dashboard/teachers/', schoolId), icon: Users, active: path.includes('/teachers') },
    { label: 'Analytics', href: withSchool('/dashboard/reports/', schoolId), icon: BarChart3, active: path.includes('/reports') },
    { label: 'Bulk Upload', href: withSchool('/dashboard/bulk-upload/', schoolId), icon: Upload, active: path.includes('/bulk-upload') },
    { label: 'ID Card Studio', href: withSchool('/dashboard/print/', schoolId), icon: Printer, active: path.includes('/print') },
    { label: 'QR & Data Export', href: withSchool('/dashboard/qr-export/', schoolId), icon: QrCode, active: path.includes('/qr-export') },
    { label: 'Settings', href: withSchool('/dashboard/settings/', schoolId), icon: Settings, active: path.includes('/settings') },
  ]
}
