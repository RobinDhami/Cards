import type {
  BackgroundSettings,
  CardDesignId,
  CardDocument,
  CardSide,
  CardTemplateRecord,
  EditorElement,
  ElementStyle,
  DecorationType,
  IconType,
  ProfileFields,
  QrOptions,
  ShapeType,
} from './types'

export const CARD_WIDTH = 900
export const CARD_HEIGHT = 500
export const SAFE_MARGIN = 30
export const BLEED_SIZE = 20

export const SAMPLE_PROFILE_FIELDS: ProfileFields = {
  full_name: 'Aarav Sharma',
  job_title: 'Founder',
  company: 'Tap2Connect Nepal',
  phone: '+977 980-1234567',
  email: 'hello@tap2connectnepal.com',
  website: 'https://tap2connectnepal.com',
  address: 'Kathmandu, Nepal',
  connection_id: 'T2C-00001',
  social_username: '@tap2connect',
  profile_photo: '',
  company_logo: '/static/branding/tap2connect-logo-optimized.webp',
  qr_code: 'https://tap2connectnepal.com',
}

export const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Georgia',
  'Montserrat',
  'Poppins',
  'Roboto',
  'Times New Roman',
]

export const BRAND_COLORS = [
  '#ffffff',
  '#111111',
  '#2563eb',
  '#0b2b6b',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#94a3b8',
]

const baseStyle = (fill = '#111111'): ElementStyle => ({
  fillType: fill === 'transparent' ? 'transparent' : 'solid',
  fill,
  stroke: 'transparent',
  strokeWidth: 0,
  borderStyle: 'solid',
  cornerRadius: 0,
  gradient: { from: fill === 'transparent' ? '#ffffff' : fill, to: '#2563eb', angle: 135 },
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOpacity: 0,
  blur: 0,
})

const textStyle = (
  fill: string,
  fontSize: number,
  fontWeight = 500,
  align: ElementStyle['align'] = 'left',
): ElementStyle => ({
  ...baseStyle(fill),
  fontFamily: 'Inter',
  fontSize,
  fontWeight,
  fontStyle: 'normal',
  textDecoration: '',
  align,
  letterSpacing: 0,
  lineHeight: 1.2,
  backgroundColor: 'transparent',
})

let localElementSequence = 0

export function nextEditorElementId(prefix: string) {
  localElementSequence += 1
  return `${prefix}-${Date.now()}-${localElementSequence}`
}

export function createTextElement(
  text: string,
  variant: 'heading' | 'subheading' | 'body' | 'small' | 'contact' = 'body',
): EditorElement {
  const variants = {
    heading: { width: 520, height: 70, fontSize: 44, fontWeight: 700 },
    subheading: { width: 460, height: 52, fontSize: 28, fontWeight: 600 },
    body: { width: 420, height: 44, fontSize: 20, fontWeight: 400 },
    small: { width: 360, height: 34, fontSize: 14, fontWeight: 400 },
    contact: { width: 540, height: 36, fontSize: 15, fontWeight: 400 },
  }
  const config = variants[variant]
  return {
    id: nextEditorElementId('text'),
    type: 'text',
    name: variant === 'contact' ? 'Contact Text' : `${variant[0].toUpperCase()}${variant.slice(1)}`,
    x: 180,
    y: 210,
    width: config.width,
    height: config.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: false,
    text,
    style: textStyle('#111111', config.fontSize, config.fontWeight),
  }
}

export function createShapeElement(shape: ShapeType): EditorElement {
  const isWide = shape === 'rectangle' || shape === 'rounded' || shape === 'corner'
  return {
    id: nextEditorElementId('shape'),
    type: 'shape',
    name: shape === 'rounded' ? 'Rounded Rectangle' : `${shape[0].toUpperCase()}${shape.slice(1)}`,
    shape,
    x: 340,
    y: 170,
    width: isWide ? 240 : 150,
    height: isWide ? 110 : 150,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: !isWide,
    style: {
      ...baseStyle('#2563eb'),
      stroke: '#2563eb',
      cornerRadius: shape === 'rounded' ? 24 : 0,
    },
  }
}

export function createIconElement(icon: IconType): EditorElement {
  const choice = iconChoices.find((item) => item.id === icon)
  return {
    id: nextEditorElementId('icon'),
    type: 'icon',
    name: `${choice?.label ?? icon} Icon`,
    icon,
    x: 380,
    y: 180,
    width: 72,
    height: 72,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: true,
    style: {
      ...baseStyle('transparent'),
      stroke: '#111111',
      strokeWidth: 2.4,
    },
  }
}

export function createDecorationElement(decoration: DecorationType): EditorElement {
  const labels: Record<DecorationType, string> = {
    'abstract-waves': 'Abstract Waves',
    'geometric-pattern': 'Geometric Pattern',
    'gradient-circles': 'Gradient Circles',
    'corner-decoration': 'Corner Decoration',
    'dots-grid': 'Dots and Grid',
    'minimal-leaves': 'Minimal Leaves',
    'brush-stroke': 'Brush Stroke',
    curves: 'Curves',
    'business-pattern': 'Business Pattern',
    'technology-pattern': 'Technology Pattern',
    'luxury-gold-accent': 'Luxury Gold Accent',
    'transparent-overlay': 'Transparent Overlay',
  }
  const isOverlay = decoration === 'transparent-overlay'
  const isWide = ['abstract-waves', 'brush-stroke', 'curves', 'business-pattern', 'technology-pattern'].includes(decoration)
  return {
    id: nextEditorElementId('deco'),
    type: 'decoration',
    name: labels[decoration],
    decoration,
    x: isOverlay ? 80 : 260,
    y: isOverlay ? 70 : 150,
    width: isOverlay ? 520 : isWide ? 360 : 180,
    height: isOverlay ? 320 : isWide ? 120 : 180,
    rotation: 0,
    opacity: isOverlay ? 0.28 : 1,
    visible: true,
    locked: false,
    maintainProportion: false,
    style: {
      ...baseStyle(decoration === 'luxury-gold-accent' ? '#d6a84f' : '#2563eb'),
      fillType: ['gradient-circles', 'transparent-overlay', 'luxury-gold-accent'].includes(decoration)
        ? 'gradient'
        : 'solid',
      stroke: decoration === 'transparent-overlay' ? '#ffffff' : '#111111',
      strokeWidth: decoration === 'transparent-overlay' ? 0 : 2,
      cornerRadius: isOverlay ? 28 : 0,
      gradient: {
        from: decoration === 'luxury-gold-accent' ? '#f7d778' : '#2563eb',
        to: decoration === 'luxury-gold-accent' ? '#9f6b1f' : '#14b8a6',
        angle: 135,
      },
    },
  }
}

export function createLineElement(arrow = false): EditorElement {
  return {
    id: nextEditorElementId(arrow ? 'arrow' : 'line'),
    type: 'line',
    name: arrow ? 'Arrow' : 'Line',
    x: 290,
    y: 250,
    width: 300,
    height: 20,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: false,
    points: [0, 10, 300, 10],
    style: {
      ...baseStyle('#111111'),
      stroke: '#111111',
      strokeWidth: 4,
      borderStyle: 'solid',
    },
    placeholder: arrow ? 'arrow' : 'line',
  }
}

export function createImageElement(
  assetUrl: string,
  name = 'Image',
  assetId?: string,
): EditorElement {
  return {
    id: nextEditorElementId('image'),
    type: 'image',
    name,
    x: 320,
    y: 135,
    width: 260,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: true,
    assetUrl,
    assetId,
    fit: 'contain',
    mask: 'none',
    flipX: false,
    flipY: false,
    style: {
      ...baseStyle('transparent'),
      stroke: 'transparent',
      cornerRadius: 0,
    },
  }
}

export function defaultQrOptions(): QrOptions {
  return {
    foreground: '#111111',
    background: '#ffffff',
    transparent: false,
    margin: 2,
    errorCorrection: 'M',
    style: 'square',
    centerLogoUrl: '',
  }
}

export function createQrElement(value = '{{qr_code}}', name = 'Profile QR Code'): EditorElement {
  return {
    id: nextEditorElementId('qr'),
    type: 'qr',
    name,
    x: 350,
    y: 105,
    width: 210,
    height: 210,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    maintainProportion: true,
    qrValue: value,
    qrOptions: defaultQrOptions(),
    style: baseStyle('#111111'),
  }
}

export function createDefaultBackground(color = '#ffffff'): BackgroundSettings {
  return {
    type: 'solid',
    color,
    gradient: { from: color, to: color, angle: 0 },
    imageUrl: '',
    pattern: 'none',
    opacity: 1,
    locked: true,
  }
}

export function createBlankDocument(color = '#ffffff'): CardDocument {
  return {
    version: 2,
    size: { width: CARD_WIDTH, height: CARD_HEIGHT },
    background: createDefaultBackground(color),
    guides: { horizontal: [], vertical: [] },
    elements: [],
  }
}

function templateDocument(
  design: CardDesignId | 'linework',
  side: CardSide,
): CardDocument {
  const isLight = design === 'minimal' || design === 'linework'
  const background = design === 'signature' ? '#2563eb' : isLight ? '#ffffff' : '#090b10'
  const foreground = isLight ? '#111111' : '#ffffff'
  const accent = design === 'signature' ? '#ffffff' : '#2563eb'
  const document = createBlankDocument(background)

  if (side === 'back') {
    document.elements = [
      {
        ...createQrElement(),
        id: `${design}-back-qr`,
        x: 345,
        y: 65,
        width: 210,
        height: 210,
        qrOptions: {
          ...defaultQrOptions(),
          foreground,
          background,
        },
      },
      {
        ...createTextElement('SCAN TO CONNECT', 'subheading'),
        id: `${design}-back-label`,
        name: 'Scan Label',
        x: 180,
        y: 320,
        width: 540,
        height: 50,
        style: textStyle(foreground, 26, 700, 'center'),
      },
      {
        ...createTextElement('{{website}}', 'small'),
        id: `${design}-back-website`,
        name: 'Website',
        x: 180,
        y: 390,
        width: 540,
        height: 32,
        style: textStyle(accent, 15, 500, 'center'),
      },
    ]
    return document
  }

  document.elements = [
    {
      ...createShapeElement('rectangle'),
      id: `${design}-accent`,
      name: 'Accent Bar',
      x: 0,
      y: 0,
      width: 18,
      height: 500,
      locked: false,
      maintainProportion: false,
      style: { ...baseStyle(accent), stroke: accent },
    },
    {
      ...createImageElement('/static/branding/tap2connect-logo-optimized.webp', 'T2C Logo'),
      id: `${design}-logo`,
      x: 78,
      y: 60,
      width: 180,
      height: 72,
    },
    {
      ...createTextElement('{{full_name}}', 'heading'),
      id: `${design}-name`,
      name: 'Full Name',
      x: 78,
      y: 232,
      width: 540,
      height: 64,
      style: textStyle(foreground, 38, 700),
    },
    {
      ...createTextElement('{{job_title}} | {{company}}', 'body'),
      id: `${design}-job`,
      name: 'Job Title',
      x: 80,
      y: 305,
      width: 560,
      height: 38,
      style: textStyle(foreground, 18, 500),
    },
    {
      ...createTextElement('{{phone}}  |  {{email}}', 'contact'),
      id: `${design}-contact`,
      name: 'Contact Line',
      x: 80,
      y: 390,
      width: 700,
      height: 32,
      style: textStyle(foreground, 14, 400),
    },
    {
      ...createLineElement(false),
      id: `${design}-line`,
      name: 'Bottom Divider',
      x: 80,
      y: 445,
      width: 720,
      height: 2,
      points: [0, 0, 720, 0],
      style: { ...baseStyle(accent), stroke: accent, strokeWidth: 3, borderStyle: 'solid' },
    },
  ]
  return document
}

function blueModernMarketingDocument(side: CardSide): CardDocument {
  const document = createBlankDocument('#ffffff')
  document.size = { width: 860, height: 540 }
  const base = createImageElement(
    `/static/card-editor/templates/blue-modern-marketing/${side}.svg`,
    `${side === 'front' ? 'Front' : 'Back'} Canva artwork`,
  )
  Object.assign(base, {
    id: `blue-modern-${side}-artwork`, x: 0, y: 0, width: 860, height: 540,
    fit: 'fill', locked: true, maintainProportion: false,
  })
  if (side === 'back') {
    const cover = createShapeElement('rectangle')
    Object.assign(cover, {
      id: 'blue-modern-back-field-cover', name: 'Editable slogan background',
      x: 165, y: 265, width: 530, height: 95, locked: true,
      style: { ...cover.style, fill: '#f9fafc', stroke: 'transparent', strokeWidth: 0 },
    })
    const slogan = createTextElement('Tap Share Connect', 'heading')
    Object.assign(slogan, {
      id: 'blue-modern-back-slogan', name: 'Back slogan', x: 170, y: 275,
      width: 520, height: 70,
      style: { ...slogan.style, fill: '#17136f', fontFamily: 'Arial', fontSize: 38, fontWeight: 700, align: 'center' },
    })
    document.elements = [base, cover, slogan]
    return document
  }

  const cover = createShapeElement('rectangle')
  Object.assign(cover, {
    id: 'blue-modern-front-field-cover', name: 'Editable details background',
    x: 375, y: 35, width: 475, height: 455, locked: true,
    style: { ...cover.style, fill: '#fbfcfd', stroke: 'transparent', strokeWidth: 0 },
  })
  const field = (id: string, name: string, text: string, y: number, size: number, weight = 400) => {
    const element = createTextElement(text, size >= 30 ? 'heading' : 'body')
    Object.assign(element, {
      id, name, x: 400, y, width: 410, height: size >= 30 ? 58 : 40,
      style: { ...element.style, fill: '#1f438f', fontFamily: 'Arial', fontSize: size, fontWeight: weight, align: 'right' },
    })
    return element
  }
  const contactIcon = (id: string, icon: IconType, y: number) => {
    const element = createIconElement(icon)
    Object.assign(element, {
      id, x: 816, y, width: 28, height: 28,
      style: { ...element.style, fill: 'transparent', stroke: '#21177b', strokeWidth: 2 },
    })
    return element
  }
  document.elements = [
    base,
    cover,
    field('blue-modern-name', 'Full name', '{{full_name}}', 52, 36, 700),
    field('blue-modern-role', 'Job title', '{{job_title}}', 112, 24, 400),
    field('blue-modern-phone', 'Phone number', '{{phone}}', 205, 20),
    field('blue-modern-website', 'Website', '{{website}}', 273, 20),
    field('blue-modern-email', 'Email address', '{{email}}', 341, 20),
    field('blue-modern-address', 'Address', '{{address}}', 409, 20),
    contactIcon('blue-modern-phone-icon', 'telephone', 208),
    contactIcon('blue-modern-website-icon', 'website', 276),
    contactIcon('blue-modern-email-icon', 'mail', 344),
    contactIcon('blue-modern-address-icon', 'address', 412),
  ]
  return document
}

export function createFallbackTemplates(): CardTemplateRecord[] {
  const definitions: Array<{
    id: CardDesignId | 'linework'
    label: string
    category: string
    premium?: boolean
  }> = [
    { id: 'midnight', label: 'Midnight', category: 'professional' },
    { id: 'signature', label: 'Signature Blue', category: 'corporate' },
    { id: 'minimal', label: 'Minimal White', category: 'minimal' },
    { id: 'linework', label: 'Linework', category: 'creative', premium: true },
  ]
  const templates: CardTemplateRecord[] = definitions.map((item, index) => ({
    id: `built-in-${item.id}`,
    name: item.label,
    slug: item.id,
    description: `A clean ${item.category} Tap2Connect card.`,
    category: item.category,
    status: 'published',
    frontData: templateDocument(item.id, 'front'),
    backData: templateDocument(item.id, 'back'),
    supportsBack: true,
    isFeatured: index < 2,
    isPremium: Boolean(item.premium),
    eligibleAccountTypes: [],
    sortOrder: index,
    version: 1,
    thumbnailUrl: '',
    publishedAt: null,
    updatedAt: new Date(0).toISOString(),
  }))
  templates.push({
    id: 'built-in-blue-modern-marketing',
    name: 'Blue Modern Marketing Manager',
    slug: 'blue-modern-marketing-manager',
    description: 'Imported two-sided Canva business card with editable profile fields.',
    category: 'marketing', status: 'published',
    frontData: blueModernMarketingDocument('front'),
    backData: blueModernMarketingDocument('back'),
    supportsBack: true, isFeatured: true, isPremium: false,
    eligibleAccountTypes: [], sortOrder: templates.length, version: 1,
    thumbnailUrl: '/static/card-editor/templates/blue-modern-marketing/front.svg',
    publishedAt: null, updatedAt: new Date(0).toISOString(),
  })
  return templates
}

export function createInitialSnapshot(
  frontDesign: CardDesignId,
  backDesign: CardDesignId,
  finish: 'pvc' | 'metal' | 'wood',
): { name: string; finish: 'pvc' | 'metal' | 'wood'; front: CardDocument; back: CardDocument } {
  return {
    name: 'Aarav Sharma card',
    finish,
    front: templateDocument(frontDesign, 'front'),
    back: templateDocument(backDesign, 'back'),
  }
}

export function createBlankSnapshot(
  finish: 'pvc' | 'metal' | 'wood' = 'pvc',
): { name: string; finish: 'pvc' | 'metal' | 'wood'; front: CardDocument; back: CardDocument } {
  return {
    name: 'Untitled card design',
    finish,
    front: createBlankDocument('#ffffff'),
    back: createBlankDocument('#ffffff'),
  }
}

export const shapeChoices: Array<{ id: ShapeType; label: string }> = [
  { id: 'circle', label: 'Circle' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'rounded', label: 'Rounded rectangle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'star', label: 'Star' },
  { id: 'corner', label: 'Corner' },
]

export const iconChoices: Array<{ id: IconType; label: string }> = [
  { id: 'contact', label: 'Contact' },
  { id: 'address', label: 'Address' },
  { id: 'website', label: 'Website' },
  { id: 'mail', label: 'Mail' },
  { id: 'telephone', label: 'Telephone' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'message', label: 'Message' },
  { id: 'company', label: 'Company' },
  { id: 'education', label: 'Education' },
  { id: 'briefcase', label: 'Work' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'clock', label: 'Clock' },
  { id: 'social', label: 'Social profile' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'nfc', label: 'NFC' },
  { id: 'wifi', label: 'Wireless' },
  { id: 'share', label: 'Share' },
  { id: 'download', label: 'Download' },
  { id: 'camera', label: 'Camera' },
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
]

export const decorationChoices: Array<{ id: DecorationType; label: string }> = [
  { id: 'abstract-waves', label: 'Abstract waves' },
  { id: 'geometric-pattern', label: 'Geometric patterns' },
  { id: 'gradient-circles', label: 'Gradient circles' },
  { id: 'corner-decoration', label: 'Corner decorations' },
  { id: 'dots-grid', label: 'Dots and grids' },
  { id: 'minimal-leaves', label: 'Minimal leaves' },
  { id: 'brush-stroke', label: 'Brush strokes' },
  { id: 'curves', label: 'Curves' },
  { id: 'business-pattern', label: 'Business patterns' },
  { id: 'technology-pattern', label: 'Technology patterns' },
  { id: 'luxury-gold-accent', label: 'Luxury gold accents' },
  { id: 'transparent-overlay', label: 'Transparent overlays' },
]

export const smartFieldChoices: Array<{ key: keyof ProfileFields; label: string }> = [
  { key: 'full_name', label: 'Full name' },
  { key: 'job_title', label: 'Job title' },
  { key: 'company', label: 'Company / organization' },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'connection_id', label: 'Connection ID' },
  { key: 'social_username', label: 'Social username' },
]

export const contactComponents = [
  { label: 'Phone contact line', text: '{{phone}}', name: 'Phone' },
  { label: 'Email contact line', text: '{{email}}', name: 'Email' },
  { label: 'Website contact line', text: '{{website}}', name: 'Website' },
  { label: 'Address contact line', text: '{{address}}', name: 'Address' },
  {
    label: 'Complete contact line',
    text: '{{phone}}  |  {{email}}  |  {{website}}',
    name: 'Contact Line',
  },
  {
    label: 'Social username',
    text: '{{social_username}}',
    name: 'Social Media',
  },
]
