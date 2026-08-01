export type PublicStudent = {
  id: number
  name: string
  email: string
  phone: string
  school: {
    name: string
    website: string
    websiteUrl: string
    phone: string
    address: string
    logo: string
  }
  profilePhoto: string
  coverPhoto: string
  memberType: string
  gradeLabel: string
  section: string
  gradeSection: string
  identifier: string
  identifierLabel: string
  role: string
  organization: string
  address: string
  guardianLabel: string
  guardianName: string
  emergencyPhone: string
  bloodGroup: string
  additionalInfoHeading: string
  additionalInfoDescription: string
  intro: string
  featured: string
  current: string
  skills: string[]
  socials: Array<{ key: string; url: string; label: string }>
  actions: {
    phone: string
    whatsapp: string
    map: string
    website: string
    vcard: string
    qr: string
    edit: string
    birthCertificate: string
  }
  canViewPrivateDetails: boolean
  publicUrl: string
}
