import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import CircleSlash2 from 'lucide-react/dist/esm/icons/circle-slash-2.js'
import Coffee from 'lucide-react/dist/esm/icons/coffee.js'
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell.js'
import Facebook from 'lucide-react/dist/esm/icons/facebook.js'
import Gift from 'lucide-react/dist/esm/icons/gift.js'
import Instagram from 'lucide-react/dist/esm/icons/instagram.js'
import Linkedin from 'lucide-react/dist/esm/icons/linkedin.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import Menu from 'lucide-react/dist/esm/icons/menu.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import UsersRound from 'lucide-react/dist/esm/icons/users-round.js'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError } from '../../lib/api'
import brandSymbol from '../../../../theme/static/branding/tap2connect-symbol.png'
import brandLogo from '../../../../theme/static/branding/tap2connect-logo-optimized.webp'
import heroPerson from '../../../../theme/static/home/hero-person-phone-card-transparent.webp'
import workflowAsset from '../../../../theme/static/home/figma-assets/workflow-phone-card-cropped.webp'
import audienceStudent from '../../../../theme/static/home/figma-assets/audience-student-mobile.webp'
import audienceProfessional from '../../../../theme/static/home/figma-assets/audience-professional-mobile.webp'
import audienceCollege from '../../../../theme/static/home/figma-assets/audience-college-mobile.webp'
import audienceOrganization from '../../../../theme/static/home/figma-assets/audience-business-mobile.webp'
import previewPlastic from '../../../../theme/static/home/figma-assets/cr80-plastic-transparent.webp'
import previewMetal from '../../../../theme/static/home/figma-assets/cr80-metal-transparent.webp'
import previewWood from '../../../../theme/static/home/figma-assets/cr80-wood-transparent.webp'
import previewCustom from '../../../../theme/static/home/figma-assets/cr80-custom-transparent.webp'
import cafeContactArtwork from '../../../../theme/static/home/figma-assets/contact-cafe-landscape.webp'
import cafeContactPortrait from '../../../../theme/static/home/figma-assets/contact-cafe-portrait.webp'
import generalContactArtwork from '../../../../theme/static/home/figma-assets/contact-premium-cards-ivory.webp'
import './HomePageFigma.css'

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#cards' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
]

const steps = [
  ['Create profile', 'Add your details, socials and what you want to share.'],
  ['Choose card', 'Pick your card style. Minimal, premium and uniquely yours.'],
  ['Tap or scan', 'Tap NFC or share QR. Instant connection every time.'],
  ['Update anytime', 'Your card stays the same while your information stays fresh.'],
]

const audiences = [
  ['Students', audienceStudent],
  ['Professionals', audienceCollege],
  ['Schools & Colleges', audienceProfessional],
  ['Organizations', audienceOrganization],
]

const products = [
  ['Plastic Card', 'Lightweight. Durable. Everyday ready.', previewPlastic],
  ['Metal Card', 'Premium weight. Brushed to impress.', previewMetal],
  ['Wood Card', 'Naturally unique. Warm by design.', previewWood],
  ['Custom NFC Card', 'Your look. Your brand. Your impact.', previewCustom],
]

const studioCards = {
  plastic: previewPlastic,
  metal: previewMetal,
  wood: previewWood,
  custom: previewCustom,
}

function BrandLogo() {
  return (
    <span className="fig-brand">
      <img className="fig-brand__image" src={brandLogo} alt="" decoding="async" />
      <span className="fig-brand__wordmark">
        <strong><span>TAP</span><span className="fig-brand__two">2</span><span>CONNECT</span></strong>
        <small>Nepal</small>
      </span>
    </span>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fig-header">
      <div className="fig-header__inner">
        <a href="#home" aria-label="Tap2Connect Nepal home"><BrandLogo /></a>
        <button
          className="fig-menu-button"
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-controls="fig-navigation"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={`fig-nav${menuOpen ? ' is-open' : ''}`} id="fig-navigation" aria-label="Main navigation">
          {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          <a className="fig-signin" href="/login/" onClick={() => setMenuOpen(false)}>Log in</a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="fig-hero" id="home">
      <div className="fig-shell fig-hero__layout">
        <div className="fig-hero__copy">
          <h1><span>One tap.</span><span>Endless</span><span>connections.</span></h1>
          <p>Share your contact details, social links and business profile with a single tap.</p>
          <div className="fig-actions">
            <a className="fig-button fig-button--primary" href="#design-yours">Get Your Card <ArrowRight /></a>
            <a className="fig-button fig-button--outline" href="#how-it-works"><span className="fig-play">▶</span> See How It Works</a>
          </div>
          <div className="fig-hero-benefits" aria-label="Tap2Connect benefits">
            <span><CircleSlash2 /> No app needed</span>
            <span><Settings /> Easy to update</span>
            <span><ShieldCheck /> Made for your brand</span>
          </div>
        </div>
        <div className="fig-hero__media" aria-hidden="true">
          <div className="fig-hero-person">
            <img className="fig-hero-person__photo" src={heroPerson} alt="" decoding="async" fetchPriority="high" />
            <img className="fig-hero-person__card-logo" src={brandSymbol} alt="" decoding="async" />
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="fig-how" id="how-it-works" aria-labelledby="how-title">
      <div className="fig-shell">
        <p className="fig-eyebrow fig-how__eyebrow">How it works</p>
        <div className="fig-how__top">
          <div>
            <h2 id="how-title">One tap.<br />All of you<span>.</span></h2>
            <p className="fig-how__lead">Tap2Connect Nepal makes sharing who you are simple, secure and always up to date.<br />Four steps. Endless connections.</p>
          </div>
          <img src={workflowAsset} alt="A Tap2Connect card beside a digital profile" loading="lazy" decoding="async" />
        </div>
        <div className="fig-steps">
          {steps.map(([title, description], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="fig-how__actions">
          <a className="fig-button fig-button--primary fig-button--small" href="#design-yours">Get your card <ArrowRight /></a>
          <a className="fig-text-link" href="#cards">Explore cards <ArrowRight /></a>
        </div>
      </div>
    </section>
  )
}

function Audience() {
  return (
    <section className="fig-audience" aria-labelledby="audience-title">
      <div className="fig-shell">
        <div className="fig-audience__intro">
          <div><p className="fig-eyebrow">Made for every path</p><h2 id="audience-title">Built for<br />every identity<span>.</span></h2></div>
          <p>Different paths. Same connection.<br />Tap2Connect fits every role and every story you want to share.</p>
        </div>
        <div className="fig-audience__cards">
          {audiences.map(([label, src]) => (
            <a href="#contact" className="fig-audience-card" key={label}>
              <img src={src} alt={`${label} using a Tap2Connect card`} loading="lazy" decoding="async" />
              <span>{label} <ArrowRight /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

const benefits = [
  ['Always current', 'Update details without replacing the physical card.', RefreshCw],
  ['Made for you', 'Customize your profile, card material and visual identity.', Sparkles],
  ['Useful insight', 'Track visits, taps and engagement with privacy-first analytics.', BarChart3],
  ['Share safely', 'Control which information is public and what visitors can save.', ShieldCheck],
]

function Trust() {
  return (
    <section className="fig-trust" aria-labelledby="trust-title">
      <div className="fig-shell">
        <div className="fig-trust__intro">
          <div><p className="fig-eyebrow">Trusted by design</p><h2 id="trust-title">Built for real-world<br />connection<span>.</span></h2></div>
          <p>Tap2Connect Nepal helps you share what matters—instantly and reliably. Every detail is designed to earn trust and deliver value every time a card is tapped.</p>
        </div>
        <div className="fig-benefits">
          {benefits.map(([title, description, Icon], index) => {
            const BenefitIcon = Icon as typeof RefreshCw
            return <article key={title as string}><span>{String(index + 1).padStart(2, '0')}</span><BenefitIcon /><h3>{title as string}</h3><p>{description as string}</p></article>
          })}
        </div>
      </div>
    </section>
  )
}

function Products() {
  const [activeProduct, setActiveProduct] = useState(0)
  const [name, description, src] = products[activeProduct]
  const changeProduct = (direction: -1 | 1) => {
    setActiveProduct((current) => (current + direction + products.length) % products.length)
  }
  return (
    <section className="fig-products" id="cards" aria-labelledby="products-title">
      <div className="fig-shell">
        <div className="fig-products__top"><strong>Tap2Connect Nepal</strong><a href="#design-yours">View all products <ArrowRight /></a></div>
        <h2 id="products-title">Choose your card type</h2><p className="fig-products__subhead">A card for every first impression.</p>
        <div className="fig-card-carousel" aria-roledescription="carousel" aria-label="Choose your Tap2Connect card">
          <button className="fig-carousel-arrow fig-carousel-arrow--previous" type="button" onClick={() => changeProduct(-1)} aria-label="Show previous card"><ChevronLeft /></button>
          <div className="fig-card-carousel__stage">
            <img key={src} src={src} alt={`${name} Tap2Connect card`} loading="lazy" decoding="async" />
          </div>
          <div className="fig-card-carousel__copy">
            <h3>{name}</h3>
            <p>{description}</p>
            <a href="#design-yours">View details <ArrowRight /></a>
          </div>
          <button className="fig-carousel-arrow fig-carousel-arrow--next" type="button" onClick={() => changeProduct(1)} aria-label="Show next card"><ChevronRight /></button>
        </div>
      </div>
    </section>
  )
}

function Studio() {
  const [material, setMaterial] = useState<keyof typeof studioCards>('plastic')
  const [finish, setFinish] = useState('Matte')
  const [accent, setAccent] = useState('#3e57ff')
  const [name, setName] = useState('Tap2Connect Nepal')
  const materialOptions = ['plastic', 'metal', 'wood', 'custom'] as const
  return (
    <section className="fig-studio" id="design-yours" aria-labelledby="studio-title">
      <div className="fig-shell fig-studio__layout">
        <div className="fig-studio__controls">
          <p className="fig-eyebrow">Design yours</p><h2 id="studio-title">Make it yours.<br />Tap to stand out.</h2>
          <p className="fig-studio__lead">Customize every detail and see it come to life in real time.</p>
          <fieldset><legend>Material</legend><div className="fig-materials">{materialOptions.map((item) => <button className={`${item}${material === item ? ' is-selected' : ''}`} type="button" key={item} aria-pressed={material === item} onClick={() => setMaterial(item)}><i /><span>{item}</span></button>)}</div></fieldset>
          <fieldset><legend>Finish</legend><div className="fig-finishes">{['Matte', 'Brushed', 'Gloss'].map((item) => <button className={finish === item ? 'is-selected' : ''} type="button" key={item} aria-pressed={finish === item} onClick={() => setFinish(item)}>{item}</button>)}</div></fieldset>
          <fieldset><legend>Accent</legend><div className="fig-accents">{['#3e57ff', '#63ddca', '#ffbd45', '#aeb4be'].map((color) => <button type="button" key={color} aria-label={`Set accent to ${color}`} aria-pressed={accent === color} onClick={() => setAccent(color)} className={accent === color ? 'is-selected' : ''} style={{ backgroundColor: color }} />)}</div></fieldset>
          <label className="fig-name-field">Name on card <span><input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} /><small>{name.length} / 20</small></span></label>
          <a className="fig-button fig-button--primary fig-studio__button" href="/card-editor/">Continue to Advanced Editor <ArrowRight /></a>
        </div>
        <div className={`fig-studio__preview fig-studio__preview--${finish.toLowerCase()}`} style={{ '--card-accent': accent } as CSSProperties}>
          <img src={studioCards[material]} alt={`${material} ${finish.toLowerCase()} card preview`} loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  )
}

const enquiryOptions = [
  { id: 'personal', label: 'Personal card', Icon: UserRound },
  { id: 'cafe', label: 'Café & restaurant', Icon: Coffee },
  { id: 'club', label: 'Club or organisation', Icon: UsersRound },
  { id: 'gym', label: 'Gym', Icon: Dumbbell },
  { id: 'loyalty', label: 'Loyalty', Icon: Gift },
] as const

function Contact() {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [enquiry, setEnquiry] = useState<(typeof enquiryOptions)[number]['id']>('cafe')
  const activeOption = enquiryOptions.find((option) => option.id === enquiry) ?? enquiryOptions[1]
  const organizationLabel = enquiry === 'personal' ? 'Name on card' : enquiry === 'club' ? 'Organisation name' : enquiry === 'loyalty' ? 'Business or programme name' : 'Business name'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const body = new FormData(form)
    body.set('contactType', activeOption.label)
    body.set('hearAbout', 'Website')
    setState('submitting')
    setMessage('')
    try {
      const response = await apiFetch<{ message?: string }>('/send-message/', { method: 'POST', body })
      form.reset(); setState('success'); setMessage(response.message || 'Thank you. Your inquiry has been sent.')
    } catch (error) { setState('error'); setMessage(displayError(error)) }
  }

  return (
    <section className="fig-contact" id="contact" aria-labelledby="contact-title">
      <div className="fig-shell fig-contact__shell">
        <header className="fig-contact__intro">
          <p className="fig-eyebrow">Let&apos;s build your connection</p>
          <h2 id="contact-title">Tell us what you want<br />to connect.</h2>
          <p>Choose an experience and share a few details. We&apos;ll help you find the right Tap2Connect setup.</p>
        </header>
        <div className="fig-contact__options" role="group" aria-label="Choose an experience">
          {enquiryOptions.map(({ id, label, Icon }) => <button className={enquiry === id ? 'is-active' : ''} type="button" key={id} onClick={() => setEnquiry(id)} aria-pressed={enquiry === id}><Icon />{label}</button>)}
        </div>
        <div className="fig-contact__layout">
          <form className="fig-contact__form" onSubmit={submit}>
            <input type="hidden" name="email" value="" />
            <div className="fig-contact__fields">
              <label><span>Your full name <b>*</b></span><input required name="fullName" placeholder="e.g. Aayush Thapa" autoComplete="name" /></label>
              <label><span>Phone / WhatsApp <b>*</b></span><input required type="tel" name="phone" placeholder="e.g. 98XXXXXXXX" autoComplete="tel" /></label>
              <label className="is-wide"><span>{organizationLabel} <b>*</b></span><input required name="organization" placeholder={enquiry === 'cafe' ? 'e.g. Himalayan Coffee House' : 'Enter a name'} autoComplete="organization" /></label>
              <label className="is-wide"><span>Message <b>*</b></span><textarea required name="message" placeholder={enquiry === 'cafe' ? 'Tell us about your café, menu or customer experience…' : 'Tell us what you would like to create…'} rows={3} /></label>
            </div>
            <label className="fig-contact__consent"><input required type="checkbox" name="contactConsent" /><span>I agree to be contacted about this enquiry. <b>*</b></span></label>
            <div className="fig-contact__actions"><button className="fig-contact__submit" type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? 'Sending…' : 'Send enquiry'} <ArrowRight /></button><a className="fig-contact__whatsapp" href="https://wa.me/?text=Hello%20Tap2Connect%2C%20I%27d%20like%20to%20talk%20about%20a%20digital%20profile." target="_blank" rel="noreferrer"><MessageCircle />Chat on WhatsApp</a></div>
            <p className="fig-contact__email">Prefer email? <a href="mailto:hello@tap2connect.com.np">hello@tap2connect.com.np</a></p>
            {message ? <p className={`fig-contact__message is-${state}`} role="status">{state === 'success' && <CheckCircle2 />} {message}</p> : null}
          </form>
          <aside className="fig-contact__experience">
            <div className="fig-contact__experience-copy"><i /><h3>{enquiry === 'cafe' ? 'A better table experience starts here.' : `A better ${activeOption.label.toLowerCase()} experience starts here.`}</h3><p>{enquiry === 'cafe' ? 'Let customers view your menu, leave reviews and share feedback — all with a simple tap.' : 'Tell us what you need and we’ll recommend a setup that fits.'}</p></div>
            <picture className="fig-contact__experience-art">
              {enquiry === 'cafe' ? <source media="(max-width: 700px)" srcSet={cafeContactPortrait} /> : null}
              <img src={enquiry === 'cafe' ? cafeContactArtwork : generalContactArtwork} alt={enquiry === 'cafe' ? 'NFC table card and café menu on a phone' : 'Tap2Connect card designs'} loading="lazy" decoding="async" />
            </picture>
            {enquiry === 'cafe' ? <div className="fig-contact__tags"><span>Digital menu</span><span>Google reviews</span><span>Customer feedback</span></div> : null}
            <a href="mailto:hello@tap2connect.com.np" className="fig-contact__help"><MessageCircle /><span><strong>Not sure what you need?</strong><small>Share your idea—we&apos;ll recommend a setup.</small></span><ArrowRight /></a>
          </aside>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="fig-footer">
      <div className="fig-shell fig-footer__grid">
        <div className="fig-footer__brand">
          <a className="fig-footer__wordmark" href="#home" aria-label="Tap2Connect Nepal home"><strong>Tap2Connect</strong><small>Nepal</small></a>
          <p>Redefining networking in Nepal. One tap is all it takes to share your digital identity securely and instantly.</p>
          <div className="fig-footer__socials"><a href="#contact" aria-label="Facebook"><Facebook /></a><a href="#contact" aria-label="Instagram"><Instagram /></a><a href="#contact" aria-label="LinkedIn"><Linkedin /></a></div>
        </div>
        <div><strong>Company</strong><a href="#home">About Us</a><a href="#contact">Careers</a><a href="#contact">Blog</a><a href="#contact">Partners</a></div>
        <div><strong>Products</strong><a href="#cards">NFC Cards</a><a href="#cards">NFC Tags</a><a href="#design-yours">Custom Design</a><a href="#contact">For Teams</a></div>
        <div><strong>Support</strong><a href="#faq">FAQ</a><a href="#contact">Shipping</a><a href="#contact">Contact</a><a href="#faq">Help Center</a></div>
        <div className="fig-footer__contact"><strong>Contact Us</strong><p><MapPin /> Putalisadak, Kathmandu 44600, Nepal</p><p><Phone /> +977 1424XXXX<br />+977 98XXXXXXXX</p><a href="mailto:hello@tap2connect.com.np"><Mail /> hello@tap2connect.com.np</a></div>
      </div>
      <div className="fig-shell fig-footer__base"><span>© 2024 Tap2Connect Nepal. All rights reserved.</span><span>Privacy Policy</span><span>Terms of Service</span><span>Cookie Settings</span><strong>Made with pride in Nepal</strong></div>
    </footer>
  )
}

export function HomePage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])
  return <div className="fig-home"><Header /><main><Hero /><HowItWorks /><Audience /><Trust /><Products /><Studio /><Contact /><section className="fig-faq-placeholder" id="faq" aria-label="Frequently asked questions" /></main><Footer /></div>
}
