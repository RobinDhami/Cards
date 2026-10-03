export type OrganizationModuleKey = 'education' | 'club' | 'business' | 'hospitality' | 'other' | 'generic'

const genericConfig = {
  title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers & Staff' }, { value: 'other', label: 'Other Members' }],
  bulkHint: 'Optional columns include email, username, role, roll_number, academic_level, section, address, emergency contact, blood group, and gender.',
  dashboardMetrics: [['memberCount', 'Members'], ['liveProfileCount', 'Active profiles'], ['activeCardCount', 'Assigned cards']] as const,
} as const

const hospitalityConfig = {
  title: 'Staff Profiles', memberTypes: [{ value: 'staff', label: 'Staff Members' }, { value: 'other', label: 'Other Members' }],
  bulkHint: 'Optional hospitality staff columns include email, username, designation, department, employee ID, address, emergency contact, blood group, and gender.',
  dashboardMetrics: [['memberCount', 'Staff Profiles'], ['liveProfileCount', 'Active Profiles'], ['activeCardCount', 'Assigned Cards']] as const,
} as const

export const organizationModuleConfig = {
  generic: {
    title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers & Staff' }, { value: 'other', label: 'Other Members' }],
    bulkHint: 'Optional columns include email, username, role, roll_number, academic_level, section, address, emergency contact, blood group, and gender.',
    dashboardMetrics: [['memberCount', 'Members'], ['liveProfileCount', 'Active profiles'], ['activeCardCount', 'Assigned cards']] as const,
  },
  education: {
    title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers' }, { value: 'staff', label: 'Staff / Administration' }, { value: 'other', label: 'Other Members' }],
    bulkHint: 'Optional education columns include role, academic_year, faculty_program, academic_level, section, roll_number, and department.',
    dashboardMetrics: [['memberCount', 'Total Members'], ['studentCount', 'Students'], ['teacherCount', 'Teachers'], ['staffCount', 'Staff'], ['liveProfileCount', 'Active Profiles'], ['activeCardCount', 'Assigned Cards']] as const,
  },
  club: {
    title: 'Members', memberTypes: [{ value: 'member', label: 'Members' }],
    filters: [{ value: 'executive', label: 'Executive / Board' }, { value: 'committee', label: 'Committee' }, { value: 'general', label: 'General Members' }],
    bulkHint: 'Optional club columns include membership_id, role, committee, membership_term, and join_date (YYYY-MM-DD).',
    dashboardMetrics: [['memberCount', 'Total Members'], ['executiveCount', 'Executive / Board'], ['committeeCount', 'Committee'], ['generalMemberCount', 'General Members'], ['liveProfileCount', 'Active Profiles'], ['activeCardCount', 'Assigned Cards']] as const,
  },
  business: genericConfig,
  hospitality: hospitalityConfig,
  other: genericConfig,
} as const

export function moduleConfig(key?: string) {
  return organizationModuleConfig[key as OrganizationModuleKey] || organizationModuleConfig.generic
}

export function dashboardMetrics(key?: string) {
  return moduleConfig(key).dashboardMetrics
}

export function workspaceMemberNavigation(key?: string) {
  if (key === 'education') {
    return [
      { label: 'Members', query: '' }, { label: 'Students', query: '?category=student' },
      { label: 'Teachers', query: '?category=teacher' }, { label: 'Staff / Administration', query: '?category=staff' },
    ]
  }
  if (key === 'club') {
    return [
      { label: 'Members', query: '' }, { label: 'Executive / Board', query: '?group=executive' },
      { label: 'Committee', query: '?group=committee' }, { label: 'General Members', query: '?group=general' },
    ]
  }
  return [{ label: 'Members', query: '' }]
}
