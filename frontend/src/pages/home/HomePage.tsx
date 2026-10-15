import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import CircleSlash2 from 'lucide-react/dist/esm/icons/circle-slash-2.js'
import Coffee from 'lucide-react/dist/esm/icons/coffee.js'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import Instagram from 'lucide-react/dist/esm/icons/instagram.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import Menu from 'lucide-react/dist/esm/icons/menu.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import Star from 'lucide-react/dist/esm/icons/star.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import UsersRound from 'lucide-react/dist/esm/icons/users-round.js'
import UtensilsCrossed from 'lucide-react/dist/esm/icons/utensils-crossed.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError } from '../../lib/api'
import brandLogo from '../../../../theme/static/branding/tap2connect-logo-optimized.webp'
import heroPerson from '../../../../theme/static/home/hero-person-phone-card-transparent.webp'
import audienceStudent from '../../../../theme/static/home/figma-assets/audience-student-mobile.webp'
import audienceProfessional from '../../../../theme/static/home/figma-assets/audience-professional-mobile.webp'
import audienceCollege from '../../../../theme/static/home/figma-assets/audience-college-mobile.webp'
import audienceOrganization from '../../../../theme/static/home/figma-assets/audience-business-mobile.webp'
import audienceCafe from '../../../../theme/static/home/figma-assets/audience-cafe-pilot.webp'
import howTapPhoto from '../../../../theme/static/home/figma-assets/how-tap-nfc.webp'
import previewPlastic from '../../../../theme/static/home/figma-assets/cr80-plastic-transparent.webp'
import previewMetal from '../../../../theme/static/home/figma-assets/cr80-metal-transparent.webp'
import previewWood from '../../../../theme/static/home/figma-assets/cr80-wood-transparent.webp'
import previewCustom from '../../../../theme/static/home/figma-assets/cr80-custom-transparent.webp'
import cafeContactArtwork from '../../../../theme/static/home/figma-assets/contact-cafe-landscape.webp'
import cafeContactPortrait from '../../../../theme/static/home/figma-assets/contact-cafe-portrait.webp'
import personalContactArtwork from '../../../../theme/static/home/figma-assets/contact-personal.webp'
import educationContactArtwork from '../../../../theme/static/home/figma-assets/contact-education.webp'
import professionalProfileCover from '../../../../theme/static/home/figma-assets/live-profile-professional-cover.webp'
import clubProfileCover from '../../../../theme/static/home/figma-assets/live-profile-club-cover.webp'
import './HomePageFigma.css'
import './HomePageLaunch.css'

const products = [
  { name: 'Plastic Card', detail: 'Everyday ready', image: previewPlastic, key: 'plastic' },
  { name: 'Metal Card', detail: 'Made to impress', image: previewMetal, key: 'metal' },
  { name: 'Wood Card', detail: 'Naturally unique', image: previewWood, key: 'wood' },
  { name: 'Custom Card', detail: 'Your brand, your way', image: previewCustom, key: 'custom' },
] as const

const audiences = [
  { name: 'Professionals', image: audienceProfessional, enquiry: 'personal' },
  { name: 'Students', image: audienceStudent, enquiry: 'personal' },
  { name: 'Cafés & restaurants', image: audienceCafe, enquiry: 'cafe' },
  { name: 'Schools & teams', image: audienceOrganization, enquiry: 'team' },
] as const

const enquiryOptions = [
  { id: 'personal', label: 'Personal card', Icon: UserRound },
  { id: 'cafe', label: 'Café & restaurant', Icon: Coffee },
  { id: 'team', label: 'School or team', Icon: UsersRound },
] as const

type Enquiry = (typeof enquiryOptions)[number]['id']

const contactArtwork = {
  personal: {
    image: personalContactArtwork,
    alt: 'A professional sharing her digital contact profile on a phone',
    title: 'Make every introduction count.',
    description: 'Share your contact details and links in one simple tap.',
  },
  cafe: {
    image: cafeContactArtwork,
    alt: 'Digital café menu beside a Tap2Connect table card',
    title: 'A better table experience starts here.',
    description: 'Let customers explore your menu, share feedback and find you—all with a simple tap.',
  },
  team: {
    image: educationContactArtwork,
    alt: 'University students sharing a digital profile with an NFC card',
    title: 'Connect your school or team.',
    description: 'Give students and staff a simple way to share the right details.',
  },
} as const

function Logo() {
  return <span className="launch-logo"><img src={brandLogo} alt="" /><span><strong>TAP<span>2</span>CONNECT</strong><small>NEPAL</small></span></span>
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="launch-header"><div className="launch-shell launch-header-inner">
    <a href="#home" aria-label="Tap2Connect Nepal home"><Logo /></a>
    <button className="launch-menu-button" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'is-open' : ''} aria-label="Main navigation">
      {[['Home', '#home'], ['Products', '#cards'], ['How it works', '#how-it-works'], ['Contact', '#contact']].map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <a className="launch-login" href="/login/">Log in</a>
    </nav>
  </div></header>
}

function Hero() {
  return <section className="launch-hero" id="home"><div className="launch-shell launch-hero-layout">
    <div className="launch-hero-copy"><h1>One tap.<br />Endless<br />connections<span>.</span></h1><p>NFC cards and QR profiles for people and businesses in Nepal.</p>
      <div className="launch-actions"><a className="launch-button launch-button-primary" href="#cards">Explore cards <ArrowRight /></a><a className="launch-button launch-button-outline" href="#live-profile">View a live profile <ArrowRight /></a></div>
      <div className="launch-benefits"><span><CircleSlash2 /> No app needed</span><span><Settings /> Easy to update</span><span><ShieldCheck /> Made for Nepal</span></div>
    </div>
    <div className="launch-hero-media"><img src={heroPerson} alt="A Tap2Connect card and a digital profile shown together" fetchPriority="high" /></div>
  </div></section>
}

function SampleProfile({ saved = false }: { saved?: boolean }) {
  return <div className="launch-phone"><div className="launch-phone-notch" /><div className="launch-phone-screen">
    <div className="launch-phone-cover"><img src={audienceCollege} alt="" /></div><div className="launch-phone-avatar"><img src={audienceCollege} alt="" /></div>
    <strong>Aarya Sharma</strong><small>Marketing Manager · Kathmandu</small><div className="launch-phone-social"><span>in</span><span>◎</span><span>✉</span></div>
    <div className="launch-phone-save">{saved ? '✓ Contact saved' : 'Save contact'}</div><div className="launch-phone-row">Email <ArrowRight /></div><div className="launch-phone-row">Phone <ArrowRight /></div><div className="launch-phone-row">Website <ArrowRight /></div>
  </div></div>
}

function HowItWorks() {
  return <section className="launch-section launch-how" id="how-it-works"><div className="launch-shell">
    <div className="launch-section-head"><p className="launch-eyebrow">HOW IT WORKS</p><h2>One tap. So many possibilities<span>.</span></h2><p>Share a profile people can actually use—in three simple steps.</p></div>
    <div className="launch-steps">
      <article><div className="launch-step-art launch-tap-art"><img src={howTapPhoto} alt="A card tapping a phone" loading="lazy" /></div><span className="launch-step-number">01</span><h3>Tap or scan</h3><p>Share your card or QR code in a moment.</p></article>
      <article><div className="launch-step-art launch-profile-art"><SampleProfile /></div><span className="launch-step-number">02</span><h3>Open your profile</h3><p>Your details, links and story appear instantly.</p></article>
      <article><div className="launch-step-art launch-profile-art launch-saved-art"><SampleProfile saved /><div className="launch-saved-badge"><CheckCircle2 /> Contact saved</div></div><span className="launch-step-number">03</span><h3>Save and connect</h3><p>Make it easy to keep the conversation going.</p></article>
    </div>
  </div></section>
}

const liveProfiles = [
  { id: 'professional', tab: 'Professional', title: 'Robin Dhami', subtitle: 'CEO · Tap2Connect Nepal', description: 'A focused business identity for sharing services, links and contact details.', cover: professionalProfileCover },
  { id: 'cafe', tab: 'Café', title: 'Jyapu Cafe', subtitle: 'Rabibhawan-14, Kalanki', description: 'A warm customer experience with a menu, location and reviews in one place.', cover: cafeContactArtwork },
  { id: 'club', tab: 'Club', title: 'Ram Gautam', subtitle: 'General Member · ABC Club', description: 'A clear member profile for club details, events and social connections.', cover: clubProfileCover },
] as const

type LiveProfile = (typeof liveProfiles)[number]

function LiveProfilePhone({ profile }: { profile: LiveProfile }) {
  const isProfessional = profile.id === 'professional'
  const isCafe = profile.id === 'cafe'
  return <div className={`launch-live-phone launch-live-phone--${profile.id}`}>
    <div className="launch-live-phone__speaker" />
    <div className="launch-live-phone__screen">
      <div className="launch-live-phone__bar"><span>{isCafe ? 'JYAPU' : isProfessional ? 'T2C' : 'ABC'}</span><span><QrCode /> ···</span></div>
      <img className="launch-live-phone__cover" src={profile.cover} alt="" loading="lazy" />
      <div className="launch-live-phone__identity">
        <div className="launch-live-phone__avatar">{isProfessional ? <img src={brandLogo} alt="Tap2Connect logo" /> : isCafe ? <><Coffee /><small>JYAPU</small></> : <strong>ABC</strong>}</div>
        <div><h3>{profile.title}</h3><p>{profile.subtitle}</p></div>
      </div>
      <div className="launch-live-phone__actions"><span>{isCafe ? <Phone /> : isProfessional ? <ExternalLink /> : <MessageCircle />}{isCafe ? 'Call' : isProfessional ? 'Order now' : 'Contact me'}</span><span><UserRound /> Save</span></div>
      {isCafe ? <>
        <div className="launch-live-phone__nav"><b><Coffee /> Home</b><span><UtensilsCrossed /> Menu</span></div>
        <div className="launch-live-phone__hours"><span><i /> Open today</span><b>7:00 AM – 9:00 PM</b></div>
        <div className="launch-live-phone__menu"><h4>Popular today</h4><p><span>Masala Omelette</span><b>Rs. 180</b></p><p><span>Veg Momo</span><b>Rs. 180</b></p><p><span>French Toast</span><b>Rs. 220</b></p></div>
        <div className="launch-live-phone__review"><strong>Google Reviews</strong><span>★★★★★</span></div>
      </> : isProfessional ? <>
        <div className="launch-live-phone__shortcuts"><span><MessageCircle />WhatsApp</span><span><Mail />Email</span><span><Globe2 />Website</span><span><MapPin />Map</span></div>
        <div className="launch-live-phone__list"><h4>What I do</h4><p><ShieldCheck /><span><b>Digital business cards</b><small>Tap-ready contact sharing</small></span></p><p><UsersRound /><span><b>Networking profiles</b><small>Connect and grow</small></span></p><p><Star /><span><b>Google review tools</b><small>Simple customer feedback</small></span></p></div>
      </> : <>
        <div className="launch-live-phone__member"><span>Member ID</span><b>5654654</b></div>
        <div className="launch-live-phone__shortcuts"><span><Mail />Email</span><span><Globe2 />Website</span><span><Instagram />Instagram</span><span><MapPin />Map</span></div>
        <div className="launch-live-phone__list"><h4>Club access</h4><p><Star /><span><b>Events</b><small>See what is coming up</small></span></p><p><UsersRound /><span><b>Membership</b><small>Connect with the club</small></span></p><p><MapPin /><span><b>Location</b><small>Rabibhawan, Kathmandu</small></span></p></div>
      </>}
    </div>
  </div>
}

function LiveProfiles() {
  const [active, setActive] = useState(0)
  const pointerStart = useRef<number | null>(null)
  const didSwipe = useRef(false)
  const activeProfile = liveProfiles[active]
  const positionFor = (index: number) => {
    if (index === active) return 'is-active'
    return (index - active + liveProfiles.length) % liveProfiles.length === 1 ? 'is-right' : 'is-left'
  }
  const rotate = (direction: number) => setActive((current) => (current + direction + liveProfiles.length) % liveProfiles.length)
  return <section className="launch-section launch-live" id="live-profile"><div className="launch-shell">
    <div className="launch-live__intro"><div><p className="launch-eyebrow">LIVE PROFILE PREVIEW</p><h2>See how Tap2Connect<br />works in real life<span>.</span></h2></div><p>Explore three different profiles made for professionals, cafés and clubs. Switch between them to see what your visitors can open with one tap.</p></div>
    <div className="launch-live__tabs" role="tablist" aria-label="Choose a live profile">{liveProfiles.map((profile, index) => <button key={profile.id} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)}>{profile.tab}</button>)}</div>
    <div className="launch-live__stage" onPointerDown={(event) => { pointerStart.current = event.clientX; didSwipe.current = false }} onPointerUp={(event) => { if (pointerStart.current === null) return; const distance = event.clientX - pointerStart.current; if (Math.abs(distance) > 45) { didSwipe.current = true; rotate(distance > 0 ? -1 : 1) } pointerStart.current = null }}>
      {liveProfiles.map((profile, index) => <button className={`launch-live__phone-slot ${positionFor(index)}`} type="button" key={profile.id} aria-label={`Show ${profile.tab} profile`} aria-pressed={active === index} onClick={() => { if (didSwipe.current) { didSwipe.current = false; return } setActive(index) }}><LiveProfilePhone profile={profile} /></button>)}
      <button className="launch-live__arrow launch-live__arrow--left" type="button" aria-label="Previous profile" onClick={() => rotate(-1)}><ChevronLeft /></button>
      <button className="launch-live__arrow launch-live__arrow--right" type="button" aria-label="Next profile" onClick={() => rotate(1)}><ChevronRight /></button>
    </div>
    <div className="launch-live__caption" aria-live="polite"><div><span>{activeProfile.tab} profile</span><h3>{activeProfile.title}</h3><p>{activeProfile.description}</p></div><a className="launch-button launch-button-outline" href="#contact">Build a profile like this <ArrowRight /></a></div>
  </div></section>
}

function Audience({ onSelect }: { onSelect: (id: Enquiry) => void }) {
  return <section className="launch-section launch-audience"><div className="launch-shell">
    <div className="launch-section-head"><p className="launch-eyebrow">MADE FOR YOU</p><h2>A connection for every story<span>.</span></h2><p>From personal introductions to places people love.</p></div>
    <div className="launch-audience-grid">{audiences.map(({ name, image, enquiry }) => <a href="#contact" key={name} onClick={() => onSelect(enquiry)} className="launch-audience-card"><img src={image} alt="" loading="lazy" /><strong>{name}</strong><ArrowRight /></a>)}</div>
  </div></section>
}

function Products() {
  const [active, setActive] = useState(0)
  const product = products[active]
  return <section className="launch-section launch-products" id="cards"><div className="launch-shell">
    <div className="launch-section-head"><p className="launch-eyebrow">FIND YOUR FIT</p><h2>Choose your card<span>.</span></h2><p>Four materials. One simple way to connect.</p></div>
    <div className="launch-product-grid">{products.map(({ name, detail, image }) => <a href="#design-yours" className="launch-product" key={name}><div><img src={image} alt={`${name} preview`} loading="lazy" /></div><h3>{name}</h3><p>{detail}</p><span>Design yours <ArrowRight /></span></a>)}</div>
    <div className="launch-product-carousel" aria-roledescription="carousel" aria-label="Choose your card"><button type="button" aria-label="Previous card" onClick={() => setActive((active + 3) % 4)}><ChevronLeft /></button><a href="#design-yours" className="launch-product"><div><img src={product.image} alt={`${product.name} preview`} /></div><h3>{product.name}</h3><p>{product.detail}</p><span>Design yours <ArrowRight /></span></a><button type="button" aria-label="Next card" onClick={() => setActive((active + 1) % 4)}><ChevronRight /></button></div>
    <div className="launch-carousel-dots">{products.map((item, index) => <button key={item.key} type="button" aria-label={`Show ${item.name}`} aria-current={index === active} onClick={() => setActive(index)} />)}</div>
  </div></section>
}

function Studio() {
  const [material, setMaterial] = useState<(typeof products)[number]['key']>('plastic')
  const [finish, setFinish] = useState('Matte')
  const [accent, setAccent] = useState('#3e57ff')
  const [name, setName] = useState('Tap2Connect Nepal')
  const image = products.find((item) => item.key === material)?.image ?? previewPlastic
  return <section className="fig-studio" id="design-yours" aria-labelledby="studio-title"><div className="fig-shell fig-studio__layout">
    <div className="fig-studio__controls"><p className="fig-eyebrow">Design yours</p><h2 id="studio-title">Make it yours.<br />Tap to stand out.</h2><p className="fig-studio__lead">Customize every detail and see it come to life in real time.</p>
      <fieldset><legend>Material</legend><div className="fig-materials">{products.map((item) => <button className={`${item.key}${material === item.key ? ' is-selected' : ''}`} key={item.key} type="button" aria-pressed={material === item.key} onClick={() => setMaterial(item.key)}><i /><span>{item.key}</span></button>)}</div></fieldset>
      <fieldset><legend>Finish</legend><div className="fig-finishes">{['Matte', 'Brushed', 'Gloss'].map((item) => <button className={finish === item ? 'is-selected' : ''} key={item} type="button" aria-pressed={finish === item} onClick={() => setFinish(item)}>{item}</button>)}</div></fieldset>
      <fieldset><legend>Accent</legend><div className="fig-accents">{['#3e57ff', '#63ddca', '#ffbd45', '#aeb4be'].map((color) => <button className={accent === color ? 'is-selected' : ''} key={color} type="button" aria-label={`Set accent to ${color}`} aria-pressed={accent === color} onClick={() => setAccent(color)} style={{ backgroundColor: color }} />)}</div></fieldset>
      <label className="fig-name-field">Name on card <span><input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} /><small>{name.length} / 20</small></span></label>
      <a className="fig-button fig-button--primary fig-studio__button" href="/card-editor/">Continue to Advanced Editor <ArrowRight /></a>
    </div><div className={`fig-studio__preview fig-studio__preview--${finish.toLowerCase()}`} style={{ '--card-accent': accent } as CSSProperties}><img src={image} alt={`${material} ${finish.toLowerCase()} card preview`} loading="lazy" decoding="async" /></div>
  </div></section>
}

function Contact({ enquiry, setEnquiry }: { enquiry: Enquiry, setEnquiry: (id: Enquiry) => void }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const active = enquiryOptions.find((item) => item.id === enquiry) ?? enquiryOptions[0]
  const artwork = contactArtwork[enquiry]
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const body = new FormData(form)
    body.set('contactType', active.label)
    body.set('hearAbout', 'Website')
    setState('submitting'); setMessage('')
    try { const response = await apiFetch<{ message?: string }>('/send-message/', { method: 'POST', body }); form.reset(); setState('success'); setMessage(response.message || 'Thank you. Your enquiry has been sent.') }
    catch (error) { setState('error'); setMessage(displayError(error)) }
  }
  return <section className="launch-section launch-contact" id="contact"><div className="launch-shell">
    <div className="launch-section-head"><p className="launch-eyebrow">LET'S BUILD YOUR CONNECTION</p><h2>Tell us what you want to connect<span>.</span></h2><p>Choose an experience and share a few details. We’ll help you find the right setup.</p></div>
    <div className="launch-contact-options" role="group" aria-label="Choose an experience">{enquiryOptions.map(({ id, label, Icon }) => <button type="button" key={id} aria-pressed={enquiry === id} onClick={() => setEnquiry(id)}><Icon /> {label}</button>)}</div>
    <div className="launch-contact-layout"><form onSubmit={submit} className="launch-contact-form"><div className="launch-form-grid">
      <label>Your full name <b>*</b><input required name="fullName" autoComplete="name" placeholder="e.g. Aayush Thapa" /></label>
      <label>Phone / WhatsApp <b>*</b><input required name="phone" type="tel" autoComplete="tel" placeholder="e.g. 98XXXXXXXX" /></label>
      <label className="is-wide">{enquiry === 'personal' ? 'Name on card' : enquiry === 'team' ? 'School or team name' : 'Business name'} <b>*</b><input required name="organization" autoComplete="organization" placeholder={enquiry === 'cafe' ? 'e.g. Himalayan Coffee House' : 'Enter a name'} /></label>
      <label className="is-wide">Message <b>*</b><textarea required name="message" rows={4} placeholder="Tell us what you would like to create…" /></label>
    </div><label className="launch-consent"><input required type="checkbox" name="contactConsent" /><span>I agree to be contacted about this enquiry. <b>*</b></span></label>
    <div className="launch-form-actions"><button type="submit" disabled={state === 'submitting'} className="launch-button launch-button-primary">{state === 'submitting' ? 'Sending…' : 'Send enquiry'} <ArrowRight /></button><a className="launch-button launch-button-outline" href="https://wa.me/9779767452069?text=Hello%20Tap2Connect%2C%20I%27d%20like%20to%20ask%20about%20a%20card%20or%20digital%20profile." target="_blank" rel="noreferrer"><MessageCircle /> Chat on WhatsApp</a></div>
    <p className="launch-contact-email">Prefer email? <a href="mailto:hello@tap2connect.com.np">hello@tap2connect.com.np</a></p>{message && <p role="status" className={`launch-form-message is-${state}`}>{message}</p>}</form>
    <aside className={`launch-contact-art launch-contact-art--${enquiry}`}><picture>{enquiry === 'cafe' && <source media="(max-width: 700px)" srcSet={cafeContactPortrait} />}<img src={artwork.image} alt={artwork.alt} loading="lazy" /></picture><div><h3>{artwork.title}</h3><p>{artwork.description}</p></div></aside></div>
  </div></section>
}

function Faq() {
  const questions = [
    ['Do people need an app to view my profile?', 'No. They can open your profile in their phone browser by tapping the NFC card or scanning its QR code.'],
    ['Can I update my details later?', 'Yes. You can update your digital profile without replacing your physical card.'],
    ['Can a café show its menu through a QR code?', 'Yes. Guests can scan or tap to open the café profile and browse its menu.'],
  ]
  return <section className="launch-section launch-faq" id="faq"><div className="launch-shell launch-faq-layout"><div><p className="launch-eyebrow">GOOD TO KNOW</p><h2>Frequently asked questions<span>.</span></h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>
}

function Closing() { return <section className="launch-closing"><div className="launch-shell"><h2>Turn every tap into a new opportunity<span>.</span></h2><a className="launch-button launch-button-primary" href="#contact">Let's connect <ArrowRight /></a></div></section> }

function Footer({ onSelect }: { onSelect: (id: Enquiry) => void }) {
  return <footer className="launch-footer">
    <div className="launch-shell launch-footer-main">
      <div className="launch-footer-brand">
        <a href="#home" aria-label="Tap2Connect Nepal home"><Logo /></a>
        <strong>One tap. Endless connections.</strong>
        <p>Digital profiles and NFC cards made for real connections.</p>
      </div>
      <nav className="launch-footer-fit" aria-label="Find your fit">
        <h3>Find your fit</h3>
        {enquiryOptions.map(({ id, label }) => <a href="#contact" key={id} onClick={() => onSelect(id)}>{label}<ArrowRight aria-hidden="true" /></a>)}
      </nav>
      <div className="launch-footer-contact">
        <h3>Get in touch</h3>
        <a href="mailto:hello@tap2connect.com.np"><Mail aria-hidden="true" /> <span>hello@tap2connect.com.np</span></a>
        <a href="https://wa.me/9779767452069" target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> <span>+977 9767452069</span></a>
        <a className="launch-footer-contact-button" href="#contact">Contact us <ArrowRight aria-hidden="true" /></a>
      </div>
    </div>
    <div className="launch-shell launch-footer-bottom"><span>© {new Date().getFullYear()} Tap2Connect Nepal</span><span>Made for Nepal <span aria-hidden="true">🇳🇵</span></span></div>
  </footer>
}

export function HomePage() {
  const [enquiry, setEnquiry] = useState<Enquiry>('cafe')
  useEffect(() => { document.documentElement.style.scrollBehavior = 'smooth'; return () => { document.documentElement.style.scrollBehavior = '' } }, [])
  return <div className="launch"><Header /><main><Hero /><HowItWorks /><LiveProfiles /><Audience onSelect={setEnquiry} /><Products /><Studio /><Contact enquiry={enquiry} setEnquiry={setEnquiry} /><Faq /><Closing /></main><Footer onSelect={setEnquiry} /></div>
}
