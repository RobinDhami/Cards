"""Central module definitions for the shared organization workspace."""

GENERIC_MODULE = {
    'key': 'generic', 'member_types': ('student', 'teacher', 'other'),
    'member_labels': {'student': 'Students', 'teacher': 'Teachers & Staff', 'other': 'Other Members'},
    'bulk_columns': ('name', 'phone', 'email', 'username', 'role', 'roll_number', 'academic_level', 'section'),
}

ORGANIZATION_MODULES = {
    'education': {
        'key': 'education', 'member_types': ('student', 'teacher', 'staff', 'other'),
        'member_labels': {'student': 'Students', 'teacher': 'Teachers', 'staff': 'Staff / Administration', 'other': 'Other Members'},
        'bulk_columns': ('name', 'phone', 'email', 'username', 'role', 'academic_year', 'faculty_program', 'academic_level', 'section', 'roll_number', 'department'),
    },
    'club': {
        'key': 'club', 'member_types': ('member', 'other'),
        'member_labels': {'member': 'General Members', 'other': 'Other Members'},
        'filters': ('executive', 'committee', 'general'),
        'bulk_columns': ('name', 'phone', 'email', 'username', 'membership_id', 'role', 'committee', 'membership_term', 'join_date'),
    },
    'business': GENERIC_MODULE,
    'other': GENERIC_MODULE,
}


def organization_module(organization):
    return ORGANIZATION_MODULES.get(getattr(organization, 'organization_type', ''), GENERIC_MODULE)


def identifier_label(organization, member):
    module = organization_module(organization)['key']
    if module == 'education':
        return 'Student ID' if member.member_type == 'student' else 'Employee ID'
    if module == 'club':
        return 'Membership ID'
    return 'Member ID'
