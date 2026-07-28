import { HomePage } from './pages/home/HomePage'
import { DashboardHome } from './pages/dashboard/DashboardHome'
import { PublicProfessionalProfile } from './pages/profiles/PublicProfessionalProfile'

function App() {
  if (window.location.pathname.startsWith('/dashboard')) {
    return <DashboardHome />
  }

  if (window.location.pathname.startsWith('/p/')) {
    return <PublicProfessionalProfile />
  }

  return <HomePage />
}

export default App
