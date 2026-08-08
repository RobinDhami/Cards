import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.mjs'
import Building2 from 'lucide-react/dist/esm/icons/building-2.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ContactRound from 'lucide-react/dist/esm/icons/contact-round.mjs'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import Menu from 'lucide-react/dist/esm/icons/menu.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.mjs'
import ScanLine from 'lucide-react/dist/esm/icons/scan-line.mjs'
import School from 'lucide-react/dist/esm/icons/school.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import UserRound from 'lucide-react/dist/esm/icons/user-round.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import '../../../../theme/static/css/homepage.css'
import { CardDesignStudio } from './CardDesignStudio'
import { ContactSection } from './ContactSection'
import { FaqSection } from './FaqSection'

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Cards', href: '#cards' },
  { label: 'Design yours', href: '#card-studio' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

const audiences = [
  {
    title: 'Students',
    description: 'Share projects, achievements, and a profile that grows with you.',
    image: '/static/audience/student.svg',
    icon: GraduationCap,
  },
  {
    title: 'Teachers',
    description: 'Keep credentials, expertise, and classroom connections in one place.',
    image: '/static/audience/teacher.svg',
    icon: UserRound,
  },
  {
    title: 'Schools & Colleges',
    description: 'Issue consistent smart identities across your institution.',
    image: '/static/audience/school.svg',
    icon: School,
  },
  {
    title: 'Professionals',
    description: 'Turn every meeting into a useful, lasting connection.',
    image: '/static/audience/professional.svg',
    icon: ContactRound,
  },
  {
    title: 'Businesses',
    description: 'Give teams, products, and client touchpoints one polished presence.',
    image: '/static/audience/business.svg',
    icon: Building2,
  },
]

const steps: Array<{
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}> = [
  {
    title: 'Create your profile',
    description: 'Add the details, links, work, documents, or identity information you want to share.',
    icon: ContactRound,
  },
  {
    title: 'Choose your card or QR',
    description: 'Pick a physical NFC card, a digital profile, or a QR-first experience.',
    icon: QrCode,
  },
  {
    title: 'Tap, scan, and connect',
    description: 'Open your identity instantly on a modern phone—no app required.',
    icon: ScanLine,
  },
  {
    title: 'Update anytime',
    description: 'Change your details once and keep every shared connection current.',
    icon: RefreshCw,
  },
]

const advantages = [
  {
    title: 'A profile that stays current',
    description: 'Update your phone, CV, portfolio, catalog, or offers without reprinting the card.',
    icon: RefreshCw,
  },
  {
    title: 'Designed around your identity',
    description: 'Use your colors, logo, imagery, links, and content—on the front and the back.',
    icon: Sparkles,
  },
  {
    title: 'Useful engagement insight',
    description: 'Understand profile views and actions so networking becomes more intentional.',
    icon: BarChart3,
  },
  {
    title: 'Share only what you choose',
    description: 'Keep control over the identity, links, and information people can access.',
    icon: ShieldCheck,
  },
]

function BrandLogo() {
  return (
    <span className="home-brand-mark">
      <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect Nepal" />
      <span>
        <strong>Tap2Connect</strong>
        <small>Nepal</small>
      </span>
    </span>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className={`home-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="home-container home-header-inner">
        <a className="home-logo" href="#home" aria-label="Tap2Connect Nepal home">
          <BrandLogo />
        </a>

        <button
          className="home-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="home-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav className={`home-navigation${menuOpen ? ' is-open' : ''}`} id="home-navigation" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a href={item.href} onClick={() => setMenuOpen(false)} key={item.href}>
              {item.label}
            </a>
          ))}
          <a className="home-nav-action" href="/login/" onClick={() => setMenuOpen(false)}>
            Sign in
            <ArrowRight size={15} />
          </a>
        </nav>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section className="home-hero" id="home">
      <div className="home-container home-hero-grid">
        <div className="home-hero-copy">
          <h1>
            <span>Tap.</span>
            <span>Share.</span>
            <span>Connect.</span>
          </h1>
          <p>
            One smart identity for your contacts, profiles, portfolios, school IDs, products, and links—shared instantly with a tap.
          </p>
          <div className="home-hero-actions">
            <a className="home-button home-button-primary" href="#card-studio">
              Create your card
              <ArrowRight size={18} />
            </a>
            <a className="home-button home-button-secondary" href="#how-it-works">
              See how it works
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="home-hero-note" aria-label="Tap2Connect benefits">
            <span><Check size={15} />No app required</span>
            <span><Check size={15} />QR fallback included</span>
            <span><Check size={15} />Update anytime</span>
          </div>
        </div>

        <div className="home-hero-media" aria-label="Tap2Connect card and digital profile preview">
          <span className="home-tap-ripple" aria-hidden="true" />
          <div className="home-profile-device">
            <div className="home-profile-device-bar" aria-hidden="true" />
            <img src="/static/hero/professional-profile-preview.webp" alt="Tap2Connect digital profile on a phone" />
          </div>
          <img className="home-hero-card" src="/static/products/plastic-nfc-card.png" alt="Tap2Connect physical NFC card, front and back" />
        </div>
      </div>
    </section>
  )
}

function AudienceSection() {
  return (
    <section className="home-audience home-section" aria-labelledby="audience-title">
      <div className="home-container">
        <div className="home-section-heading home-section-heading-split">
          <div>
            <span className="home-section-rule" aria-hidden="true" />
            <h2 id="audience-title">Who is it for?</h2>
          </div>
          <p>Built for every learner, educator, professional, and organization ready to connect smarter.</p>
        </div>

        <div className="home-audience-rail">
          {audiences.map((audience) => {
            const Icon = audience.icon
            return (
              <article className="home-audience-item" key={audience.title}>
                <div className="home-audience-visual">
                  <img src={audience.image} alt="" loading="lazy" />
                  <span aria-hidden="true"><Icon size={18} /></span>
                </div>
                <h3>{audience.title}</h3>
                <p>{audience.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="home-steps home-section" id="how-it-works" aria-labelledby="steps-title">
      <div className="home-container">
        <div className="home-section-heading">
          <span className="home-section-rule" aria-hidden="true" />
          <h2 id="steps-title">From idea to shareable identity in four simple steps.</h2>
        </div>

        <div className="home-step-flow">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <article className="home-step" key={step.title}>
                <div className="home-step-number">{index + 1}</div>
                <div className="home-step-icon" aria-hidden="true"><Icon size={27} strokeWidth={1.65} /></div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function AdvantagesSection() {
  return (
    <section className="home-advantages home-section" aria-labelledby="advantages-title">
      <div className="home-container home-advantages-grid">
        <div className="home-advantages-intro">
          <span className="home-section-rule" aria-hidden="true" />
          <h2 id="advantages-title">Premium digital identity built for real-world networking.</h2>
          <p>Beautiful enough for the first impression. Practical enough for everything that comes after it.</p>
          <a href="#card-studio">Design your identity <ArrowRight size={17} /></a>
        </div>

        <div className="home-advantage-list">
          {advantages.map((advantage) => {
            const Icon = advantage.icon
            return (
              <article key={advantage.title}>
                <span aria-hidden="true"><Icon size={21} strokeWidth={1.7} /></span>
                <div>
                  <h3>{advantage.title}</h3>
                  <p>{advantage.description}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CardCollectionSection() {
  return (
    <section className="home-collection home-section" id="cards" aria-labelledby="collection-title">
      <div className="home-container">
        <div className="home-collection-frame">
          <img src="/static/collection/card-collection-latest.webp" alt="Tap2Connect card collection in plastic, metal, wood, and custom finishes" loading="lazy" />
          <div className="home-collection-copy">
            <span className="home-section-rule" aria-hidden="true" />
            <h2 id="collection-title">A card for every first impression.</h2>
            <p>Choose plastic, metal, wood, or a custom finish—then make both sides unmistakably yours.</p>
            <a className="home-button home-button-primary" href="#card-studio">
              Explore the collection
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container home-footer-grid">
        <div className="home-footer-brand">
          <a href="#home" aria-label="Tap2Connect Nepal home"><BrandLogo /></a>
          <p>Smart identities and NFC cards made for meaningful connections.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <a href="#how-it-works">How it works</a>
          <a href="#cards">Card collection</a>
          <a href="#card-studio">Design yours</a>
        </div>
        <div>
          <strong>Support</strong>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
          <a href="mailto:hello@tap2connectnepal.com">Email us</a>
        </div>
        <div>
          <strong>Account</strong>
          <a href="/login/">Sign in</a>
          <a href="/dashboard/">Dashboard</a>
          <a href="/card-editor/">Card editor</a>
        </div>
      </div>
      <div className="home-container home-footer-base">
        <span>© {new Date().getFullYear()} Tap2Connect Nepal. All rights reserved.</span>
        <span>Tap. Share. Connect.</span>
      </div>
    </footer>
  )
}

export function HomePage() {
  return (
    <div className="home-page">
      <SiteHeader />
      <main>
        <HeroSection />
        <AudienceSection />
        <HowItWorksSection />
        <AdvantagesSection />
        <CardCollectionSection />
        <CardDesignStudio />
        <FaqSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  )
}
