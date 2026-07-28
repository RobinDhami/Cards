import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.mjs'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.mjs'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.mjs'
import Headphones from 'lucide-react/dist/esm/icons/headphones.mjs'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.mjs'
import Menu from 'lucide-react/dist/esm/icons/menu.mjs'
import Minus from 'lucide-react/dist/esm/icons/minus.mjs'
import Package from 'lucide-react/dist/esm/icons/package.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import Truck from 'lucide-react/dist/esm/icons/truck.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import { Field, SelectInput, TextArea, TextInput } from '../../components/manage/FormControls'
import { apiFetch, displayError, jsonBody, queryString } from '../../lib/api'
import './StorefrontApp.css'

type StoreData = {
  name: string
  slug: string
  logo: string
  description: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  primaryColor: string
  secondaryColor: string
  heroTitle: string
  heroSubtitle: string
  heroLabel: string
  heroImage: string
  promoTitle: string
  promoCode: string
  promoImage: string
}

type CategoryData = {
  id: number
  name: string
  slug: string
  image: string
  productCount: number
}

type ProductData = {
  id: number
  name: string
  slug: string
  brand: string
  category: string
  shortDescription: string
  fullDescription?: string
  regularPrice: string
  discountedPrice: string
  currentPrice: string
  discountPercent: number
  sku: string
  stockQuantity: number
  status: string
  isInStock: boolean
  image: string
  shippingInformation?: string
  images?: Array<{ id: number; url: string; altText: string }>
  options?: Array<{ id: number; name: string; values: Array<{ id: number; value: string }> }>
}

type CartData = {
  items: Array<{ product: ProductData; quantity: number; unitPrice: string; lineTotal: string }>
  subtotal: string
  discount: string
  deliveryCharge: string
  grandTotal: string
  count: number
  couponCode: string
  couponApplied: boolean
  freeDeliveryMinimum: string
}

type OrderData = {
  orderNumber: string
  status: string
  statusLabel: string
  paymentStatus: string
  paymentStatusLabel: string
  paymentMethod: string
  paymentMethodLabel: string
  customerName: string
  customerPhone: string
  customerEmail: string
  city: string
  province: string
  area: string
  detailedAddress: string
  grandTotal: string
  subtotal: string
  discountAmount: string
  deliveryCharge: string
  createdAt: string
  items: Array<{ id: number; name: string; quantity: number; lineTotal: string; image: string }>
}

function routeData() {
  const match = window.location.pathname.match(/^\/shop\/([^/]+)(.*)$/)
  return {
    slug: decodeURIComponent(match?.[1] ?? ''),
    rest: match?.[2] || '/',
  }
}

function StoreHeader({
  store,
  cartCount,
}: {
  store: StoreData
  cartCount: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <div className="storefront-announcement">Free delivery inside Kathmandu on qualifying orders</div>
      <header className="storefront-header">
        <a className="storefront-brand" href={`/shop/${store.slug}/`}>
          {store.logo ? <img src={store.logo} alt="" /> : <span>{store.name.slice(0, 1)}</span>}
          <strong>{store.name}</strong>
        </a>
        <nav className={menuOpen ? 'is-open' : ''}>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
          <a href={`/shop/${store.slug}/`}>Home</a>
          <a href={`/shop/${store.slug}/products/`}>Shop</a>
          <a href={`/shop/${store.slug}/track-order/`}>Track order</a>
        </nav>
        <div className="storefront-header-actions">
          <a href={`/shop/${store.slug}/products/`} aria-label="Search products"><Search size={18} /></a>
          <a href={`/shop/${store.slug}/cart/`} aria-label={`Cart with ${cartCount} items`} className="storefront-cart-icon"><ShoppingBag size={19} />{cartCount > 0 ? <span>{cartCount}</span> : null}</a>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
        </div>
      </header>
    </>
  )
}

function StoreFooter({ store }: { store: StoreData }) {
  return (
    <footer className="storefront-footer">
      <div>
        <strong>{store.name}</strong>
        <p>{store.description}</p>
      </div>
      <div><strong>Shop</strong><a href={`/shop/${store.slug}/products/`}>All products</a><a href={`/shop/${store.slug}/cart/`}>Shopping cart</a><a href={`/shop/${store.slug}/track-order/`}>Track order</a></div>
      <div><strong>Contact</strong><span>{store.phone}</span><span>{store.email}</span><span>{store.address}</span></div>
      <small>Powered by <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect" /></small>
    </footer>
  )
}

function StoreLayout({
  store,
  cartCount,
  children,
}: {
  store: StoreData
  cartCount: number
  children: ReactNode
}) {
  return (
    <div className="storefront-app" style={{ '--store-primary': store.primaryColor, '--store-secondary': store.secondaryColor } as React.CSSProperties}>
      <StoreHeader store={store} cartCount={cartCount} />
      {children}
      <StoreBenefits />
      <StoreFooter store={store} />
    </div>
  )
}

function StoreBenefits() {
  return (
    <section className="storefront-benefits">
      <span><Truck size={20} /><strong>Delivery across Nepal<small>Reliable doorstep shipping</small></strong></span>
      <span><ShieldCheck size={20} /><strong>Secure checkout<small>Protected order information</small></strong></span>
      <span><Headphones size={20} /><strong>Local support<small>Help from the store team</small></strong></span>
      <span><BadgeCheck size={20} /><strong>Quality products<small>Carefully managed catalogue</small></strong></span>
    </section>
  )
}

function ProductCard({
  product,
  slug,
  onAdd,
}: {
  product: ProductData
  slug: string
  onAdd: (product: ProductData) => void
}) {
  return (
    <article className="store-product-card">
      <a className="store-product-image" href={`/shop/${slug}/product/${product.slug}/`}>
        {product.image ? <img src={product.image} alt={product.name} /> : <Package size={30} />}
        {product.discountPercent > 0 ? <span>-{product.discountPercent}%</span> : null}
      </a>
      <small>{product.category || product.brand || 'Collection'}</small>
      <a href={`/shop/${slug}/product/${product.slug}/`}>{product.name}</a>
      <div>
        <strong>NPR {Number(product.currentPrice).toLocaleString()}</strong>
        {product.discountedPrice ? <del>NPR {Number(product.regularPrice).toLocaleString()}</del> : null}
      </div>
      <button type="button" onClick={() => onAdd(product)} disabled={!product.isInStock}>
        <ShoppingBag size={14} />{product.isInStock ? 'Add to cart' : 'Out of stock'}
      </button>
    </article>
  )
}

function ProductGrid({
  products,
  slug,
  onAdd,
}: {
  products: ProductData[]
  slug: string
  onAdd: (product: ProductData) => void
}) {
  if (products.length === 0) return <div className="storefront-empty">No products are available in this collection.</div>
  return <div className="store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} slug={slug} onAdd={onAdd} />)}</div>
}

function useStoreCollection() {
  const { slug, rest } = routeData()
  const searchParams = new URLSearchParams(window.location.search)
  const categoryMatch = rest.match(/^\/category\/([^/]+)/)
  const [store, setStore] = useState<StoreData | null>(null)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [collections, setCollections] = useState<{ featured: ProductData[]; trending: ProductData[]; newArrivals: ProductData[]; bestSellers: ProductData[] }>({ featured: [], trending: [], newArrivals: [], bestSellers: [] })
  const [cart, setCart] = useState<CartData | null>(null)
  const [filters, setFilters] = useState({
    query: searchParams.get('q') ?? '',
    category: categoryMatch?.[1] ?? searchParams.get('category') ?? '',
    sort: searchParams.get('sort') ?? 'featured',
  })
  const [error, setError] = useState('')

  const endpoint = useMemo(() => `/api/shops/${slug}/${queryString({ q: filters.query, category: filters.category, sort: filters.sort })}`, [slug, filters])
  useEffect(() => {
    apiFetch<{
      store: StoreData
      categories: CategoryData[]
      products: ProductData[]
      collections: typeof collections
      cart: CartData
    }>(endpoint).then((payload) => {
      setStore(payload.store)
      setCategories(payload.categories)
      setProducts(payload.products)
      setCollections(payload.collections)
      setCart(payload.cart)
      document.title = `${payload.store.name} | Online Store`
    }).catch((reason) => setError(displayError(reason)))
  }, [endpoint])

  async function add(product: ProductData) {
    try {
      const response = await apiFetch<{ cart: CartData }>(`/api/shops/${slug}/cart/`, {
        method: 'POST',
        body: jsonBody({ action: 'add', productId: product.id, quantity: 1 }),
      })
      setCart(response.cart)
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  return { slug, rest, store, categories, products, collections, cart, filters, setFilters, error, add }
}

function StoreHomePage() {
  const data = useStoreCollection()
  if (!data.store || !data.cart) return <div className="storefront-state">{data.error || 'Loading store…'}</div>
  const trending = data.collections.trending.length ? data.collections.trending : data.products.slice(0, 8)
  const featured = data.collections.featured.length ? data.collections.featured : data.products.slice(0, 8)

  return (
    <StoreLayout store={data.store} cartCount={data.cart.count}>
      {data.error ? <div className="storefront-error">{data.error}</div> : null}
      <main>
        <section className="storefront-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.74), rgba(0,0,0,.12)), url("${data.store.heroImage}")` }}>
          <div>
            <span>{data.store.heroLabel}</span>
            <h1>{data.store.heroTitle}</h1>
            <p>{data.store.heroSubtitle}</p>
            <a href={`/shop/${data.slug}/products/`}>Shop collection <ArrowRight size={16} /></a>
          </div>
        </section>
        {data.categories.length > 0 ? (
          <section className="storefront-section store-categories">
            <header><div><span>Collections</span><h2>Shop by category</h2></div><a href={`/shop/${data.slug}/products/`}>View all <ArrowRight size={14} /></a></header>
            <div>{data.categories.slice(0, 6).map((category) => <a href={`/shop/${data.slug}/category/${category.slug}/`} key={category.id}><span>{category.image ? <img src={category.image} alt="" /> : <Package size={25} />}</span><strong>{category.name}</strong><small>{category.productCount} products</small></a>)}</div>
          </section>
        ) : null}
        <section className="storefront-section">
          <header><div><span>Popular now</span><h2>Trending products</h2></div><a href={`/shop/${data.slug}/products/`}>View all <ArrowRight size={14} /></a></header>
          <ProductGrid products={trending} slug={data.slug} onAdd={data.add} />
        </section>
        <section className="store-promo" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.75), rgba(0,0,0,.2)), url("${data.store.promoImage}")` }}>
          <div><span>Limited offer</span><h2>{data.store.promoTitle}</h2><p>Use code <strong>{data.store.promoCode}</strong> at checkout.</p><a href={`/shop/${data.slug}/products/`}>Shop now</a></div>
        </section>
        <section className="storefront-section">
          <header><div><span>Selected for you</span><h2>Featured products</h2></div></header>
          <ProductGrid products={featured} slug={data.slug} onAdd={data.add} />
        </section>
      </main>
    </StoreLayout>
  )
}

function StoreProductsPage() {
  const data = useStoreCollection()
  if (!data.store || !data.cart) return <div className="storefront-state">{data.error || 'Loading products…'}</div>
  return (
    <StoreLayout store={data.store} cartCount={data.cart.count}>
      <main className="storefront-page">
        <header className="storefront-page-header"><span>Catalogue</span><h1>{data.filters.category ? data.categories.find((item) => item.slug === data.filters.category)?.name || 'Collection' : 'Shop all products'}</h1><p>Browse the complete collection from {data.store.name}.</p></header>
        <section className="store-filter-row">
          <label><Search size={15} /><input value={data.filters.query} onChange={(event) => data.setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Search products" /></label>
          <select value={data.filters.category} onChange={(event) => data.setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{data.categories.map((category) => <option value={category.slug} key={category.id}>{category.name}</option>)}</select>
          <select value={data.filters.sort} onChange={(event) => data.setFilters((current) => ({ ...current, sort: event.target.value }))}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="name">Name</option></select>
        </section>
        <ProductGrid products={data.products} slug={data.slug} onAdd={data.add} />
      </main>
    </StoreLayout>
  )
}

function ProductDetailPage() {
  const { slug, rest } = routeData()
  const productSlug = rest.match(/^\/product\/([^/]+)/)?.[1] ?? ''
  const [store, setStore] = useState<StoreData | null>(null)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [related, setRelated] = useState<ProductData[]>([])
  const [cart, setCart] = useState<CartData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ store: StoreData; product: ProductData; related: ProductData[]; cart: CartData }>(`/api/shops/${slug}/products/${productSlug}/`)
      .then((payload) => {
        setStore(payload.store)
        setProduct(payload.product)
        setRelated(payload.related)
        setCart(payload.cart)
        setSelectedImage(payload.product.image)
        document.title = `${payload.product.name} | ${payload.store.name}`
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug, productSlug])

  async function add(item: ProductData, amount = 1) {
    try {
      const response = await apiFetch<{ cart: CartData }>(`/api/shops/${slug}/cart/`, { method: 'POST', body: jsonBody({ action: 'add', productId: item.id, quantity: amount }) })
      setCart(response.cart)
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store || !product || !cart) return <div className="storefront-state">{error || 'Loading product…'}</div>
  const gallery = [product.image, ...(product.images?.map((image) => image.url) ?? [])].filter((value, index, list) => value && list.indexOf(value) === index)

  return (
    <StoreLayout store={store} cartCount={cart.count}>
      {error ? <div className="storefront-error">{error}</div> : null}
      <main className="storefront-page">
        <a className="store-back-link" href={`/shop/${slug}/products/`}><ArrowLeft size={14} />Back to products</a>
        <section className="store-product-detail">
          <div className="store-product-gallery">
            <div>{selectedImage ? <img src={selectedImage} alt={product.name} /> : <Package size={40} />}</div>
            {gallery.length > 1 ? <nav>{gallery.map((image) => <button className={image === selectedImage ? 'is-active' : ''} type="button" onClick={() => setSelectedImage(image)} key={image}><img src={image} alt="" /></button>)}</nav> : null}
          </div>
          <div className="store-product-info">
            <span>{product.category || product.brand}</span>
            <h1>{product.name}</h1>
            <div className="store-product-price"><strong>NPR {Number(product.currentPrice).toLocaleString()}</strong>{product.discountedPrice ? <del>NPR {Number(product.regularPrice).toLocaleString()}</del> : null}</div>
            <p>{product.fullDescription || product.shortDescription}</p>
            {product.options?.map((option) => <Field label={option.name} key={option.id}><SelectInput>{option.values.map((value) => <option key={value.id}>{value.value}</option>)}</SelectInput></Field>)}
            <div className="store-product-buy">
              <span><button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus size={14} /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((current) => Math.min(product.stockQuantity, current + 1))}><Plus size={14} /></button></span>
              <button type="button" onClick={() => add(product, quantity)} disabled={!product.isInStock}><ShoppingBag size={16} />{product.isInStock ? 'Add to cart' : 'Out of stock'}</button>
            </div>
            <div className="store-product-facts"><span><BadgeCheck size={16} /><strong>Managed catalogue<small>Verified by the store owner</small></strong></span><span><Truck size={16} /><strong>Delivery available<small>{product.shippingInformation || 'Shipping across Nepal'}</small></strong></span></div>
          </div>
        </section>
        {related.length > 0 ? <section className="storefront-section"><header><div><span>More to explore</span><h2>Related products</h2></div></header><ProductGrid products={related} slug={slug} onAdd={add} /></section> : null}
      </main>
    </StoreLayout>
  )
}

function CartPage() {
  const { slug } = routeData()
  const [store, setStore] = useState<StoreData | null>(null)
  const [cart, setCart] = useState<CartData | null>(null)
  const [coupon, setCoupon] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => Promise.all([
    apiFetch<{ store: StoreData }>(`/api/shops/${slug}/`),
    apiFetch<{ cart: CartData }>(`/api/shops/${slug}/cart/`),
  ]).then(([storePayload, cartPayload]) => {
    setStore(storePayload.store)
    setCart(cartPayload.cart)
  }).catch((reason) => setError(displayError(reason))), [slug])

  useEffect(() => {
    load()
  }, [load])

  async function cartAction(payload: Record<string, string | number | boolean>) {
    setError('')
    try {
      const response = await apiFetch<{ cart: CartData; message?: string }>(`/api/shops/${slug}/cart/`, { method: 'POST', body: jsonBody(payload) })
      setCart(response.cart)
      setMessage(response.message ?? '')
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store || !cart) return <div className="storefront-state">{error || 'Loading cart…'}</div>
  return (
    <StoreLayout store={store} cartCount={cart.count}>
      <main className="storefront-page">
        <header className="storefront-page-header"><span>Your selection</span><h1>Shopping cart</h1><p>{cart.count} items ready for checkout.</p></header>
        {error ? <div className="storefront-error">{error}</div> : null}
        {message ? <div className="storefront-success">{message}</div> : null}
        {cart.items.length === 0 ? <div className="storefront-empty-cart"><ShoppingBag size={35} /><h2>Your cart is empty</h2><p>Browse the store and add products you love.</p><a href={`/shop/${slug}/products/`}>Start shopping</a></div> : (
          <section className="store-cart-layout">
            <div className="store-cart-items">
              {cart.items.map((item) => (
                <article key={item.product.id}>
                  <span>{item.product.image ? <img src={item.product.image} alt="" /> : <Package size={22} />}</span>
                  <div><a href={`/shop/${slug}/product/${item.product.slug}/`}>{item.product.name}</a><small>{item.product.category || item.product.sku}</small><strong>NPR {Number(item.unitPrice).toLocaleString()}</strong></div>
                  <div className="store-cart-quantity"><button type="button" onClick={() => cartAction({ action: 'update', productId: item.product.id, quantity: item.quantity - 1 })}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" onClick={() => cartAction({ action: 'update', productId: item.product.id, quantity: item.quantity + 1 })}><Plus size={13} /></button></div>
                  <strong>NPR {Number(item.lineTotal).toLocaleString()}</strong>
                  <button type="button" onClick={() => cartAction({ action: 'update', productId: item.product.id, quantity: 0 })} aria-label={`Remove ${item.product.name}`}><Trash2 size={14} /></button>
                </article>
              ))}
            </div>
            <aside className="store-order-summary">
              <h2>Order summary</h2>
              <div><span>Subtotal</span><strong>NPR {Number(cart.subtotal).toLocaleString()}</strong></div>
              {Number(cart.discount) > 0 ? <div><span>Discount</span><strong>- NPR {Number(cart.discount).toLocaleString()}</strong></div> : null}
              <div><span>Delivery</span><strong>NPR {Number(cart.deliveryCharge).toLocaleString()}</strong></div>
              <div className="is-total"><span>Total</span><strong>NPR {Number(cart.grandTotal).toLocaleString()}</strong></div>
              <form onSubmit={(event) => { event.preventDefault(); cartAction({ action: 'coupon', coupon }) }}><TextInput value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Coupon code" /><button type="submit">Apply</button></form>
              {cart.couponApplied ? <button className="store-remove-coupon" type="button" onClick={() => cartAction({ action: 'coupon', coupon: '', remove: true })}>Remove {cart.couponCode}</button> : null}
              <a href={`/shop/${slug}/checkout/`}>Proceed to checkout <ArrowRight size={15} /></a>
            </aside>
          </section>
        )}
      </main>
    </StoreLayout>
  )
}

function CheckoutPage() {
  const { slug } = routeData()
  const [store, setStore] = useState<StoreData | null>(null)
  const [cart, setCart] = useState<CartData | null>(null)
  const [payment, setPayment] = useState<{ cashOnDelivery: boolean; manualQr: boolean; bankTransfer: boolean; qrImage: string; bankName: string; bankAccountName: string; bankAccountNumber: string } | null>(null)
  const [values, setValues] = useState({ fullName: '', phone: '', email: '', province: '', city: '', area: '', detailedAddress: '', deliveryInstructions: '', paymentMethod: 'cod', transactionReference: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch<{ store: StoreData; cart: CartData; payment: NonNullable<typeof payment> }>(`/api/shops/${slug}/checkout/`)
      .then((payload) => {
        setStore(payload.store)
        setCart(payload.cart)
        setPayment(payload.payment)
        if (!payload.payment.cashOnDelivery) setValues((current) => ({ ...current, paymentMethod: payload.payment.manualQr ? 'manual_qr' : 'bank_transfer' }))
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await apiFetch<{ order: OrderData }>(`/api/shops/${slug}/checkout/`, { method: 'POST', body: jsonBody(values) })
      window.location.href = `/shop/${slug}/order-success/${response.order.orderNumber}/`
    } catch (reason) {
      setError(displayError(reason))
      setSubmitting(false)
    }
  }

  if (!store || !cart || !payment) return <div className="storefront-state">{error || 'Loading checkout…'}</div>
  if (cart.items.length === 0) return <StoreLayout store={store} cartCount={0}><div className="storefront-empty-cart"><h2>Your cart is empty</h2><a href={`/shop/${slug}/products/`}>Continue shopping</a></div></StoreLayout>
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <StoreLayout store={store} cartCount={cart.count}>
      <main className="storefront-page">
        <header className="storefront-page-header"><span>Secure order</span><h1>Checkout</h1><p>Delivery and payment details for your order.</p></header>
        {error ? <div className="storefront-error">{error}</div> : null}
        <form className="store-checkout-layout" onSubmit={submit}>
          <div className="store-checkout-form">
            <section><h2>Contact information</h2><div className="form-grid"><Field label="Full name"><TextInput value={values.fullName} onChange={(event) => update('fullName', event.target.value)} required /></Field><Field label="Phone"><TextInput value={values.phone} onChange={(event) => update('phone', event.target.value)} required /></Field><Field label="Email" wide><TextInput type="email" value={values.email} onChange={(event) => update('email', event.target.value)} /></Field></div></section>
            <section><h2>Delivery address</h2><div className="form-grid"><Field label="Province"><TextInput value={values.province} onChange={(event) => update('province', event.target.value)} required /></Field><Field label="City"><TextInput value={values.city} onChange={(event) => update('city', event.target.value)} required /></Field><Field label="Area"><TextInput value={values.area} onChange={(event) => update('area', event.target.value)} required /></Field><Field label="Detailed address" wide><TextArea value={values.detailedAddress} onChange={(event) => update('detailedAddress', event.target.value)} required /></Field><Field label="Delivery instructions" wide><TextArea value={values.deliveryInstructions} onChange={(event) => update('deliveryInstructions', event.target.value)} /></Field></div></section>
            <section><h2>Payment method</h2><div className="store-payment-options">{payment.cashOnDelivery ? <label><input type="radio" name="payment" checked={values.paymentMethod === 'cod'} onChange={() => update('paymentMethod', 'cod')} /><span><Truck size={18} /><strong>Cash on delivery<small>Pay when your order arrives</small></strong></span></label> : null}{payment.manualQr ? <label><input type="radio" name="payment" checked={values.paymentMethod === 'manual_qr'} onChange={() => update('paymentMethod', 'manual_qr')} /><span><CreditCard size={18} /><strong>QR payment<small>Pay and submit the reference</small></strong></span></label> : null}{payment.bankTransfer ? <label><input type="radio" name="payment" checked={values.paymentMethod === 'bank_transfer'} onChange={() => update('paymentMethod', 'bank_transfer')} /><span><CreditCard size={18} /><strong>Bank transfer<small>{payment.bankName} · {payment.bankAccountNumber}</small></strong></span></label> : null}</div>{values.paymentMethod !== 'cod' ? <Field label="Transaction reference"><TextInput value={values.transactionReference} onChange={(event) => update('transactionReference', event.target.value)} /></Field> : null}</section>
          </div>
          <aside className="store-order-summary"><h2>Your order</h2>{cart.items.map((item) => <div className="store-checkout-item" key={item.product.id}><span>{item.product.image ? <img src={item.product.image} alt="" /> : <Package size={15} />}<em>{item.quantity}</em></span><strong>{item.product.name}</strong><b>NPR {Number(item.lineTotal).toLocaleString()}</b></div>)}<div><span>Subtotal</span><strong>NPR {Number(cart.subtotal).toLocaleString()}</strong></div><div><span>Delivery</span><strong>NPR {Number(cart.deliveryCharge).toLocaleString()}</strong></div><div className="is-total"><span>Total</span><strong>NPR {Number(cart.grandTotal).toLocaleString()}</strong></div><button className="store-checkout-submit" type="submit" disabled={submitting}><ShieldCheck size={15} />{submitting ? 'Placing order…' : 'Place order'}</button></aside>
        </form>
      </main>
    </StoreLayout>
  )
}

function OrderSuccessPage() {
  const { slug, rest } = routeData()
  const orderNumber = rest.match(/^\/order-success\/([^/]+)/)?.[1] ?? ''
  const [store, setStore] = useState<StoreData | null>(null)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ store: StoreData; order: OrderData }>(`/api/shops/${slug}/orders/${orderNumber}/`)
      .then((payload) => {
        setStore(payload.store)
        setOrder(payload.order)
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug, orderNumber])

  if (!store || !order) return <div className="storefront-state">{error || 'Loading order…'}</div>
  return (
    <StoreLayout store={store} cartCount={0}>
      <main className="storefront-order-success">
        <span><Check size={28} /></span>
        <small>Order confirmed</small>
        <h1>Thank you, {order.customerName}</h1>
        <p>Your order <strong>#{order.orderNumber}</strong> has been placed. Keep the order number and phone for tracking.</p>
        <div><span><strong>Order status</strong>{order.statusLabel}</span><span><strong>Payment</strong>{order.paymentStatusLabel}</span><span><strong>Total</strong>NPR {Number(order.grandTotal).toLocaleString()}</span></div>
        <section>{order.items.map((item) => <article key={item.id}><span>{item.image ? <img src={item.image} alt="" /> : <Package size={18} />}</span><strong>{item.name}<small>Quantity {item.quantity}</small></strong><em>NPR {Number(item.lineTotal).toLocaleString()}</em></article>)}</section>
        <footer><a href={`/shop/${slug}/track-order/?order_number=${order.orderNumber}&phone=${encodeURIComponent(order.customerPhone)}`}>Track order <ArrowRight size={14} /></a><a href={`/shop/${slug}/`}>Continue shopping</a></footer>
      </main>
    </StoreLayout>
  )
}

function TrackOrderPage() {
  const { slug } = routeData()
  const initialOrderNumber = new URLSearchParams(window.location.search).get('order_number') ?? ''
  const initialPhone = new URLSearchParams(window.location.search).get('phone') ?? ''
  const [store, setStore] = useState<StoreData | null>(null)
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber)
  const [phone, setPhone] = useState(initialPhone)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const lookup = useCallback(async (number: string, phoneValue: string) => {
    try {
      const payload = await apiFetch<{ store: StoreData; searched: boolean; order: OrderData | null }>(`/api/shops/${slug}/track-order/${queryString({ order_number: number, phone: phoneValue })}`)
      setStore(payload.store)
      setOrder(payload.order)
      setSearched(payload.searched)
    } catch (reason) {
      setError(displayError(reason))
    }
  }, [slug])

  useEffect(() => {
    lookup(initialOrderNumber, initialPhone)
  }, [initialOrderNumber, initialPhone, lookup])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    await lookup(orderNumber, phone)
  }

  if (!store) return <div className="storefront-state">{error || 'Loading order tracking…'}</div>
  const steps = ['new', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']
  const currentIndex = order ? steps.indexOf(order.status) : -1
  return (
    <StoreLayout store={store} cartCount={0}>
      <main className="storefront-track-page">
        <header><span><Package size={25} /></span><h1>Track your order</h1><p>Enter the order number and checkout phone number.</p></header>
        <form onSubmit={submit}><Field label="Order number"><TextInput value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="STORE-20260728-0001" required /></Field><Field label="Phone number"><TextInput value={phone} onChange={(event) => setPhone(event.target.value)} required /></Field><button type="submit">Track order <ArrowRight size={14} /></button></form>
        {error ? <div className="storefront-error">{error}</div> : null}
        {searched && !order ? <div className="storefront-empty">No matching order was found. Check both values and try again.</div> : null}
        {order ? <section className="store-track-result"><div><small>Order #{order.orderNumber}</small><h2>{order.statusLabel}</h2><p>Placed {new Date(order.createdAt).toLocaleString()} · NPR {Number(order.grandTotal).toLocaleString()}</p></div><ol>{steps.map((step, index) => <li className={index <= currentIndex ? 'is-done' : ''} key={step}><span>{index <= currentIndex ? <Check size={13} /> : <Clock3 size={13} />}</span><strong>{step.replaceAll('_', ' ')}</strong></li>)}</ol><footer><MapPin size={15} /><span><strong>Delivering to</strong>{order.detailedAddress}, {order.city}</span></footer></section> : null}
      </main>
    </StoreLayout>
  )
}

export function StorefrontApp() {
  const { rest } = routeData()
  if (rest.startsWith('/product/')) return <ProductDetailPage />
  if (rest.startsWith('/cart')) return <CartPage />
  if (rest.startsWith('/checkout')) return <CheckoutPage />
  if (rest.startsWith('/order-success/')) return <OrderSuccessPage />
  if (rest.startsWith('/track-order')) return <TrackOrderPage />
  if (rest.startsWith('/products') || rest.startsWith('/category/')) return <StoreProductsPage />
  return <StoreHomePage />
}
