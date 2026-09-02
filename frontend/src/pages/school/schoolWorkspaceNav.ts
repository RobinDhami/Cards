import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import LayoutList from 'lucide-react/dist/esm/icons/layout-list.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import Printer from 'lucide-react/dist/esm/icons/printer.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import { queryString } from '../../lib/api'
import { platformNavigation } from '../../components/manage/platformNavigation'

export function withSchool(path: string, schoolId?: number | null) {
  return `${path}${schoolId ? queryString({ school: schoolId }) : ''}`
}

export function schoolWorkspaceNav(schoolId?: number | null, isSuperAdmin = false) {
  const path = window.location.pathname

  if (schoolId && path.startsWith('/dashboard/organizations/')) {
    const workspaceRoot = `/dashboard/organizations/${schoolId}`
    return [
      ...(isSuperAdmin ? [{ label: 'All Organizations', href: '/dashboard/schools/', icon: Building2, active: false }] : []),
      { label: 'Overview', href: `${workspaceRoot}/`, icon: LayoutDashboard, active: path === workspaceRoot || path === `${workspaceRoot}/` },
      { label: 'Members', href: `${workspaceRoot}/members/`, icon: LayoutList, active: path.includes('/members') || path.includes('/credentials') },
      { label: 'Bulk Upload', href: `${workspaceRoot}/bulk-upload/`, icon: Upload, active: path.includes('/bulk-upload') },
      { label: 'Print Studio', href: `${workspaceRoot}/print/`, icon: Printer, active: path.includes('/print') },
      { label: 'QR & Export', href: `${workspaceRoot}/exports/`, icon: QrCode, active: path.includes('/exports') },
      { label: 'Reports', href: `${workspaceRoot}/reports/`, icon: BarChart3, active: path.includes('/reports') },
      { label: 'Settings', href: `${workspaceRoot}/settings/`, icon: Settings, active: path.includes('/settings') },
    ]
  }

  if (isSuperAdmin) {
    return platformNavigation([
      'overview', 'organizations', 'members', 'professionals', 'templates',
      'cards', 'activity', 'reports', 'settings',
    ], path)
  }

  return [
    { label: 'Overview', href: withSchool('/dashboard/', schoolId), icon: LayoutDashboard, active: path === '/dashboard/' || path === '/dashboard' },
    { label: 'Students', href: withSchool('/dashboard/students/', schoolId), icon: GraduationCap, active: path.includes('/students') || path.includes('/credentials') },
    { label: 'Teachers & Staff', href: withSchool('/dashboard/teachers/', schoolId), icon: Users, active: path.includes('/teachers') },
    { label: 'Reports', href: withSchool('/dashboard/reports/', schoolId), icon: BarChart3, active: path.includes('/reports') },
    { label: 'Bulk Upload', href: withSchool('/dashboard/bulk-upload/', schoolId), icon: Upload, active: path.includes('/bulk-upload') },
    { label: 'ID Card Studio', href: withSchool('/dashboard/print/', schoolId), icon: Printer, active: path.includes('/print') },
    { label: 'QR & Data Export', href: withSchool('/dashboard/qr-export/', schoolId), icon: QrCode, active: path.includes('/qr-export') },
    { label: 'Settings', href: withSchool('/dashboard/settings/', schoolId), icon: Settings, active: path.includes('/settings') },
  ]
}
