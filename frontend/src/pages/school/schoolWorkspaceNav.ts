import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import LayoutList from 'lucide-react/dist/esm/icons/layout-list.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import Printer from 'lucide-react/dist/esm/icons/printer.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import Palette from 'lucide-react/dist/esm/icons/palette.js'
import Info from 'lucide-react/dist/esm/icons/info.js'
import { queryString } from '../../lib/api'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { workspaceMemberNavigation } from './organizationModuleConfig'

export function withSchool(path: string, schoolId?: number | null) {
  return `${path}${schoolId ? queryString({ school: schoolId }) : ''}`
}

export function schoolWorkspaceNav(schoolId?: number | null, isSuperAdmin = false, organizationType = '') {
  const path = window.location.pathname
  const search = window.location.search

  if (schoolId && path.startsWith('/dashboard/organizations/')) {
    const workspaceRoot = `/dashboard/organizations/${schoolId}`
    if (organizationType === 'hospitality') {
      const hospitalityRoot = `${workspaceRoot}/hospitality`
      return [
        { label: 'Profile & Menu', href: `${hospitalityRoot}/`, icon: Palette, active: (path === hospitalityRoot || path === `${hospitalityRoot}/`) && !new URLSearchParams(search).get('tab') },
        { label: 'Staff Profiles', href: `${workspaceRoot}/members/`, icon: Users, active: path.includes('/members') },
        { label: 'Analytics', href: `${hospitalityRoot}/?tab=analytics`, icon: BarChart3, active: path.startsWith(hospitalityRoot) && new URLSearchParams(search).get('tab') === 'analytics' },
        { label: 'Organization settings', href: `${workspaceRoot}/settings/`, icon: Settings, active: path.includes('/settings') },
      ]
    }
    if (organizationType === 'club') {
      const clubRoot = `${workspaceRoot}/club`
      return [
        { label: 'Overview', href: `${clubRoot}/`, icon: LayoutDashboard, active: path === clubRoot || path === `${clubRoot}/` },
        { label: 'Members', href: `${clubRoot}/members/`, icon: Users, active: path.includes('/club/members/') },
        { label: 'Profile Design', href: `${clubRoot}/profile-design/`, icon: Palette, active: path.includes('/club/profile-design/') },
        { label: 'Club Information', href: `${clubRoot}/club-information/`, icon: Info, active: path.includes('/club/club-information/') },
        { label: 'Analytics', href: `${workspaceRoot}/reports/`, icon: BarChart3, active: path.includes('/reports') },
        { label: 'Settings', href: `${clubRoot}/settings/`, icon: Settings, active: path.includes('/club/settings/') },
      ]
    }
    return [
      { label: 'Overview', href: `${workspaceRoot}/`, icon: LayoutDashboard, active: path === workspaceRoot || path === `${workspaceRoot}/` },
      ...workspaceMemberNavigation(organizationType).map((item) => ({
        label: item.label, href: `${workspaceRoot}/members/${item.query}`, icon: LayoutList,
        active: path.includes('/members') && (item.query ? search === item.query : !search),
      })),
      { label: 'Bulk Upload', href: `${workspaceRoot}/bulk-upload/`, icon: Upload, active: path.includes('/bulk-upload') },
      { label: 'Print Studio', href: `${workspaceRoot}/print/`, icon: Printer, active: path.includes('/print') },
      { label: 'QR & Export', href: `${workspaceRoot}/exports/`, icon: QrCode, active: path.includes('/exports') },
      { label: 'Analytics', href: `${workspaceRoot}/reports/`, icon: BarChart3, active: path.includes('/reports') },
      { label: 'Settings', href: `${workspaceRoot}/settings/`, icon: Settings, active: path.includes('/settings') },
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
