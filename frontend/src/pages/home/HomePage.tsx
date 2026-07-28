import { useEffect, useMemo } from 'react'
import djangoHomeTemplate from '../../../../vcards/Templates/home.html?raw'
import { apiFetch, displayError } from '../../lib/api'
import '../../../../theme/static/css/homepage.css'

function renderLogoInclude(match: string) {
  const width = match.match(/logo_width="([^"]+)"/)?.[1] ?? '108px'
  const height = match.match(/logo_height="([^"]+)"/)?.[1] ?? '38px'
  const radius = match.match(/logo_radius="([^"]+)"/)?.[1] ?? '8px'
  const alt = match.match(/logo_alt="([^"]+)"/)?.[1] ?? 'Tap2Connect'

  return `<span style="display:inline-block;position:relative;width:${width};height:${height};flex:0 0 auto;overflow:hidden;border-radius:${radius};background:#fff;vertical-align:middle;"><img src="/static/branding/tap2connect-logo.png" alt="${alt}" style="position:absolute;left:0;top:50%;display:block;width:100%;max-width:none;height:auto;transform:translateY(-50%);"></span>`
}

function buildHomeMarkup() {
  const bodyMatch = djangoHomeTemplate.match(/<body[^>]*>([\s\S]*?)<script>/)
  const body = bodyMatch?.[1] ?? ''

  return body
    .replace(/\{% include "partials\/tap2connect_logo\.html"[^%]*%\}/g, renderLogoInclude)
    .replace(/\{% static '([^']+)' %\}/g, '/static/$1')
    .replace(/\{% url 'send_message' %\}/g, '/send-message/')
    .replace(/\{% csrf_token %\}/g, '')
    .replace(/Â·/g, '·')
    .replace(/â–¶/g, '▶')
    .replace(/&mdash;/g, '—')
}

function useHomepageInteractions() {
  useEffect(() => {
    const loader = document.querySelector('[data-loader]')
    const hideLoader = () => {
      loader?.classList.add('is-hidden')
      window.setTimeout(() => loader?.remove(), 650)
    }

    window.setTimeout(hideLoader, 450)
    const loaderFallback = window.setTimeout(hideLoader, 2500)

    const siteHeader = document.querySelector('.site-header')
    const navToggle = document.querySelector('.nav-toggle')
    const siteNav = document.querySelector('.site-nav')
    const dropdown = document.querySelector('.has-dropdown')
    const dropdownToggle = document.querySelector('.nav-dropdown-toggle')
    const navLinks = document.querySelectorAll<HTMLAnchorElement>('.site-nav a[href^="#"]')
    const primaryLinks = document.querySelectorAll<HTMLAnchorElement>('.site-nav > a.nav-link[href^="#"]')
    const inquiryForm = document.querySelector<HTMLFormElement>('.inquiry-form')

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

    const handleInquirySubmit = async (event: SubmitEvent) => {
      event.preventDefault()
      if (!inquiryForm) return
      const submitButton = inquiryForm.querySelector<HTMLButtonElement>('button[type="submit"]')
      let status = inquiryForm.querySelector<HTMLParagraphElement>('.inquiry-form-status')
      if (!status) {
        status = document.createElement('p')
        status.className = 'inquiry-form-status'
        status.setAttribute('role', 'status')
        inquiryForm.append(status)
      }
      submitButton?.setAttribute('disabled', 'true')
      status.classList.remove('is-error', 'is-success')
      status.textContent = 'Sending your inquiry...'
      try {
        await apiFetch('/send-message/', {
          method: 'POST',
          body: new FormData(inquiryForm),
        })
        inquiryForm.reset()
        status.classList.add('is-success')
        status.textContent = 'Thank you. Your inquiry has been sent.'
      } catch (error) {
        status.classList.add('is-error')
        status.textContent = displayError(error)
      } finally {
        submitButton?.removeAttribute('disabled')
      }
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
    inquiryForm?.addEventListener('submit', handleInquirySubmit)

    return () => {
      window.clearTimeout(loaderFallback)
      window.removeEventListener('scroll', updateHeaderState)
      window.removeEventListener('scroll', setActiveLink)
      navToggle?.removeEventListener('click', handleToggleClick)
      dropdownToggle?.removeEventListener('click', handleDropdownClick)
      navLinks.forEach((link) => link.removeEventListener('click', closeNavigation))
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeydown)
      inquiryForm?.removeEventListener('submit', handleInquirySubmit)
    }
  }, [])
}

export function HomePage() {
  const homeMarkup = useMemo(buildHomeMarkup, [])
  useHomepageInteractions()

  return <div dangerouslySetInnerHTML={{ __html: homeMarkup }} />
}
