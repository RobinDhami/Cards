export type OrganizationModuleKey = 'education' | 'club' | 'business' | 'other' | 'generic'

const genericConfig = {
  title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers & Staff' }, { value: 'other', label: 'Other Members' }],
  bulkHint: 'Optional columns include email, username, role, roll_number, academic_level, section, address, emergency contact, blood group, and gender.',
} as const

export const organizationModuleConfig = {
  generic: {
    title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers & Staff' }, { value: 'other', label: 'Other Members' }],
    bulkHint: 'Optional columns include email, username, role, roll_number, academic_level, section, address, emergency contact, blood group, and gender.',
  },
  education: {
    title: 'Members', memberTypes: [{ value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers' }, { value: 'staff', label: 'Staff / Administration' }, { value: 'other', label: 'Other Members' }],
    bulkHint: 'Optional education columns include role, academic_year, faculty_program, academic_level, section, roll_number, and department.',
  },
  club: {
    title: 'Members', memberTypes: [{ value: 'member', label: 'General Members' }, { value: 'other', label: 'Other Members' }],
    filters: [{ value: 'executive', label: 'Executive / Board' }, { value: 'committee', label: 'Committee' }, { value: 'general', label: 'General Members' }],
    bulkHint: 'Optional club columns include membership_id, role, committee, membership_term, and join_date (YYYY-MM-DD).',
  },
  business: genericConfig,
  other: genericConfig,
} as const

export function moduleConfig(key?: string) {
  return organizationModuleConfig[key as OrganizationModuleKey] || organizationModuleConfig.generic
}
