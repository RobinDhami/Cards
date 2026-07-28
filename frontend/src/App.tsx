import { HomePage } from './pages/home/HomePage'
import { DashboardHome } from './pages/dashboard/DashboardHome'
import { PublicProfessionalProfile } from './pages/profiles/PublicProfessionalProfile'
import { LoginPage } from './pages/auth/LoginPage'
import {
  ProfessionalEditLogin,
  ProfessionalProfileDelete,
  ProfessionalProfileEditor,
  ProfessionalProfileList,
} from './pages/professional/ProfessionalWorkspace'
import {
  PublicStudentCard,
  StudentEditLogin,
  StudentEditor,
  StudentOwnerDashboard,
} from './pages/students/StudentWorkspace'
import { SchoolDashboardRouter } from './pages/school/SchoolDashboard'
import { ShopDashboardRouter } from './pages/shop/ShopDashboard'
import { StorefrontApp } from './pages/storefront/StorefrontApp'

function App() {
  const path = window.location.pathname

  if (path === '/login/' || path === '/login') {
    return <LoginPage />
  }

  if (/^\/p\/[^/]+\/edit-login\/?$/.test(path)) {
    return <ProfessionalEditLogin />
  }

  if (/^\/p\/[^/]+\/edit\/?$/.test(path)) {
    return <ProfessionalProfileEditor />
  }

  if (/^\/p\/[^/]+\/?$/.test(path)) {
    return <PublicProfessionalProfile />
  }

  if (path === '/dashboard/professional-cards/' || path === '/dashboard/professional-cards') {
    return <ProfessionalProfileList />
  }

  if (/^\/dashboard\/professional-cards\/(?:add|\d+\/edit)\/?$/.test(path)) {
    return <ProfessionalProfileEditor />
  }

  if (/^\/dashboard\/professional-cards\/\d+\/delete\/?$/.test(path)) {
    return <ProfessionalProfileDelete />
  }

  if (/^\/student\/\d+\/login\/?$/.test(path)) {
    return <StudentEditLogin />
  }

  if (/^\/student\/\d+\/manage\/?$/.test(path)) {
    return <StudentOwnerDashboard />
  }

  if (/^\/student\/edit\/\d+\/?$/.test(path) || /^\/dashboard\/edit\/\d+\/?$/.test(path)) {
    return <StudentEditor />
  }

  if (/^\/student\/\d+(?:\/contact-card)?\/?$/.test(path)) {
    return <PublicStudentCard />
  }

  if (path.startsWith('/shop/') && path.includes('/owner')) {
    return <ShopDashboardRouter />
  }

  if (path.startsWith('/shop/')) {
    return <StorefrontApp />
  }

  if (path === '/dashboard/' || path === '/dashboard') {
    return <DashboardHome />
  }

  if (path.startsWith('/dashboard/')) {
    const page = <SchoolDashboardRouter />
    if (page) return page
  }

  return <HomePage />
}

export default App
