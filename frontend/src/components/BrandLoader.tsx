import brandMark from '../../../theme/static/branding/tap2connect-logo-optimized.webp'

type BrandLoaderProps = {
  label?: string
  compact?: boolean
}

/** A small, brand-specific loading mark inspired by the Tap2Connect symbol. */
export function BrandLoader({ label = "Loading…", compact = false }: BrandLoaderProps) {
  return (
    <div className={`brand-loader${compact ? " is-compact" : ""}`} role="status" aria-live="polite" aria-label={label}>
      <span className="brand-loader-mark" aria-hidden="true">
        <img className="brand-loader-half brand-loader-half-left" src={brandMark} alt="" />
        <img className="brand-loader-half brand-loader-half-right" src={brandMark} alt="" />
      </span>
      <span>{label}</span>
    </div>
  )
}
