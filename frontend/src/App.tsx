import { lazy, Suspense } from 'react'
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
import { ProfessionalConnections } from './pages/professional/ProfessionalConnections'
import {
  PublicStudentCard,
  StudentEditLogin,
  StudentEditor,
  StudentOwnerDashboard,
} from './pages/students/StudentWorkspace'
import { SchoolDashboardRouter } from './pages/school/SchoolDashboard'
import { MigrationNeededPage } from './pages/migration/MigrationNeededPage'

const CardEditorPage = lazy(() =>
  import('./features/card-editor/CardEditorPage').then((module) => ({
    default: module.CardEditorPage,
  })),
)

function routeMatches(path: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(path))
}

const schoolDashboardRoutes = [
  /^\/dashboard\/schools\/?$/,
  /^\/dashboard\/students\/?$/,
  /^\/dashboard\/teachers\/?$/,
  /^\/dashboard\/reports\/?$/,
  /^\/dashboard\/settings\/?$/,
  /^\/dashboard\/print\/?$/,
  /^\/dashboard\/qr-export\/?$/,
  /^\/dashboard\/bulk-upload\/?$/,
  /^\/dashboard\/student\/\d+\/credentials\/?$/,
]

const oldProjectRoutesNeedingMigration = [
  /^\/profile\/\d+\/?$/,
  /^\/dashboard\/create\/?$/,
  /^\/dashboard\/college_details\/\d+\/?$/,
  /^\/dashboard\/edit_college\/\d+\/?$/,
  /^\/dashboard\/add_college\/?$/,
  /^\/dashboard\/delete_college\/\d+\/?$/,
  /^\/dashboard\/delete\/\d+\/?$/,
  /^\/dashboard\/reset-password\/\d+\/?$/,
  /^\/dashboard\/students\/assign-usernames\/?$/,
  /^\/bulk-upload\/?$/,
  /^\/dashboard\/college\/\d+\/add_student\/?$/,
  /^\/ai-chat\/?$/,
]

function App() {
  const path = window.location.pathname

  if (path === '/' || path === '') {
    return <HomePage />
  }

  if (path === '/login/' || path === '/login') {
    return <LoginPage />
  }

  if (
    path === '/card-editor/'
    || path === '/card-editor'
    || path === '/dashboard/templates/'
    || path === '/dashboard/templates'
  ) {
    return (
      <Suspense fallback={<div className="route-loading-screen">Opening card editor…</div>}>
        <CardEditorPage />
      </Suspense>
    )
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

  if (path === '/connections/' || path === '/connections') {
    return <ProfessionalConnections />
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

  if (path === '/dashboard/' || path === '/dashboard') {
    return <DashboardHome />
  }

  if (routeMatches(path, schoolDashboardRoutes)) {
    return <SchoolDashboardRouter />
  }

  if (routeMatches(path, oldProjectRoutesNeedingMigration)) {
    return <MigrationNeededPage />
  }

  if (
    path.startsWith('/dashboard/')
    || path.startsWith('/student/')
    || path.startsWith('/profile/')
    || path.startsWith('/p/')
  ) {
    return <MigrationNeededPage />
  }

  return <MigrationNeededPage title="Route not found in React" />
}

export default App
