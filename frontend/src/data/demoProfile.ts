import {
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Code2,
  Globe2,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Users,
  Video,
} from 'lucide-react'
import type { ProfessionalProfile } from '../types'

export const demoProfile: ProfessionalProfile = {
  fullName: 'Robin Dhami',
  role: 'CEO',
  organization: 'Vedanga International School',
  organizationTagline: 'Learning today, leading tomorrow',
  location: 'Kathmandu-14, Rabibhawan',
  verified: true,
  accentColor: '#224f91',
  about:
    'A trusted education organization focused on learning, admissions support, parent communication, and student growth.',
  businessHours: 'Sunday to Friday, 9:00 AM - 5:00 PM',
  officeAddress: 'Kathmandu-14, Rabibhawan, Nepal',
  website: 'https://vedanga.edu.np',
  contactActions: [
    { label: 'Call', href: 'tel:+9779800000000', icon: Phone, tone: 'call' },
    {
      label: 'WhatsApp',
      href: 'https://wa.me/9779800000000',
      icon: MessageCircle,
      tone: 'whatsapp',
    },
    { label: 'Email', href: 'mailto:info@vedanga.edu.np', icon: Mail, tone: 'email' },
    { label: 'Map', href: 'https://maps.google.com', icon: MapPin, tone: 'map' },
  ],
  socialLinks: [
    { label: 'LinkedIn', href: '#', icon: Users, tone: 'linkedin' },
    { label: 'Facebook', href: '#', icon: Link2, tone: 'facebook' },
    { label: 'Instagram', href: '#', icon: Camera, tone: 'instagram' },
    { label: 'YouTube', href: '#', icon: Video, tone: 'youtube' },
    { label: 'GitHub', href: '#', icon: Code2, tone: 'github' },
  ],
  services: [
    {
      title: 'Admissions Guidance',
      description: 'Clear support for admission inquiries, visits, forms, and enrollment steps.',
      icon: BookOpen,
    },
    {
      title: 'School Programs',
      description: 'Academic programs, activities, and student development information in one place.',
      icon: BriefcaseBusiness,
    },
    {
      title: 'Campus Updates',
      description: 'A quick route for parents and visitors to discover events, notices, and media.',
      icon: Camera,
    },
    {
      title: 'Online Presence',
      description: 'Website and social media links designed to help the organization grow online.',
      icon: Globe2,
    },
  ],
}
