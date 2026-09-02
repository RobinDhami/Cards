import Activity from 'lucide-react/dist/esm/icons/activity.js'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import type { ShellNavItem } from './ManageShell'

export type PlatformModule = 'overview' | 'organizations' | 'members' | 'professionals' | 'templates' | 'cards' | 'activity' | 'reports' | 'settings'

const platformItems: Array<Omit<ShellNavItem, 'active'> & { module: PlatformModule }> = [
  { module: 'overview', label: 'Overview', href: '/dashboard/', icon: LayoutDashboard },
  { module: 'organizations', label: 'Organizations', href: '/dashboard/schools/', icon: Building2 },
  { module: 'professionals', label: 'Profiles', href: '/dashboard/professional-cards/', icon: UserRound },
  { module: 'templates', label: 'Templates', href: '/dashboard/templates/', icon: LayoutTemplate },
  { module: 'activity', label: 'Activity', href: '/dashboard/activity/', icon: Activity },
  { module: 'reports', label: 'Reports', href: '/dashboard/reports/', icon: BarChart3 },
  { module: 'settings', label: 'Settings', href: '/dashboard/settings/', icon: Settings },
]

export function platformNavigation(allowedModules: string[], path = window.location.pathname) {
  const allowed = new Set(allowedModules)
  return platformItems
    .filter((item) => allowed.has(item.module))
    .map(({ module, ...item }) => ({
      ...item,
      active: path === item.href
        || path === item.href.slice(0, -1)
        || (module === 'settings' && path.startsWith(item.href)),
    }))
}
