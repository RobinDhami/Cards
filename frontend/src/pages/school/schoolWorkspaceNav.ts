import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.mjs'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.mjs'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.mjs'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.mjs'
import Printer from 'lucide-react/dist/esm/icons/printer.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import School from 'lucide-react/dist/esm/icons/school.mjs'
import Settings from 'lucide-react/dist/esm/icons/settings.mjs'
import Upload from 'lucide-react/dist/esm/icons/upload.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { backendHref, queryString } from '../../lib/api'

export function withSchool(path: string, schoolId?: number | null) {
  return `${path}${schoolId ? queryString({ school: schoolId }) : ''}`
}

export function schoolWorkspaceNav(schoolId?: number | null, isSuperAdmin = false) {
  const path = window.location.pathname
  return [
    { label: 'Overview', href: withSchool('/dashboard/', schoolId), icon: LayoutDashboard, active: path === '/dashboard/' || path === '/dashboard' },
    ...(isSuperAdmin ? [{ label: 'Schools', href: '/dashboard/schools/', icon: School, active: path.includes('/schools') }] : []),
    { label: 'Students', href: withSchool('/dashboard/students/', schoolId), icon: GraduationCap, active: path.includes('/students') || path.includes('/credentials') },
    { label: 'Teachers & Staff', href: withSchool('/dashboard/teachers/', schoolId), icon: Users, active: path.includes('/teachers') },
    { label: 'Reports', href: withSchool('/dashboard/reports/', schoolId), icon: BarChart3, active: path.includes('/reports') },
    { label: 'Bulk Upload', href: withSchool('/dashboard/bulk-upload/', schoolId), icon: Upload, active: path.includes('/bulk-upload') },
    { label: 'ID Card Studio', href: withSchool('/dashboard/print/', schoolId), icon: Printer, active: path.includes('/print') },
    { label: 'QR & Data Export', href: withSchool('/dashboard/qr-export/', schoolId), icon: QrCode, active: path.includes('/qr-export') },
    ...(isSuperAdmin ? [
      { label: 'Professional Cards', href: '/dashboard/professional-cards/', icon: BadgeCheck, active: path.includes('/professional-cards') },
      { label: 'Business Suite', href: backendHref('/dashboard/business-suite/'), icon: BriefcaseBusiness, active: path.includes('/business-suite') },
    ] : []),
    { label: 'Settings', href: withSchool('/dashboard/settings/', schoolId), icon: Settings, active: path.includes('/settings') },
  ]
}
