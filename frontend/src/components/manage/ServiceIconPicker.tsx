import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import {
  serviceIconCatalog,
  serviceIconCategories,
  serviceIconMap,
  suggestServiceIcon,
} from '../../lib/serviceIcons'
import './ServiceIconPicker.css'

export function ServiceIconPicker({
  value,
  offeringTitle,
  onChange,
}: {
  value: string
  offeringTitle: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof serviceIconCategories)[number]>('All')
  const [draftValue, setDraftValue] = useState(value || 'briefcase')
  const selected = serviceIconCatalog.find((item) => item.value === value) ?? serviceIconCatalog[0]
  const SelectedIcon = serviceIconMap[selected.value]

  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const filteredIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return serviceIconCatalog.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category
      const haystack = `${item.label} ${item.category} ${item.keywords} ${item.value}`.toLowerCase()
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [category, query])

  function showPicker() {
    setDraftValue(value || suggestServiceIcon(offeringTitle))
    setQuery('')
    setCategory('All')
    setOpen(true)
  }

  function useSuggestion() {
    const suggestion = suggestServiceIcon(offeringTitle)
    setDraftValue(suggestion)
    setCategory('All')
    setQuery('')
  }

  return (
    <>
      <button className="service-icon-picker-trigger" type="button" onClick={showPicker}>
        <span><SelectedIcon size={19} aria-hidden="true" /></span>
        <span>
          <strong>{selected.label}</strong>
          <small>Choose icon</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {open ? createPortal(
        <div className="service-icon-modal" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="service-icon-title" className="service-icon-dialog">
            <header>
              <div>
                <h2 id="service-icon-title">Choose an icon</h2>
                <p>Use one consistent symbol that makes this offering easier to scan.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close icon picker"><X size={18} /></button>
            </header>

            <div className="service-icon-tools">
              <label>
                <Search size={17} aria-hidden="true" />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons or industries" />
              </label>
              <button type="button" onClick={useSuggestion} disabled={!offeringTitle.trim()}>
                <Sparkles size={15} aria-hidden="true" /> Suggest for “{offeringTitle.trim() || 'offering'}”
              </button>
            </div>

            <div className="service-icon-categories" aria-label="Icon categories">
              {serviceIconCategories.map((item) => (
                <button className={item === category ? 'is-selected' : ''} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>
              ))}
            </div>

            <div className="service-icon-grid" role="listbox" aria-label="Offering icons">
              {filteredIcons.map(({ value: iconValue, label, category: iconCategory, Icon }) => (
                <button
                  className={iconValue === draftValue ? 'is-selected' : ''}
                  type="button"
                  role="option"
                  aria-selected={iconValue === draftValue}
                  onClick={() => setDraftValue(iconValue)}
                  key={iconValue}
                >
                  {iconValue === draftValue ? <span className="service-icon-check"><Check size={12} /></span> : null}
                  <Icon size={28} aria-hidden="true" />
                  <strong>{label}</strong>
                  <small>{iconCategory}</small>
                </button>
              ))}
              {filteredIcons.length === 0 ? <p className="service-icon-empty">No icons match that search. Try a broader business word.</p> : null}
            </div>

            <footer>
              <button type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="is-primary" type="button" onClick={() => {
                onChange(draftValue)
                setOpen(false)
              }}>Use icon</button>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
