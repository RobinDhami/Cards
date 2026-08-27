import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('./pages/home/HomePage').then((module) => ({ default: module.HomePage })))
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome').then((module) => ({ default: module.DashboardHome })))
const PublicProfessionalProfile = lazy(() => import('./pages/profiles/PublicProfessionalProfile').then((module) => ({ default: module.PublicProfessionalProfile })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const ProfessionalEditLogin = lazy(() => import('./pages/professional/ProfessionalWorkspace').then((module) => ({ default: module.ProfessionalEditLogin })))
const ProfessionalProfileDelete = lazy(() => import('./pages/professional/ProfessionalWorkspace').then((module) => ({ default: module.ProfessionalProfileDelete })))
const ProfessionalProfileEditor = lazy(() => import('./pages/professional/ProfessionalWorkspace').then((module) => ({ default: module.ProfessionalProfileEditor })))
const ProfessionalProfileList = lazy(() => import('./pages/professional/ProfessionalWorkspace').then((module) => ({ default: module.ProfessionalProfileList })))
const ProfessionalConnections = lazy(() => import('./pages/professional/ProfessionalConnections').then((module) => ({ default: module.ProfessionalConnections })))
const PublicStudentCard = lazy(() => import('./pages/students/StudentWorkspace').then((module) => ({ default: module.PublicStudentCard })))
const StudentEditLogin = lazy(() => import('./pages/students/StudentWorkspace').then((module) => ({ default: module.StudentEditLogin })))
const StudentEditor = lazy(() => import('./pages/students/StudentWorkspace').then((module) => ({ default: module.StudentEditor })))
const StudentOwnerDashboard = lazy(() => import('./pages/students/StudentWorkspace').then((module) => ({ default: module.StudentOwnerDashboard })))
const SchoolDashboardRouter = lazy(() => import('./pages/school/SchoolDashboard').then((module) => ({ default: module.SchoolDashboardRouter })))
const MigrationNeededPage = lazy(() => import('./pages/migration/MigrationNeededPage').then((module) => ({ default: module.MigrationNeededPage })))

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

function AppRoutes() {
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
    return <CardEditorPage />
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

function App() {
  return (
    <Suspense fallback={<div className="route-loading-screen">Loading…</div>}>
      <AppRoutes />
    </Suspense>
  )
}

export default App
