import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.mjs'
import Camera from 'lucide-react/dist/esm/icons/camera.mjs'
import Code2 from 'lucide-react/dist/esm/icons/code-2.mjs'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.mjs'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.mjs'
import Music2 from 'lucide-react/dist/esm/icons/music-2.mjs'
import Play from 'lucide-react/dist/esm/icons/play.mjs'
import Send from 'lucide-react/dist/esm/icons/send.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import type { ComponentType, SVGProps } from 'react'
import { backendHref } from '../../lib/api'
import { ProfileSection } from './ProfileSection'
import type { PublicStudent } from './types'

type SocialIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const socialIcons: Record<string, SocialIcon> = {
  facebook: Users,
  instagram: Camera,
  linkedin: BriefcaseBusiness,
  messenger: MessageCircle,
  twitter: Send,
  youtube: Play,
  tiktok: Music2,
  github: Code2,
  figma: Code2,
  upwork: BriefcaseBusiness,
  website: Globe2,
}

export function SocialLinks({ socials }: { socials: PublicStudent['socials'] }) {
  if (socials.length === 0) return null

  return (
    <ProfileSection className="digital-card-socials" title="Find me online">
      <div className="digital-card-socials__row">
        {socials.map((social) => {
          const Icon = socialIcons[social.key] ?? Globe2
          return (
            <a
              href={backendHref(social.url)}
              key={`${social.key}-${social.url}`}
              target="_blank"
              rel="noreferrer"
              title={social.label}
            >
              <span><Icon size={19} aria-hidden="true" /></span>
              <small>{social.label}</small>
            </a>
          )
        })}
      </div>
    </ProfileSection>
  )
}
