import House from 'lucide-react/dist/esm/icons/house.js'
import MenuIcon from 'lucide-react/dist/esm/icons/menu.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import { navigateGuest } from './guest-navigation'

export type GuestNavItem = 'services' | 'home' | 'menu'

export function GuestBottomNav({ publicIdentifier, active = 'home', showServices = true, showMenu = true }: { publicIdentifier: string; active?: GuestNavItem; showServices?: boolean; showMenu?: boolean }) {
  const item = (key: GuestNavItem, label: string, Icon: typeof House) => (
    <a
      className={`guest-bottom-nav__item${active === key ? ' is-active' : ''}`}
      href={`/guest/${encodeURIComponent(publicIdentifier)}${key === 'home' ? '' : `/${key}`}`}
      onClick={(event) => navigateGuest(event, `/guest/${encodeURIComponent(publicIdentifier)}${key === 'home' ? '' : `/${key}`}`)}
      aria-label={label}
    >
      <span className="guest-bottom-nav__icon"><Icon size={19} strokeWidth={1.8} /></span>
      <span>{label}</span>
    </a>
  )
  return <nav className="guest-bottom-nav" aria-label="Guest navigation">{showServices && item('services', 'Services', MenuIcon)}{item('home', 'Home', House)}{showMenu && item('menu', 'Menu', Utensils)}</nav>
}
