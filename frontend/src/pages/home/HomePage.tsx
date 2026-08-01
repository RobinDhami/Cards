import { useEffect, useMemo, useState } from 'react'
import djangoHomeTemplate from '../../../../vcards/Templates/home.html?raw'
import '../../../../theme/static/css/homepage.css'
import { CardDesignStudio } from './CardDesignStudio'
import { ContactSection } from './ContactSection'
import { FaqSection } from './FaqSection'

const howItWorksSteps = [
  {
    word: 'Tap',
    label: 'Open the moment',
    copy: 'Your NFC card, QR, or profile link opens a live digital identity in seconds.',
    image: '/static/products/plastic-nfc-card.png',
    alt: 'Tap2Connect NFC card ready to tap',
  },
  {
    word: 'Share',
    label: 'Choose what people see',
    copy: 'Contacts, links, portfolios, documents, products, and school details stay in one clean profile.',
    image: '/static/hero/professional-profile-preview.webp',
    alt: 'Tap2Connect digital profile preview',
  },
  {
    word: 'Connect',
    label: 'Keep the relationship alive',
    copy: 'People save your details, message you, visit your links, and return whenever your profile updates.',
    image: '/static/audience/business.svg',
    alt: 'Tap2Connect connections and business profile illustration',
  },
]

const hiddenWhyCardTitles = new Set([
  'Secure Sharing',
  'Universal Compatibility',
])

const headerNavigation = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Cards', href: '#cards' },
  { label: 'Design yours', href: '#card-studio' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

function renderLogoInclude(match: string) {
  const width = match.match(/logo_width="([^"]+)"/)?.[1] ?? '108px'
  const height = match.match(/logo_height="([^"]+)"/)?.[1] ?? '38px'
  const radius = match.match(/logo_radius="([^"]+)"/)?.[1] ?? '8px'
  const alt = match.match(/logo_alt="([^"]+)"/)?.[1] ?? 'Tap2Connect'

  return `<span style="display:inline-block;position:relative;width:${width};height:${height};flex:0 0 auto;overflow:hidden;border-radius:${radius};background:#fff;vertical-align:middle;"><img src="/static/branding/tap2connect-logo.png" alt="${alt}" style="position:absolute;left:0;top:50%;display:block;width:100%;max-width:none;height:auto;transform:translateY(-50%);"></span>`
}

function prepareHomeMarkup(markup: string) {
  const template = document.createElement('template')
  template.innerHTML = markup

  template.content.querySelector('[data-loader]')?.remove()
  template.content.querySelector('#business')?.remove()
  template.content.querySelector('#contact')?.remove()
  template.content.querySelector('#faq')?.remove()
  template.content.querySelector('.final-cta')?.remove()
  template.content.querySelectorAll<HTMLElement>('#why .timeline-card').forEach((card) => {
    const title = card.querySelector('h3')?.textContent?.trim()
    if (title && hiddenWhyCardTitles.has(title)) {
      card.remove()
    }
  })

  const navigation = template.content.querySelector<HTMLElement>('.site-nav')
  const mobileLogin = navigation?.querySelector<HTMLAnchorElement>('.mobile-nav-cta')
  if (navigation) {
    const links = headerNavigation.map(({ label, href }, index) => {
      const link = document.createElement('a')
      link.className = `nav-link${index === 0 ? ' is-active' : ''}`
      link.href = href
      link.textContent = label
      return link
    })
    navigation.replaceChildren(...links, ...(mobileLogin ? [mobileLogin] : []))
  }

  const collectionCta = template.content.querySelector<HTMLAnchorElement>('#cards .btn')
  if (collectionCta) {
    collectionCta.href = '#card-studio'
    collectionCta.firstChild!.textContent = 'Design Your Card '
  }

  template.content.querySelectorAll<HTMLAnchorElement>('a[href="#business"]').forEach((link) => link.remove())
  template.content
    .querySelectorAll<HTMLAnchorElement>('.footer-grid a[href="#contact"]')
    .forEach((link) => link.remove())

  const footerSections = Array.from(template.content.querySelectorAll<HTMLElement>('.footer-grid > div'))
  const quickLinks = footerSections.find(
    (section) => section.querySelector('strong')?.textContent?.trim() === 'Quick Links',
  )
  if (quickLinks) {
    const designLink = document.createElement('a')
    designLink.href = '#card-studio'
    designLink.textContent = 'Design Your Card'
    quickLinks.append(designLink)

    const faqLink = document.createElement('a')
    faqLink.href = '#faq'
    faqLink.textContent = 'FAQ'
    quickLinks.append(faqLink)

    const contactLink = document.createElement('a')
    contactLink.href = '#contact'
    contactLink.textContent = 'Contact'
    quickLinks.append(contactLink)
  }

  return template.innerHTML
}

function buildHomeMarkup() {
  const bodyMatch = djangoHomeTemplate.match(/<body[^>]*>([\s\S]*?)<script>/)
  const body = bodyMatch?.[1] ?? ''

  const markup = body
    .replace(/\{% include "partials\/tap2connect_logo\.html"[^%]*%\}/g, renderLogoInclude)
    .replace(/\{% static '([^']+)' %\}/g, '/static/$1')
    .replace(/\{% url 'send_message' %\}/g, '/send-message/')
    .replace(/\{% csrf_token %\}/g, '')
    .replace(/Â·/g, '·')
    .replace(/â–¶/g, '▶')
    .replace(/&mdash;/g, '—')
  return prepareHomeMarkup(markup)
}

function splitHomeMarkup(markup: string) {
  const sectionPattern = /<section\b(?=[^>]*\bid="how-it-works")[^>]*>[\s\S]*?<\/section>\s*/
  const match = markup.match(sectionPattern)

  if (!match || typeof match.index !== 'number') {
    return { beforeHowItWorks: markup, afterHowItWorks: '' }
  }

  return {
    beforeHowItWorks: markup.slice(0, match.index),
    afterHowItWorks: markup.slice(match.index + match[0].length),
  }
}

function splitMainFooterMarkup(markup: string) {
  const mainCloseIndex = markup.indexOf('</main>')
  if (mainCloseIndex === -1) {
    return { mainSectionsMarkup: markup, footerMarkup: '' }
  }

  return {
    mainSectionsMarkup: markup.slice(0, mainCloseIndex),
    footerMarkup: markup.slice(mainCloseIndex),
  }
}

function HomeLoader() {
  const [phase, setPhase] = useState<'visible' | 'hidden' | 'removed'>('visible')

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setPhase('hidden'), 850)
    const removeTimer = window.setTimeout(() => setPhase('removed'), 1300)

    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (phase === 'removed') return null

  return (
    <div
      className={`site-loader${phase === 'hidden' ? ' is-hidden' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Connecting to Tap2Connect Nepal"
    >
      <div className="loader-container">
        <div className="loader-icon-wrapper" aria-hidden="true">
          <div className="loader-spinner-track">
            <div className="loader-spinner-tail" />
            <div className="loader-spinner-dot" />
          </div>

          <div className="loader-inner-circle">
            <svg
              className="loader-logo-svg"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 25 85 V 35 L 55 80 A 28 28 0 0 0 55 35"
                stroke="#2563eb"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                className="loader-wave loader-wave-2"
                d="M 75 92 A 44 44 0 0 0 75 23"
                stroke="#2563eb"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                className="loader-wave loader-wave-3"
                d="M 95 104 A 62 62 0 0 0 95 11"
                stroke="#2563eb"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <h2 className="loader-connecting">Connecting...</h2>
        <p className="loader-subtitle">Tap. Connect. Share.</p>
        <div className="loader-dots" aria-hidden="true">
          <span className="loader-dot" />
          <span className="loader-dot" />
          <span className="loader-dot" />
        </div>
      </div>
    </div>
  )
}

function HowItWorksSection() {
  return (
    <section className="steps-section section-pad tsc-steps" id="how-it-works">
      <div className="container">
        <div className="tsc-steps-layout">
          <div className="tsc-steps-copy">
            <span className="microline">How it works</span>
            <h2>Tap. Share. Connect.</h2>
            <p>
              Tap2Connect turns one physical or digital touchpoint into a living profile people can save,
              revisit, and trust.
            </p>
            <div className="tsc-identity-thread" aria-hidden="true">
              <span>Card</span>
              <i />
              <span>Profile</span>
              <i />
              <span>Contact</span>
            </div>
          </div>

          <div className="tsc-steps-flow" aria-label="Tap2Connect working mechanism">
            {howItWorksSteps.map((step) => (
              <article className="tsc-step-card" key={step.word}>
                <div className="tsc-step-visual">
                  <img src={step.image} alt={step.alt} loading="lazy" />
                </div>
                <h3>{step.word}</h3>
                <strong>{step.label}</strong>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function useHomepageInteractions() {
  useEffect(() => {
    const siteHeader = document.querySelector('.site-header')
    const navToggle = document.querySelector('.nav-toggle')
    const siteNav = document.querySelector('.site-nav')
    const dropdown = document.querySelector('.has-dropdown')
    const dropdownToggle = document.querySelector('.nav-dropdown-toggle')
    const navLinks = document.querySelectorAll<HTMLAnchorElement>('.site-nav a[href^="#"]')
    const primaryLinks = document.querySelectorAll<HTMLAnchorElement>('.site-nav > a.nav-link[href^="#"]')

    const closeNavigation = () => {
      siteNav?.classList.remove('is-open')
      dropdown?.classList.remove('is-open')
      navToggle?.setAttribute('aria-expanded', 'false')
      navToggle?.setAttribute('aria-label', 'Open menu')
      dropdownToggle?.setAttribute('aria-expanded', 'false')
    }

    const updateHeaderState = () => {
      siteHeader?.classList.toggle('is-scrolled', window.scrollY > 40)
    }

    const handleToggleClick = () => {
      const expanded = navToggle?.getAttribute('aria-expanded') === 'true'
      navToggle?.setAttribute('aria-expanded', String(!expanded))
      navToggle?.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu')
      siteNav?.classList.toggle('is-open')
    }

    const handleDropdownClick = () => {
      const expanded = dropdownToggle?.getAttribute('aria-expanded') === 'true'
      dropdownToggle?.setAttribute('aria-expanded', String(!expanded))
      dropdown?.classList.toggle('is-open', !expanded)
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (siteHeader && !siteHeader.contains(event.target as Node)) {
        closeNavigation()
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeNavigation()
        ;(navToggle as HTMLElement | null)?.focus()
      }
    }

    const sections = Array.from(primaryLinks)
      .map((link) => ({ link, target: document.querySelector(link.getAttribute('href') ?? '') }))
      .filter((item): item is { link: HTMLAnchorElement; target: Element } => Boolean(item.target))

    const setActiveLink = () => {
      const offset = window.innerHeight * 0.28
      let activeItem = sections[0]
      sections.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= offset) {
          activeItem = item
        }
      })
      primaryLinks.forEach((link) => link.classList.toggle('is-active', link === activeItem?.link))
    }

    updateHeaderState()
    setActiveLink()
    window.addEventListener('scroll', updateHeaderState, { passive: true })
    window.addEventListener('scroll', setActiveLink, { passive: true })
    navToggle?.addEventListener('click', handleToggleClick)
    dropdownToggle?.addEventListener('click', handleDropdownClick)
    navLinks.forEach((link) => link.addEventListener('click', closeNavigation))
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('scroll', updateHeaderState)
      window.removeEventListener('scroll', setActiveLink)
      navToggle?.removeEventListener('click', handleToggleClick)
      dropdownToggle?.removeEventListener('click', handleDropdownClick)
      navLinks.forEach((link) => link.removeEventListener('click', closeNavigation))
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [])
}

export function HomePage() {
  const homeMarkup = useMemo(buildHomeMarkup, [])
  const { beforeHowItWorks, afterHowItWorks } = useMemo(() => splitHomeMarkup(homeMarkup), [homeMarkup])
  const { mainSectionsMarkup, footerMarkup } = useMemo(
    () => splitMainFooterMarkup(afterHowItWorks),
    [afterHowItWorks],
  )
  useHomepageInteractions()

  return (
    <>
      <HomeLoader />
      <div dangerouslySetInnerHTML={{ __html: beforeHowItWorks }} />
      <HowItWorksSection />
      <div dangerouslySetInnerHTML={{ __html: mainSectionsMarkup }} />
      <CardDesignStudio />
      <FaqSection />
      <ContactSection />
      <div dangerouslySetInnerHTML={{ __html: footerMarkup }} />
    </>
  )
}
