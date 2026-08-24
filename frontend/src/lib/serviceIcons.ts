import type { ComponentType, SVGProps } from 'react'
import Activity from 'lucide-react/dist/esm/icons/activity.js'
import Baby from 'lucide-react/dist/esm/icons/baby.js'
import BedDouble from 'lucide-react/dist/esm/icons/bed-double.js'
import BookOpen from 'lucide-react/dist/esm/icons/book-open.js'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import BusFront from 'lucide-react/dist/esm/icons/bus-front.js'
import CakeSlice from 'lucide-react/dist/esm/icons/cake-slice.js'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check.js'
import Camera from 'lucide-react/dist/esm/icons/camera.js'
import Car from 'lucide-react/dist/esm/icons/car.js'
import ChartNoAxesCombined from 'lucide-react/dist/esm/icons/chart-no-axes-combined.js'
import Coffee from 'lucide-react/dist/esm/icons/coffee.js'
import Code2 from 'lucide-react/dist/esm/icons/code-2.js'
import Database from 'lucide-react/dist/esm/icons/database.js'
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell.js'
import Flower2 from 'lucide-react/dist/esm/icons/flower-2.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import Goal from 'lucide-react/dist/esm/icons/goal.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import Hammer from 'lucide-react/dist/esm/icons/hammer.js'
import HandHeart from 'lucide-react/dist/esm/icons/hand-heart.js'
import HardHat from 'lucide-react/dist/esm/icons/hard-hat.js'
import Headphones from 'lucide-react/dist/esm/icons/headphones.js'
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake.js'
import HeartPulse from 'lucide-react/dist/esm/icons/heart-pulse.js'
import Hospital from 'lucide-react/dist/esm/icons/hospital.js'
import Hotel from 'lucide-react/dist/esm/icons/hotel.js'
import House from 'lucide-react/dist/esm/icons/house.js'
import Landmark from 'lucide-react/dist/esm/icons/landmark.js'
import Languages from 'lucide-react/dist/esm/icons/languages.js'
import Leaf from 'lucide-react/dist/esm/icons/leaf.js'
import Megaphone from 'lucide-react/dist/esm/icons/megaphone.js'
import Monitor from 'lucide-react/dist/esm/icons/monitor.js'
import Palette from 'lucide-react/dist/esm/icons/palette.js'
import PawPrint from 'lucide-react/dist/esm/icons/paw-print.js'
import PenTool from 'lucide-react/dist/esm/icons/pen-tool.js'
import Plane from 'lucide-react/dist/esm/icons/plane.js'
import Rocket from 'lucide-react/dist/esm/icons/rocket.js'
import Ruler from 'lucide-react/dist/esm/icons/ruler.js'
import Scissors from 'lucide-react/dist/esm/icons/scissors.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import Shirt from 'lucide-react/dist/esm/icons/shirt.js'
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag.js'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import Stethoscope from 'lucide-react/dist/esm/icons/stethoscope.js'
import Timer from 'lucide-react/dist/esm/icons/timer.js'
import Trophy from 'lucide-react/dist/esm/icons/trophy.js'
import Truck from 'lucide-react/dist/esm/icons/truck.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import Wrench from 'lucide-react/dist/esm/icons/wrench.js'

export type ServiceIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export type ServiceIconCategory =
  | 'Business'
  | 'Education'
  | 'Fashion'
  | 'Sports'
  | 'Technology'
  | 'Health'
  | 'Finance'
  | 'Hospitality'
  | 'Services'

export type ServiceIconDefinition = {
  value: string
  label: string
  category: ServiceIconCategory
  keywords: string
  Icon: ServiceIcon
}

export const serviceIconCatalog: ServiceIconDefinition[] = [
  { value: 'briefcase', label: 'Business', category: 'Business', keywords: 'briefcase work consulting professional office', Icon: BriefcaseBusiness },
  { value: 'building-2', label: 'Organization', category: 'Business', keywords: 'institution company corporate office', Icon: Building2 },
  { value: 'megaphone', label: 'Marketing', category: 'Business', keywords: 'promotion advertising announcement sales', Icon: Megaphone },
  { value: 'users', label: 'Team & Community', category: 'Business', keywords: 'people group community staff membership', Icon: Users },
  { value: 'heart-handshake', label: 'Support', category: 'Business', keywords: 'care help partnership customer success', Icon: HeartHandshake },
  { value: 'calendar-check', label: 'Booking', category: 'Business', keywords: 'appointment schedule reservation date', Icon: CalendarCheck },
  { value: 'rocket', label: 'Launch & Growth', category: 'Business', keywords: 'startup growth launch innovation', Icon: Rocket },
  { value: 'graduation-cap', label: 'Education', category: 'Education', keywords: 'school college university student degree', Icon: GraduationCap },
  { value: 'book-open', label: 'Learning', category: 'Education', keywords: 'book course study reading curriculum', Icon: BookOpen },
  { value: 'languages', label: 'Languages', category: 'Education', keywords: 'translation language communication class', Icon: Languages },
  { value: 'bus-front', label: 'School Transport', category: 'Education', keywords: 'bus transport school pickup', Icon: BusFront },
  { value: 'baby', label: 'Early Learning', category: 'Education', keywords: 'child nursery preschool kids childcare', Icon: Baby },
  { value: 'shirt', label: 'Clothing', category: 'Fashion', keywords: 'fashion apparel garment tshirt uniform', Icon: Shirt },
  { value: 'shopping-bag', label: 'Shopping', category: 'Fashion', keywords: 'shop retail boutique collection ecommerce', Icon: ShoppingBag },
  { value: 'scissors', label: 'Tailoring', category: 'Fashion', keywords: 'cut tailor alteration salon craft', Icon: Scissors },
  { value: 'ruler', label: 'Custom Fit', category: 'Fashion', keywords: 'measurement size bespoke tailoring', Icon: Ruler },
  { value: 'palette', label: 'Design', category: 'Fashion', keywords: 'creative styling colour art branding', Icon: Palette },
  { value: 'trophy', label: 'Achievement', category: 'Sports', keywords: 'winner award championship competition', Icon: Trophy },
  { value: 'dumbbell', label: 'Fitness', category: 'Sports', keywords: 'gym strength conditioning workout training', Icon: Dumbbell },
  { value: 'goal', label: 'Football', category: 'Sports', keywords: 'soccer football goal coaching academy', Icon: Goal },
  { value: 'timer', label: 'Performance', category: 'Sports', keywords: 'speed time coaching performance practice', Icon: Timer },
  { value: 'activity', label: 'Active Program', category: 'Sports', keywords: 'movement wellness performance activity', Icon: Activity },
  { value: 'code', label: 'Development', category: 'Technology', keywords: 'software coding website programming', Icon: Code2 },
  { value: 'monitor', label: 'IT & Computer', category: 'Technology', keywords: 'desktop computer software technology', Icon: Monitor },
  { value: 'smartphone', label: 'Mobile Apps', category: 'Technology', keywords: 'phone app mobile digital', Icon: Smartphone },
  { value: 'database', label: 'Data', category: 'Technology', keywords: 'database storage cloud information', Icon: Database },
  { value: 'bar-chart-2', label: 'Analytics', category: 'Technology', keywords: 'chart data growth reporting insights', Icon: ChartNoAxesCombined },
  { value: 'shield-check', label: 'Security', category: 'Technology', keywords: 'privacy secure trust protection verification', Icon: ShieldCheck },
  { value: 'globe', label: 'Web & Global', category: 'Technology', keywords: 'internet website worldwide online', Icon: Globe2 },
  { value: 'headphones', label: 'Technical Support', category: 'Technology', keywords: 'support helpdesk call service', Icon: Headphones },
  { value: 'heart-pulse', label: 'Health & Wellness', category: 'Health', keywords: 'health heartbeat wellness medical', Icon: HeartPulse },
  { value: 'stethoscope', label: 'Medical Care', category: 'Health', keywords: 'doctor clinic checkup medicine', Icon: Stethoscope },
  { value: 'hospital', label: 'Hospital', category: 'Health', keywords: 'clinic hospital treatment facility', Icon: Hospital },
  { value: 'hand-heart', label: 'Personal Care', category: 'Health', keywords: 'care therapy wellbeing support', Icon: HandHeart },
  { value: 'landmark', label: 'Banking', category: 'Finance', keywords: 'bank finance government investment', Icon: Landmark },
  { value: 'chart-no-axes-combined', label: 'Financial Growth', category: 'Finance', keywords: 'investment revenue growth trading', Icon: ChartNoAxesCombined },
  { value: 'shield-check-finance', label: 'Insurance', category: 'Finance', keywords: 'insurance protection policy trust', Icon: ShieldCheck },
  { value: 'hotel', label: 'Hotel', category: 'Hospitality', keywords: 'hotel resort accommodation travel', Icon: Hotel },
  { value: 'bed-double', label: 'Accommodation', category: 'Hospitality', keywords: 'room stay lodging guest', Icon: BedDouble },
  { value: 'utensils', label: 'Food & Dining', category: 'Hospitality', keywords: 'restaurant cafe food catering', Icon: Utensils },
  { value: 'coffee', label: 'Cafe', category: 'Hospitality', keywords: 'coffee cafe beverage hospitality', Icon: Coffee },
  { value: 'cake-slice', label: 'Bakery', category: 'Hospitality', keywords: 'cake bakery dessert event', Icon: CakeSlice },
  { value: 'plane', label: 'Travel', category: 'Hospitality', keywords: 'flight tourism travel tour', Icon: Plane },
  { value: 'camera', label: 'Photography', category: 'Services', keywords: 'photo video media production', Icon: Camera },
  { value: 'pen-tool', label: 'Content', category: 'Services', keywords: 'writing content copy editing', Icon: PenTool },
  { value: 'home', label: 'Property', category: 'Services', keywords: 'home real estate housing property', Icon: House },
  { value: 'car', label: 'Automotive', category: 'Services', keywords: 'car vehicle rental repair transport', Icon: Car },
  { value: 'truck', label: 'Delivery & Logistics', category: 'Services', keywords: 'shipping logistics delivery transport', Icon: Truck },
  { value: 'wrench', label: 'Repair', category: 'Services', keywords: 'maintenance mechanic fix service', Icon: Wrench },
  { value: 'hammer', label: 'Construction', category: 'Services', keywords: 'build construction carpenter craft', Icon: Hammer },
  { value: 'hard-hat', label: 'Engineering', category: 'Services', keywords: 'engineering construction safety contractor', Icon: HardHat },
  { value: 'leaf', label: 'Sustainability', category: 'Services', keywords: 'eco environment agriculture organic', Icon: Leaf },
  { value: 'flower-2', label: 'Beauty & Wellness', category: 'Services', keywords: 'beauty spa salon wellness floral', Icon: Flower2 },
  { value: 'paw-print', label: 'Pet Care', category: 'Services', keywords: 'animal pets veterinary grooming', Icon: PawPrint },
  { value: 'sparkles', label: 'Other Service', category: 'Services', keywords: 'custom premium special other', Icon: Sparkles },
]

export const serviceIconMap = Object.fromEntries(
  serviceIconCatalog.map(({ value, Icon }) => [value, Icon]),
) as Record<string, ServiceIcon>

export const serviceIconCategories = [
  'All',
  'Business',
  'Education',
  'Fashion',
  'Sports',
  'Technology',
  'Health',
  'Finance',
  'Hospitality',
  'Services',
] as const

export function suggestServiceIcon(text: string) {
  const query = text.toLowerCase().trim()
  if (!query) return 'briefcase'
  return serviceIconCatalog.find((item) => `${item.label} ${item.keywords}`.toLowerCase().split(' ').some((word) => query.includes(word)))?.value ?? 'briefcase'
}
