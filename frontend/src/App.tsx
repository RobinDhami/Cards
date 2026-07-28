import { HomePage } from './pages/home/HomePage'
import { DashboardHome } from './pages/dashboard/DashboardHome'

function App() {
  if (window.location.pathname.startsWith('/dashboard')) {
    return <DashboardHome />
  }

  return <HomePage />
}

export default App
