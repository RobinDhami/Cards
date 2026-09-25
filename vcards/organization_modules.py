"""Central module definitions for the shared organization workspace."""

import re


IMPORT_COLUMN_LABELS = {
    'name': 'Full Name', 'email': 'Email', 'phone': 'Phone', 'member_type': 'Member Type',
    'academic_level': 'Class/Grade', 'section': 'Section', 'roll_number': 'Roll Number',
    'academic_year': 'Academic Year', 'faculty_program': 'Faculty/Program',
    'department': 'Department', 'role': 'Designation', 'identifier': 'Student/Employee ID',
    'membership_id': 'Membership ID', 'committee': 'Committee', 'membership_term': 'Membership Term',
    'join_date': 'Join Date',
}

IMPORT_HEADER_ALIASES = {
    'full name': 'name', 'full_name': 'name', 'name': 'name', 'email address': 'email', 'email': 'email',
    'phone': 'phone', 'contact': 'phone', 'mobile': 'phone', 'member type': 'member_type',
    'member category': 'member_type', 'category': 'member_type', 'class grade': 'academic_level',
    'class/grade': 'academic_level', 'class': 'academic_level', 'academic level': 'academic_level', 'section': 'section',
    'roll number': 'roll_number', 'roll/employee number': 'roll_number', 'academic year': 'academic_year',
    'faculty/program': 'faculty_program', 'faculty program': 'faculty_program', 'program': 'faculty_program',
    'department': 'department', 'designation': 'role', 'role/designation': 'role', 'role': 'role',
    'student/employee id': 'identifier', 'student id': 'student_id', 'employee id': 'employee_id',
    'identifier': 'identifier', 'membership id': 'membership_id', 'committee': 'committee',
    'membership term': 'membership_term', 'join date': 'join_date', 'username': 'username',
}


def normalize_import_column(value):
    key = re.sub(r'\s+', ' ', str(value or '').strip().lower())
    return IMPORT_HEADER_ALIASES.get(key, key.replace(' ', '_'))

GENERIC_MODULE = {
    'key': 'generic', 'member_types': ('student', 'teacher', 'other'),
    'member_labels': {'student': 'Students', 'teacher': 'Teachers & Staff', 'other': 'Other Members'},
    'bulk_columns': ('name', 'phone', 'email', 'member_type', 'role', 'roll_number', 'academic_level', 'section'),
}

ORGANIZATION_MODULES = {
    'education': {
        'key': 'education', 'member_types': ('student', 'teacher', 'staff', 'other'),
        'member_labels': {'student': 'Students', 'teacher': 'Teachers', 'staff': 'Staff / Administration', 'other': 'Other Members'},
        'bulk_columns': ('name', 'email', 'phone', 'member_type', 'academic_level', 'section', 'roll_number', 'academic_year', 'faculty_program', 'department', 'role', 'identifier'),
    },
    'club': {
        # A club has one member category. General versus executive is determined
        # by the flexible role/position field, not by a second member type.
        'key': 'club', 'member_types': ('member',),
        'member_labels': {'member': 'Members'},
        'filters': ('executive', 'committee', 'general'),
        'bulk_columns': ('name', 'email', 'phone', 'role', 'membership_id', 'committee', 'membership_term', 'join_date'),
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
