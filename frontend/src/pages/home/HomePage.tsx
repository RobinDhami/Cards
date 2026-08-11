import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.mjs'
import ContactRound from 'lucide-react/dist/esm/icons/contact-round.mjs'
import Menu from 'lucide-react/dist/esm/icons/menu.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.mjs'
import ScanLine from 'lucide-react/dist/esm/icons/scan-line.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import '../../../../theme/static/css/homepage.css'
import { CardDesignStudio } from './CardDesignStudio'
import { ContactSection } from './ContactSection'
import { FaqSection } from './FaqSection'
import './HomePageV2.css'
import './HomePageExact.css'

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Cards', href: '#cards' },
  { label: 'Design yours', href: '#card-studio' },
  { label: 'FAQ', href: '#faq' },
]

const audiences = ['Students', 'Professionals', 'Schools & Colleges', 'Businesses']

const steps: Array<{
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}> = [
  {
    title: 'Create profile',
    description: 'Add your details, socials and what you want to share. You’re in control.',
    icon: ContactRound,
  },
  {
    title: 'Choose card',
    description: 'Pick your card style. Minimal, premium and uniquely yours.',
    icon: QrCode,
  },
  {
    title: 'Tap or scan',
    description: 'Tap your NFC card or share your QR. Instant connection, every time.',
    icon: ScanLine,
  },
  {
    title: 'Update anytime',
    description: 'Change anything, anytime. Your card stays the same, your info stays fresh.',
    icon: RefreshCw,
  },
]

const advantages = [
  {
    title: 'Always current',
    description: 'Your information stays up to date across every tap—no reprints and no hassle.',
    icon: RefreshCw,
  },
  {
    title: 'Made for you',
    description: 'Customize your profile, links, card material, and visual identity around you or your brand.',
    icon: Sparkles,
  },
  {
    title: 'Useful insight',
    description: 'See what is working with simple, privacy-first analytics that help you grow.',
    icon: BarChart3,
  },
  {
    title: 'Share safely',
    description: 'Stay in control of your data and decide what to share, with whom.',
    icon: ShieldCheck,
  },
]

function BrandLogo() {
  return (
    <span className="home-brand-mark">
      <img src="/static/branding/tap2connect-logo.png" alt="" />
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
    const update = () => setScrolled(window.scrollY > 18)
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
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
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
  const visualRef = useRef<HTMLDivElement>(null)
  const [profileVisible, setProfileVisible] = useState(false)

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    visualRef.current?.style.setProperty('--hero-rotate-x', `${(-y * 3.5).toFixed(2)}deg`)
    visualRef.current?.style.setProperty('--hero-rotate-y', `${(x * 5).toFixed(2)}deg`)
  }

  const resetTilt = () => {
    visualRef.current?.style.setProperty('--hero-rotate-x', '0deg')
    visualRef.current?.style.setProperty('--hero-rotate-y', '0deg')
  }

  return (
    <section className="home-hero" id="home">
      <div className="home-hero-lines" aria-hidden="true" />
      <div className="home-container home-hero-grid">
        <div className="home-hero-copy">
          <h1>
            <span>Tap into</span>
            <span>your next</span>
            <span>connection.</span>
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
        </div>

        <div
          ref={visualRef}
          className="home-hero-visual"
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <button
            type="button"
            className={`home-hero-product${profileVisible ? ' is-profile-visible' : ''}`}
            aria-label={profileVisible ? 'Hide the digital profile preview' : 'Tap the NFC card to reveal the digital profile'}
            aria-pressed={profileVisible}
            onClick={() => setProfileVisible((current) => !current)}
          >
            <img className="home-hero-product-base" src="/static/home/hero-digital-object-v2.png" alt="" />
            <img className="home-hero-product-profile" src="/static/home/hero-digital-object-v2.png" alt="" />
            <span className="home-tap-cue" aria-hidden="true"><ScanLine size={18} /></span>
            <span className="home-tap-label" aria-live="polite">
              {profileVisible ? 'Profile connected' : 'Tap the card to connect'}
            </span>
          </button>
        </div>
      </div>
      <div className="home-container home-hero-bottom">
        <strong>One tap. All of you.</strong>
        <p>Simple, secure, and always up to date.</p>
        <span aria-hidden="true">Designed in Nepal</span>
      </div>
    </section>
  )
}

function AudienceSection() {
  return (
    <section className="home-audience" aria-labelledby="audience-title">
      <div className="home-container">
        <div className="home-audience-heading">
          <div>
            <span>Made for every path</span>
            <h2 id="audience-title">Built for <strong>every identity.</strong></h2>
          </div>
          <p>Different paths. Same connection. Tap2Connect fits every role and every story you want to share.</p>
        </div>
        <div className="home-audience-visual">
          <img src="/static/home/audience-portrait-rail-v2.png" alt="Students, professionals, educators, and business owners holding Tap2Connect cards" loading="lazy" />
          <div className="home-audience-labels" aria-label="Tap2Connect audiences">
            {audiences.map((audience) => (
              <span key={audience}>{audience}<ArrowRight size={24} /></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="home-steps home-section" id="how-it-works" aria-labelledby="steps-title">
      <div className="home-container">
        <div className="home-steps-intro">
          <div className="home-section-heading">
            <span>How it works</span>
            <h2 id="steps-title">One tap.<br />All of you.</h2>
            <p>Tap2Connect Nepal makes sharing who you are simple, secure and always up to date. Four steps. Endless connections.</p>
          </div>
          <div className="home-steps-product">
            <img src="/static/home/workflow-phone-card.png" alt="Tap2Connect card and mobile digital profile" loading="lazy" />
          </div>
        </div>
        <div className="home-step-flow">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <article className="home-step" key={step.title}>
                <div className="home-step-top">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            )
          })}
        </div>
        <div className="home-steps-actions">
          <a className="home-button home-button-primary" href="#card-studio">Get your card <ArrowRight size={16} /></a>
          <a className="home-text-link" href="#cards">See how it works <ArrowRight size={15} /></a>
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
          <div>
            <span>Trusted by design</span>
            <h2 id="advantages-title">Built for real-world connection.</h2>
          </div>
          <p>Every detail is designed to earn trust and deliver value every time a card is tapped.</p>
        </div>
        <div className="home-advantage-list">
          {advantages.map((advantage) => {
            const Icon = advantage.icon
            return (
              <article key={advantage.title}>
                <Icon size={22} strokeWidth={1.55} aria-hidden="true" />
                <div>
                  <h3>{advantage.title}</h3>
                  <p>{advantage.description}</p>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CardCollectionSection() {
  const products = [
    ['Plastic Card', 'Lightweight. Durable.', 'Everyday ready.'],
    ['Metal Card', 'Premium weight.', 'Brushed to impress.'],
    ['Wood Card', 'Naturally unique.', 'Warm by design.'],
    ['Custom NFC Card', 'Your look. Your brand.', 'Your impact.'],
  ]

  return (
    <section className="home-collection home-section" id="cards" aria-labelledby="collection-title">
      <div className="home-container home-collection-grid">
        <div className="home-collection-topline">
          <strong>Tap2Connect Nepal</strong>
          <a href="#card-studio">View all products <ArrowRight size={18} /></a>
        </div>
        <h2 id="collection-title">A card for every<br />first impression.</h2>
        <div className="home-collection-media">
          <img src="/static/home/card-collection-rail.png" alt="Tap2Connect cards in plastic, metal, wood, and custom finishes" loading="lazy" />
        </div>
        <div className="home-collection-products">
          {products.map(([name, lineOne, lineTwo]) => (
            <div key={name}>
              <strong>{name}</strong>
              <span>{lineOne}<br />{lineTwo}</span>
            </div>
          ))}
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
          <a href="#faq">Help center</a>
          <a href="#contact">Contact</a>
          <a href="#cards">Shipping &amp; delivery</a>
          <a href="#faq">Privacy policy</a>
        </div>
        <div>
          <strong>Account</strong>
          <a href="/login/">Sign in</a>
          <a href="/dashboard/">Dashboard</a>
          <a href="/card-editor/">Card editor</a>
        </div>
        <div>
          <strong>Get in touch</strong>
          <a href="mailto:hello@tap2connectnepal.com">hello@tap2connectnepal.com</a>
          <p>We typically reply within one business day.</p>
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
        <HowItWorksSection />
        <AudienceSection />
        <AdvantagesSection />
        <CardCollectionSection />
        <CardDesignStudio />
        <ContactSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </div>
  )
}
