import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import BadgePercent from 'lucide-react/dist/esm/icons/badge-percent.mjs'
import Boxes from 'lucide-react/dist/esm/icons/boxes.mjs'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.mjs'
import CircleDollarSign from 'lucide-react/dist/esm/icons/circle-dollar-sign.mjs'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import Globe from 'lucide-react/dist/esm/icons/globe.mjs'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.mjs'
import Monitor from 'lucide-react/dist/esm/icons/monitor.mjs'
import Package from 'lucide-react/dist/esm/icons/package.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Save from 'lucide-react/dist/esm/icons/save.mjs'
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag.mjs'
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart.mjs'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone.mjs'
import StoreIcon from 'lucide-react/dist/esm/icons/store.mjs'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs'
import Truck from 'lucide-react/dist/esm/icons/truck.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import {
  Field,
  FileInput,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
} from '../../components/manage/FormControls'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './ShopDashboard.css'

type StoreData = {
  id: number
  name: string
  slug: string
  logo: string
  favicon: string
  description: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  primaryColor: string
  secondaryColor: string
  selectedTheme: string
  subdomain: string
  customDomain: string
  subscriptionPlan: string
  subscriptionStatus: string
  isActive: boolean
  isPublished: boolean
  heroTitle: string
  heroSubtitle: string
  heroLabel: string
  heroImage: string
  promoTitle: string
  promoCode: string
  promoImage: string
  websiteConfig: Record<string, unknown>
}

type ShopStats = {
  totalSales: string
  totalOrders: number
  pendingOrders: number
  totalCustomers: number
  productCount: number
  activeProducts: number
  lowStock: number
  outOfStock: number
}

type ProductData = {
  id: number
  name: string
  slug: string
  brand: string
  categoryId: number | null
  category: string
  shortDescription: string
  fullDescription: string
  regularPrice: string
  discountedPrice: string
  currentPrice: string
  costPrice: string
  sku: string
  barcode: string
  stockQuantity: number
  lowStockThreshold: number
  status: string
  isFeatured: boolean
  isTrending: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  isInStock: boolean
  image: string
  videoUrl: string
  weight: string
  shippingInformation: string
  seoTitle: string
  seoDescription: string
  updatedAt: string
}

type CategoryData = {
  id: number
  name: string
  slug: string
  image: string
  parentId: number | null
  displayOrder: number
  isActive: boolean
  productCount: number
}

type OrderData = {
  id: number
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
  grandTotal: string
  createdAt: string
  detailedAddress?: string
  internalNotes?: string
  items?: Array<{ id: number; name: string; quantity: number; lineTotal: string; image: string }>
}

type DiscountData = {
  id: number
  name: string
  code: string
  discountType: string
  value: string
  minimumOrderAmount: string
  startsAt: string
  endsAt: string
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  status: string
}

function storeSlug() {
  return decodeURIComponent(window.location.pathname.match(/^\/shop\/([^/]+)/)?.[1] ?? '')
}

function ownerBase() {
  return `/shop/${storeSlug()}/owner`
}

function shopNav() {
  const base = ownerBase()
  const path = window.location.pathname
  return [
    { label: 'Overview', href: `${base}/`, icon: LayoutDashboard, active: path === `${base}/` || path === base },
    { label: 'Orders', href: `${base}/orders/`, icon: ShoppingCart, active: path.includes('/orders') },
    { label: 'Products', href: `${base}/products/`, icon: Package, active: path.includes('/products') },
    { label: 'Categories', href: `${base}/categories/`, icon: Boxes, active: path.includes('/categories') },
    { label: 'Customers', href: `${base}/customers/`, icon: Users, active: path.includes('/customers') },
    { label: 'Discounts', href: `${base}/discounts/`, icon: BadgePercent, active: path.includes('/discounts') },
    { label: 'Website editor', href: `${base}/website/`, icon: Globe, active: path.includes('/website') },
  ]
}

function ShopShell({
  store,
  title,
  subtitle,
  actions,
  children,
}: {
  store: StoreData
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <ManageShell
      brand={store.name}
      brandDetail={`${store.subscriptionPlan} commerce`}
      logo={store.logo}
      nav={shopNav()}
      title={title}
      subtitle={subtitle}
      userName={store.name}
      userRole="Store owner"
      accent={store.primaryColor}
      actions={actions}
    >
      {children}
    </ManageShell>
  )
}

function ShopState({ message }: { message: string }) {
  return <div className="manage-state">{message}</div>
}

function ShopMetric({
  label,
  value,
  icon,
  note,
}: {
  label: string
  value: string | number
  icon: ReactNode
  note?: string
}) {
  return (
    <article className="shop-metric manage-card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong>{note ? <em>{note}</em> : null}</div>
    </article>
  )
}

export function ShopOverviewPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [stats, setStats] = useState<ShopStats | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ store: StoreData; stats: ShopStats; recentOrders: OrderData[]; lowStockProducts: ProductData[] }>(`/api/shops/${slug}/owner/`)
      .then((payload) => {
        setStore(payload.store)
        setStats(payload.stats)
        setOrders(payload.recentOrders)
        setProducts(payload.lowStockProducts)
        document.title = `${payload.store.name} Dashboard | Tap2Connect`
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug])

  if (!store || !stats) return <ShopState message={error || 'Loading shop dashboard…'} />

  return (
    <ShopShell
      store={store}
      title="Store Overview"
      subtitle={`${store.isPublished ? 'Published' : 'Draft'} · ${store.subscriptionStatus} subscription`}
      actions={<a className="manage-button" href={`/shop/${slug}/`} target="_blank" rel="noreferrer"><Eye size={14} />View store</a>}
    >
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      <section className="shop-overview-banner manage-card">
        <div><span><StoreIcon size={20} /></span><div><h2>{store.name}</h2><p>{store.description || 'Add a store description in the website editor.'}</p></div></div>
        <a className="manage-button is-primary" href={`${ownerBase()}/website/`}><Globe size={14} />Edit storefront</a>
      </section>
      <section className="shop-metrics">
        <ShopMetric label="Total sales" value={`NPR ${Number(stats.totalSales).toLocaleString()}`} icon={<CircleDollarSign size={18} />} />
        <ShopMetric label="Orders" value={stats.totalOrders} icon={<ShoppingCart size={18} />} note={`${stats.pendingOrders} need attention`} />
        <ShopMetric label="Customers" value={stats.totalCustomers} icon={<Users size={18} />} />
        <ShopMetric label="Products" value={stats.productCount} icon={<Package size={18} />} note={`${stats.activeProducts} active`} />
      </section>
      <section className="shop-overview-grid">
        <article className="manage-card shop-overview-list">
          <header><div><h2>Recent orders</h2><p>Latest purchases across the store</p></div><a href={`${ownerBase()}/orders/`}>View all <ChevronRight size={13} /></a></header>
          {orders.length === 0 ? <div className="shop-empty">Orders appear after customers complete checkout.</div> : orders.map((order) => (
            <a href={`${ownerBase()}/orders/`} key={order.id}><span><ShoppingBag size={14} /></span><strong>#{order.orderNumber}<small>{order.customerName} · {order.statusLabel}</small></strong><em>NPR {Number(order.grandTotal).toLocaleString()}</em></a>
          ))}
        </article>
        <article className="manage-card shop-overview-list">
          <header><div><h2>Inventory alerts</h2><p>Low and out-of-stock products</p></div><a href={`${ownerBase()}/products/`}>Products <ChevronRight size={13} /></a></header>
          {products.length === 0 ? <div className="shop-empty">Stock levels look healthy.</div> : products.map((product) => (
            <a href={`${ownerBase()}/products/`} key={product.id}><span>{product.image ? <img src={product.image} alt="" /> : <Package size={14} />}</span><strong>{product.name}<small>{product.sku || product.category}</small></strong><em className={product.stockQuantity === 0 ? 'is-danger' : ''}>{product.stockQuantity} left</em></a>
          ))}
        </article>
      </section>
    </ShopShell>
  )
}

const emptyProduct = {
  name: '',
  slug: '',
  brand: '',
  categoryId: '',
  shortDescription: '',
  fullDescription: '',
  regularPrice: '',
  discountedPrice: '',
  costPrice: '',
  sku: '',
  barcode: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  status: 'draft',
  isFeatured: false,
  isTrending: false,
  isNewArrival: false,
  isBestSeller: false,
  image: '',
  videoUrl: '',
  weight: '',
  shippingInformation: '',
  seoTitle: '',
  seoDescription: '',
}

type ProductFormValues = typeof emptyProduct

function productFormValues(product?: ProductData | null): ProductFormValues {
  if (!product) return { ...emptyProduct }
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    categoryId: String(product.categoryId ?? ''),
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    regularPrice: product.regularPrice,
    discountedPrice: product.discountedPrice,
    costPrice: product.costPrice,
    sku: product.sku,
    barcode: product.barcode,
    stockQuantity: String(product.stockQuantity),
    lowStockThreshold: String(product.lowStockThreshold),
    status: product.status,
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    image: product.image,
    videoUrl: product.videoUrl,
    weight: product.weight,
    shippingInformation: product.shippingInformation,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  }
}

function ProductEditor({
  product,
  categories,
  onSaved,
  onClose,
}: {
  product?: ProductData | null
  categories: CategoryData[]
  onSaved: () => void
  onClose: () => void
}) {
  const slug = storeSlug()
  const [values, setValues] = useState<ProductFormValues>(() => productFormValues(product))
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update<Key extends keyof ProductFormValues>(key: Key, value: ProductFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const body = new FormData()
    Object.entries(values).forEach(([key, value]) => body.append(key, String(value)))
    images.forEach((image) => body.append('images', image))
    const endpoint = product
      ? `/api/shops/${slug}/owner/products/${product.id}/`
      : `/api/shops/${slug}/owner/products/`
    try {
      await apiFetch(endpoint, { method: 'POST', body })
      onSaved()
    } catch (reason) {
      setError(displayError(reason))
      setSaving(false)
    }
  }

  return (
    <div className="shop-modal">
      <button className="shop-modal-backdrop" type="button" onClick={onClose} aria-label="Close product editor" />
      <form className="shop-editor-drawer" onSubmit={save}>
        <header><div><h2>{product ? 'Edit product' : 'Add product'}</h2><p>Catalogue, pricing, inventory, and publishing details.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
        {error ? <div className="manage-alert">{error}</div> : null}
        <FormSection title="Product identity">
          <div className="form-grid">
            <Field label="Product name"><TextInput value={values.name} onChange={(event) => update('name', event.target.value)} required /></Field>
            <Field label="URL slug"><TextInput value={values.slug} onChange={(event) => update('slug', event.target.value)} placeholder="generated-from-name" /></Field>
            <Field label="Brand"><TextInput value={values.brand} onChange={(event) => update('brand', event.target.value)} /></Field>
            <Field label="Category"><SelectInput value={values.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectInput></Field>
            <Field label="Short description" wide><TextInput value={values.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} /></Field>
            <Field label="Full description" wide><TextArea value={values.fullDescription} onChange={(event) => update('fullDescription', event.target.value)} /></Field>
          </div>
        </FormSection>
        <FormSection title="Pricing and inventory">
          <div className="form-grid is-three">
            <Field label="Regular price"><TextInput type="number" min="0" step="0.01" value={values.regularPrice} onChange={(event) => update('regularPrice', event.target.value)} required /></Field>
            <Field label="Discounted price"><TextInput type="number" min="0" step="0.01" value={values.discountedPrice} onChange={(event) => update('discountedPrice', event.target.value)} /></Field>
            <Field label="Cost price"><TextInput type="number" min="0" step="0.01" value={values.costPrice} onChange={(event) => update('costPrice', event.target.value)} /></Field>
            <Field label="SKU"><TextInput value={values.sku} onChange={(event) => update('sku', event.target.value)} /></Field>
            <Field label="Barcode"><TextInput value={values.barcode} onChange={(event) => update('barcode', event.target.value)} /></Field>
            <Field label="Stock quantity"><TextInput type="number" min="0" value={values.stockQuantity} onChange={(event) => update('stockQuantity', event.target.value)} /></Field>
            <Field label="Low stock alert"><TextInput type="number" min="0" value={values.lowStockThreshold} onChange={(event) => update('lowStockThreshold', event.target.value)} /></Field>
            <Field label="Status"><SelectInput value={values.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></SelectInput></Field>
          </div>
        </FormSection>
        <FormSection title="Product media">
          <FileInput label="Product images" currentUrl={product?.image} accept="image/*" onChange={(file) => setImages(file ? [file] : [])} />
          <div className="form-grid shop-media-fields">
            <Field label="Existing image/static path"><TextInput value={values.image} onChange={(event) => update('image', event.target.value)} /></Field>
            <Field label="Video URL"><TextInput type="url" value={values.videoUrl} onChange={(event) => update('videoUrl', event.target.value)} /></Field>
          </div>
        </FormSection>
        <FormSection title="Store collections">
          <div className="form-grid">
            <Toggle label="Featured" checked={values.isFeatured} onChange={(checked) => update('isFeatured', checked)} />
            <Toggle label="Trending" checked={values.isTrending} onChange={(checked) => update('isTrending', checked)} />
            <Toggle label="New arrival" checked={values.isNewArrival} onChange={(checked) => update('isNewArrival', checked)} />
            <Toggle label="Best seller" checked={values.isBestSeller} onChange={(checked) => update('isBestSeller', checked)} />
          </div>
        </FormSection>
        <FormSection title="Shipping and SEO">
          <div className="form-grid">
            <Field label="Weight"><TextInput type="number" min="0" step="0.01" value={values.weight} onChange={(event) => update('weight', event.target.value)} /></Field>
            <Field label="SEO title"><TextInput value={values.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} /></Field>
            <Field label="Shipping information" wide><TextArea value={values.shippingInformation} onChange={(event) => update('shippingInformation', event.target.value)} /></Field>
            <Field label="SEO description" wide><TextArea value={values.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} /></Field>
          </div>
        </FormSection>
        <footer><button className="manage-button" type="button" onClick={onClose}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save product'}</button></footer>
      </form>
    </div>
  )
}

export function ShopProductsPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [stats, setStats] = useState<ShopStats | null>(null)
  const [products, setProducts] = useState<ProductData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [editor, setEditor] = useState<ProductData | null | 'new'>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => apiFetch<{ store: StoreData; stats: ShopStats; products: ProductData[]; categories: CategoryData[] }>(`/api/shops/${slug}/owner/products/`)
    .then((payload) => {
      setStore(payload.store)
      setStats(payload.stats)
      setProducts(payload.products)
      setCategories(payload.categories)
    })
    .catch((reason) => setError(displayError(reason))), [slug])

  useEffect(() => {
    load()
    document.title = 'Products | Tap2Connect Commerce'
  }, [load])

  async function remove(product: ProductData) {
    if (!window.confirm(`Delete ${product.name}?`)) return
    try {
      await apiFetch(`/api/shops/${slug}/owner/products/${product.id}/`, { method: 'DELETE' })
      setProducts((current) => current.filter((item) => item.id !== product.id))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store || !stats) return <ShopState message={error || 'Loading products…'} />
  const filtered = products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <ShopShell store={store} title="Products" subtitle={`${stats.activeProducts} active of ${stats.productCount} products`} actions={<button className="manage-button is-primary" type="button" onClick={() => setEditor('new')}><Plus size={14} />Add product</button>}>
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      <section className="shop-metrics is-five">
        <ShopMetric label="All products" value={stats.productCount} icon={<Package size={17} />} />
        <ShopMetric label="Active" value={stats.activeProducts} icon={<Eye size={17} />} />
        <ShopMetric label="Low stock" value={stats.lowStock} icon={<Boxes size={17} />} />
        <ShopMetric label="Out of stock" value={stats.outOfStock} icon={<Truck size={17} />} />
      </section>
      <section className="shop-search-bar manage-card"><label><SearchIcon /> <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, or category" /></label><span>{filtered.length} products</span></section>
      <section className="shop-table-wrap manage-card">
        {filtered.length === 0 ? <div className="shop-empty">No products match this search.</div> : (
          <table className="shop-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>{filtered.map((product) => (
              <tr key={product.id}>
                <td><div className="shop-product-cell"><span>{product.image ? <img src={product.image} alt="" /> : <Package size={15} />}</span><strong>{product.name}<small>{product.sku || product.slug}</small></strong></div></td>
                <td>{product.category || 'Uncategorized'}</td>
                <td>NPR {Number(product.currentPrice).toLocaleString()}</td>
                <td><strong className={product.stockQuantity <= product.lowStockThreshold ? 'shop-stock-warning' : ''}>{product.stockQuantity}</strong></td>
                <td><span className={`shop-status is-${product.status}`}>{product.status}</span></td>
                <td><div className="shop-row-actions"><button type="button" onClick={() => setEditor(product)} title="Edit"><Edit3 size={14} /></button><button type="button" onClick={() => remove(product)} title="Delete"><Trash2 size={14} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {editor ? <ProductEditor product={editor === 'new' ? null : editor} categories={categories} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load() }} /> : null}
    </ShopShell>
  )
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
}

export function ShopCategoriesPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [editing, setEditing] = useState<CategoryData | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [values, setValues] = useState({ name: '', slug: '', parentId: '', image: '', displayOrder: '0', isActive: true })
  const [error, setError] = useState('')

  const load = useCallback(() => apiFetch<{ store: StoreData; categories: CategoryData[] }>(`/api/shops/${slug}/owner/categories/`)
    .then((payload) => {
      setStore(payload.store)
      setCategories(payload.categories)
    })
    .catch((reason) => setError(displayError(reason))), [slug])

  useEffect(() => {
    load()
  }, [load])

  function openForm(category?: CategoryData) {
    setEditing(category ?? null)
    setValues(category ? {
      name: category.name,
      slug: category.slug,
      parentId: String(category.parentId ?? ''),
      image: category.image,
      displayOrder: String(category.displayOrder),
      isActive: category.isActive,
    } : { name: '', slug: '', parentId: '', image: '', displayOrder: '0', isActive: true })
    setFormOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await apiFetch(editing ? `/api/shops/${slug}/owner/categories/${editing.id}/` : `/api/shops/${slug}/owner/categories/`, {
        method: 'POST',
        body: jsonBody(values),
      })
      setFormOpen(false)
      await load()
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  async function remove(category: CategoryData) {
    if (!window.confirm(`Delete ${category.name}? Products become uncategorized.`)) return
    try {
      await apiFetch(`/api/shops/${slug}/owner/categories/${category.id}/`, { method: 'DELETE' })
      setCategories((current) => current.filter((item) => item.id !== category.id))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store) return <ShopState message={error || 'Loading categories…'} />
  return (
    <ShopShell store={store} title="Categories" subtitle={`${categories.length} catalogue groups`} actions={<button className="manage-button is-primary" type="button" onClick={() => openForm()}><Plus size={14} />Add category</button>}>
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      {formOpen ? (
        <form className="shop-inline-editor manage-card" onSubmit={save}>
          <header><h2>{editing ? 'Edit category' : 'New category'}</h2><button type="button" onClick={() => setFormOpen(false)}><X size={15} /></button></header>
          <div className="form-grid is-three">
            <Field label="Name"><TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="Slug"><TextInput value={values.slug} onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))} /></Field>
            <Field label="Parent category"><SelectInput value={values.parentId} onChange={(event) => setValues((current) => ({ ...current, parentId: event.target.value }))}><option value="">Top level</option>{categories.filter((category) => category.id !== editing?.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectInput></Field>
            <Field label="Image path or URL"><TextInput value={values.image} onChange={(event) => setValues((current) => ({ ...current, image: event.target.value }))} /></Field>
            <Field label="Display order"><TextInput type="number" min="0" value={values.displayOrder} onChange={(event) => setValues((current) => ({ ...current, displayOrder: event.target.value }))} /></Field>
            <Toggle label="Visible on store" checked={values.isActive} onChange={(checked) => setValues((current) => ({ ...current, isActive: checked }))} />
          </div>
          <footer><button className="manage-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="manage-button is-primary" type="submit"><Save size={14} />Save category</button></footer>
        </form>
      ) : null}
      <section className="shop-category-grid">
        {categories.map((category) => (
          <article className="manage-card shop-category-card" key={category.id}>
            <span>{category.image ? <img src={category.image} alt="" /> : <Boxes size={18} />}</span>
            <div><h2>{category.name}</h2><p>{category.parentId ? 'Subcategory' : 'Parent category'} · {category.productCount} products</p></div>
            <em className={`shop-status${category.isActive ? ' is-active' : ' is-archived'}`}>{category.isActive ? 'active' : 'hidden'}</em>
            <button type="button" onClick={() => openForm(category)} title="Edit"><Edit3 size={14} /></button>
            <button type="button" onClick={() => remove(category)} title="Delete"><Trash2 size={14} /></button>
          </article>
        ))}
      </section>
    </ShopShell>
  )
}

export function ShopOrdersPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [statuses, setStatuses] = useState<Array<{ value: string; label: string }>>([])
  const [paymentStatuses, setPaymentStatuses] = useState<Array<{ value: string; label: string }>>([])
  const [selected, setSelected] = useState<OrderData | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => apiFetch<{ store: StoreData; orders: OrderData[]; statusOptions: Array<{ value: string; label: string }>; paymentStatusOptions: Array<{ value: string; label: string }> }>(`/api/shops/${slug}/owner/orders/${filter ? `?status=${filter}` : ''}`)
    .then((payload) => {
      setStore(payload.store)
      setOrders(payload.orders)
      setStatuses(payload.statusOptions)
      setPaymentStatuses(payload.paymentStatusOptions)
      setSelected((current) => current ? payload.orders.find((item) => item.id === current.id) ?? null : null)
    })
    .catch((reason) => setError(displayError(reason))), [filter, slug])

  useEffect(() => {
    load()
  }, [load])

  async function updateOrder(order: OrderData, changes: Record<string, string>) {
    try {
      await apiFetch(`/api/shops/${slug}/owner/orders/${order.id}/`, { method: 'POST', body: jsonBody(changes) })
      await load()
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store) return <ShopState message={error || 'Loading orders…'} />
  return (
    <ShopShell store={store} title="Orders" subtitle={`${orders.length} matching orders`}>
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      <section className="shop-order-tabs manage-card">
        <button className={!filter ? 'is-active' : ''} type="button" onClick={() => setFilter('')}>All</button>
        {statuses.map((status) => <button className={filter === status.value ? 'is-active' : ''} type="button" key={status.value} onClick={() => setFilter(status.value)}>{status.label}</button>)}
      </section>
      <section className="shop-table-wrap manage-card">
        {orders.length === 0 ? <div className="shop-empty">No orders in this status.</div> : (
          <table className="shop-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Fulfilment</th><th aria-label="Details" /></tr></thead>
            <tbody>{orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></td>
                <td><strong>{order.customerName}</strong><small>{order.customerPhone}</small></td>
                <td>NPR {Number(order.grandTotal).toLocaleString()}</td>
                <td><SelectInput value={order.paymentStatus} onChange={(event) => updateOrder(order, { paymentStatus: event.target.value })}>{paymentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</SelectInput></td>
                <td><SelectInput value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</SelectInput></td>
                <td><button className="shop-detail-button" type="button" onClick={() => setSelected(order)}><Eye size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {selected ? (
        <div className="shop-modal">
          <button className="shop-modal-backdrop" type="button" onClick={() => setSelected(null)} aria-label="Close order details" />
          <aside className="shop-order-drawer">
            <header><div><h2>#{selected.orderNumber}</h2><p>{selected.customerName} · {selected.customerPhone}</p></div><button type="button" onClick={() => setSelected(null)}><X size={17} /></button></header>
            <section><h3>Delivery</h3><p>{selected.detailedAddress}, {selected.city}</p></section>
            <section><h3>Items</h3>{selected.items?.map((item) => <div className="shop-order-item" key={item.id}><span>{item.image ? <img src={item.image} alt="" /> : <Package size={14} />}</span><strong>{item.name}<small>Quantity: {item.quantity}</small></strong><em>NPR {Number(item.lineTotal).toLocaleString()}</em></div>)}</section>
            <section><h3>Order total</h3><strong className="shop-order-total">NPR {Number(selected.grandTotal).toLocaleString()}</strong></section>
            <Field label="Internal notes"><TextArea defaultValue={selected.internalNotes} onBlur={(event) => updateOrder(selected, { internalNotes: event.target.value })} /></Field>
          </aside>
        </div>
      ) : null}
    </ShopShell>
  )
}

export function ShopCustomersPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [customers, setCustomers] = useState<Array<{ id: number; fullName: string; phone: string; email: string; orderCount: number; totalSpent: string; createdAt: string }>>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ store: StoreData; customers: typeof customers }>(`/api/shops/${slug}/owner/customers/`)
      .then((payload) => {
        setStore(payload.store)
        setCustomers(payload.customers)
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug])

  if (!store) return <ShopState message={error || 'Loading customers…'} />
  const revenue = customers.reduce((total, customer) => total + Number(customer.totalSpent), 0)
  return (
    <ShopShell store={store} title="Customers" subtitle={`${customers.length} customer profiles`}>
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      <section className="shop-metrics">
        <ShopMetric label="Customers" value={customers.length} icon={<Users size={17} />} />
        <ShopMetric label="Returning customers" value={customers.filter((item) => item.orderCount > 1).length} icon={<ShoppingBag size={17} />} />
        <ShopMetric label="Customer revenue" value={`NPR ${revenue.toLocaleString()}`} icon={<CircleDollarSign size={17} />} />
      </section>
      <section className="shop-table-wrap manage-card">
        {customers.length === 0 ? <div className="shop-empty">Customers appear after checkout.</div> : (
          <table className="shop-table"><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Joined</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><strong>{customer.fullName}</strong><small>{customer.email || 'No email'}</small></td><td>{customer.phone}</td><td>{customer.orderCount}</td><td>NPR {Number(customer.totalSpent).toLocaleString()}</td><td>{new Date(customer.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
        )}
      </section>
    </ShopShell>
  )
}

export function ShopDiscountsPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [discounts, setDiscounts] = useState<DiscountData[]>([])
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [editing, setEditing] = useState<DiscountData | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [values, setValues] = useState({ name: '', code: '', discountType: 'percentage', value: '0', minimumOrderAmount: '', startsAt: '', endsAt: '', usageLimit: '', isActive: true })
  const [error, setError] = useState('')

  const load = useCallback(() => apiFetch<{ store: StoreData; discounts: DiscountData[]; typeOptions: Array<{ value: string; label: string }> }>(`/api/shops/${slug}/owner/discounts/`)
    .then((payload) => {
      setStore(payload.store)
      setDiscounts(payload.discounts)
      setTypeOptions(payload.typeOptions)
    })
    .catch((reason) => setError(displayError(reason))), [slug])

  useEffect(() => {
    load()
  }, [load])

  function openForm(discount?: DiscountData) {
    setEditing(discount ?? null)
    setValues(discount ? {
      name: discount.name,
      code: discount.code,
      discountType: discount.discountType,
      value: discount.value,
      minimumOrderAmount: discount.minimumOrderAmount,
      startsAt: discount.startsAt ? discount.startsAt.slice(0, 16) : '',
      endsAt: discount.endsAt ? discount.endsAt.slice(0, 16) : '',
      usageLimit: String(discount.usageLimit ?? ''),
      isActive: discount.isActive,
    } : { name: '', code: '', discountType: 'percentage', value: '0', minimumOrderAmount: '', startsAt: '', endsAt: '', usageLimit: '', isActive: true })
    setFormOpen(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await apiFetch(editing ? `/api/shops/${slug}/owner/discounts/${editing.id}/` : `/api/shops/${slug}/owner/discounts/`, { method: 'POST', body: jsonBody(values) })
      setFormOpen(false)
      await load()
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  async function remove(discount: DiscountData) {
    if (!window.confirm(`Delete discount ${discount.code}?`)) return
    try {
      await apiFetch(`/api/shops/${slug}/owner/discounts/${discount.id}/`, { method: 'DELETE' })
      setDiscounts((current) => current.filter((item) => item.id !== discount.id))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!store) return <ShopState message={error || 'Loading discounts…'} />
  return (
    <ShopShell store={store} title="Discounts" subtitle={`${discounts.filter((item) => item.status === 'active').length} active promotions`} actions={<button className="manage-button is-primary" type="button" onClick={() => openForm()}><Plus size={14} />Create discount</button>}>
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      {formOpen ? (
        <form className="shop-inline-editor manage-card" onSubmit={save}>
          <header><h2>{editing ? 'Edit discount' : 'Create discount'}</h2><button type="button" onClick={() => setFormOpen(false)}><X size={15} /></button></header>
          <div className="form-grid is-three">
            <Field label="Name"><TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="Code"><TextInput value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required /></Field>
            <Field label="Discount type"><SelectInput value={values.discountType} onChange={(event) => setValues((current) => ({ ...current, discountType: event.target.value }))}>{typeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</SelectInput></Field>
            <Field label="Value"><TextInput type="number" min="0" step="0.01" value={values.value} onChange={(event) => setValues((current) => ({ ...current, value: event.target.value }))} /></Field>
            <Field label="Minimum order"><TextInput type="number" min="0" step="0.01" value={values.minimumOrderAmount} onChange={(event) => setValues((current) => ({ ...current, minimumOrderAmount: event.target.value }))} /></Field>
            <Field label="Usage limit"><TextInput type="number" min="0" value={values.usageLimit} onChange={(event) => setValues((current) => ({ ...current, usageLimit: event.target.value }))} /></Field>
            <Field label="Starts at"><TextInput type="datetime-local" value={values.startsAt} onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))} /></Field>
            <Field label="Ends at"><TextInput type="datetime-local" value={values.endsAt} onChange={(event) => setValues((current) => ({ ...current, endsAt: event.target.value }))} /></Field>
            <Toggle label="Discount active" checked={values.isActive} onChange={(checked) => setValues((current) => ({ ...current, isActive: checked }))} />
          </div>
          <footer><button className="manage-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="manage-button is-primary" type="submit"><Save size={14} />Save discount</button></footer>
        </form>
      ) : null}
      <section className="shop-discount-grid">
        {discounts.length === 0 ? <div className="shop-empty manage-card">Create a discount code or automatic offer.</div> : discounts.map((discount) => (
          <article className="manage-card shop-discount-card" key={discount.id}>
            <span><BadgePercent size={19} /></span>
            <div><h2>{discount.name}</h2><code>{discount.code}</code><p>{discount.discountType.replace('_', ' ')} · {discount.value}{discount.discountType === 'percentage' ? '%' : ''} · {discount.usageCount} uses</p></div>
            <em className={`shop-status is-${discount.status}`}>{discount.status}</em>
            <button type="button" onClick={() => openForm(discount)}><Edit3 size={14} /></button>
            <button type="button" onClick={() => remove(discount)}><Trash2 size={14} /></button>
          </article>
        ))}
      </section>
    </ShopShell>
  )
}

export function ShopWebsiteEditorPage() {
  const slug = storeSlug()
  const [store, setStore] = useState<StoreData | null>(null)
  const [values, setValues] = useState<StoreData | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ store: StoreData }>(`/api/shops/${slug}/owner/website/`)
      .then((payload) => {
        setStore(payload.store)
        setValues(payload.store)
      })
      .catch((reason) => setError(displayError(reason)))
  }, [slug])

  function update<Key extends keyof StoreData>(key: Key, value: StoreData[Key]) {
    setValues((current) => current ? { ...current, [key]: value } : current)
    setSuccess('')
  }

  async function save() {
    if (!values) return
    setSaving(true)
    setError('')
    try {
      const response = await apiFetch<{ store: StoreData }>(`/api/shops/${slug}/owner/website/`, { method: 'POST', body: jsonBody(values) })
      setStore(response.store)
      setValues(response.store)
      setSuccess('Storefront saved.')
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (!store || !values) return <ShopState message={error || 'Loading website editor…'} />

  return (
    <ShopShell
      store={store}
      title="Website Editor"
      subtitle="Brand, homepage content, and publishing"
      actions={<><a className="manage-button" href={`/shop/${slug}/`} target="_blank" rel="noreferrer"><Eye size={14} />Open store</a><button className="manage-button is-primary" type="button" onClick={save} disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save'}</button></>}
    >
      {error ? <div className="manage-alert shop-message">{error}</div> : null}
      {success ? <div className="manage-alert is-success shop-message">{success}</div> : null}
      <section className="shop-website-layout">
        <aside className="shop-website-controls manage-card">
          <FormSection title="Store identity">
            <div className="form-grid">
              <Field label="Store name"><TextInput value={values.name} onChange={(event) => update('name', event.target.value)} /></Field>
              <Field label="Description" wide><TextArea value={values.description} onChange={(event) => update('description', event.target.value)} /></Field>
              <Field label="Phone"><TextInput value={values.phone} onChange={(event) => update('phone', event.target.value)} /></Field>
              <Field label="Email"><TextInput type="email" value={values.email} onChange={(event) => update('email', event.target.value)} /></Field>
              <Field label="Address"><TextInput value={values.address} onChange={(event) => update('address', event.target.value)} /></Field>
              <Field label="City"><TextInput value={values.city} onChange={(event) => update('city', event.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="Brand style">
            <div className="form-grid">
              <Field label="Primary color"><TextInput type="color" value={values.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} /></Field>
              <Field label="Secondary color"><TextInput type="color" value={values.secondaryColor} onChange={(event) => update('secondaryColor', event.target.value)} /></Field>
              <Field label="Theme"><SelectInput value={values.selectedTheme} onChange={(event) => update('selectedTheme', event.target.value)}><option value="urban">Urban</option><option value="minimal">Minimal</option><option value="classic">Classic</option></SelectInput></Field>
              <Toggle label="Store published" checked={values.isPublished} onChange={(checked) => update('isPublished', checked)} />
            </div>
          </FormSection>
          <FormSection title="Hero banner">
            <div className="form-grid">
              <Field label="Label"><TextInput value={values.heroLabel} onChange={(event) => update('heroLabel', event.target.value)} /></Field>
              <Field label="Heading"><TextInput value={values.heroTitle} onChange={(event) => update('heroTitle', event.target.value)} /></Field>
              <Field label="Description" wide><TextArea value={values.heroSubtitle} onChange={(event) => update('heroSubtitle', event.target.value)} /></Field>
              <Field label="Image path / URL" wide><TextInput value={values.heroImage} onChange={(event) => update('heroImage', event.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="Promotion">
            <div className="form-grid">
              <Field label="Promotion title"><TextInput value={values.promoTitle} onChange={(event) => update('promoTitle', event.target.value)} /></Field>
              <Field label="Code"><TextInput value={values.promoCode} onChange={(event) => update('promoCode', event.target.value.toUpperCase())} /></Field>
              <Field label="Image path / URL" wide><TextInput value={values.promoImage} onChange={(event) => update('promoImage', event.target.value)} /></Field>
            </div>
          </FormSection>
        </aside>
        <section className="shop-live-preview">
          <header><strong><Eye size={14} />Live preview</strong><div><button className={device === 'desktop' ? 'is-active' : ''} type="button" onClick={() => setDevice('desktop')} title="Desktop preview"><Monitor size={15} /></button><button className={device === 'mobile' ? 'is-active' : ''} type="button" onClick={() => setDevice('mobile')} title="Mobile preview"><Smartphone size={15} /></button></div></header>
          <div className={`shop-preview-frame is-${device}`}>
            <div className="shop-preview-store" style={{ '--preview-primary': values.primaryColor, '--preview-secondary': values.secondaryColor } as React.CSSProperties}>
              <nav><strong>{values.name}</strong><span>Home&nbsp;&nbsp; Shop&nbsp;&nbsp; Collections</span><ShoppingBag size={15} /></nav>
              <section style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.12)), url("${values.heroImage}")` }}>
                <small>{values.heroLabel}</small><h2>{values.heroTitle}</h2><p>{values.heroSubtitle}</p><button>Shop now</button>
              </section>
              <div className="shop-preview-products"><header><strong>Trending now</strong><span>View all</span></header><div>{['watch.jpg', 'bag.jpg', 'shoes.jpg'].map((image, index) => <article key={image}><img src={`/static/shop/images/${image}`} alt="" /><small>Collection</small><strong>{['Classic Watch', 'Leather Handbag', 'White Sneakers'][index]}</strong><em>NPR {['3,999', '2,499', '5,899'][index]}</em></article>)}</div></div>
            </div>
          </div>
        </section>
      </section>
    </ShopShell>
  )
}

export function ShopDashboardRouter() {
  const path = window.location.pathname
  if (path.includes('/owner/products')) return <ShopProductsPage />
  if (path.includes('/owner/categories')) return <ShopCategoriesPage />
  if (path.includes('/owner/orders')) return <ShopOrdersPage />
  if (path.includes('/owner/customers')) return <ShopCustomersPage />
  if (path.includes('/owner/discounts')) return <ShopDiscountsPage />
  if (path.includes('/owner/website')) return <ShopWebsiteEditorPage />
  return <ShopOverviewPage />
}
