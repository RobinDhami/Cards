import type {
  BackgroundSettings,
  CardDesignId,
  CardDocument,
  CardSide,
  CardTemplateRecord,
  EditorElement,
  ElementStyle,
  ProfileFields,
  QrOptions,
  ShapeType,
} from './types'

export const CARD_WIDTH = 900
export const CARD_HEIGHT = 500
export const SAFE_MARGIN = 30
export const BLEED_SIZE = 20
const LUXURY_CANVA_FRONT_URL = '/static/card-templates/luxury-gold-blue-front.svg'
const LUXURY_CANVA_BACK_URL = '/static/card-templates/luxury-gold-blue-back.svg'

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
  company_logo: '/static/branding/tap2connect-logo.png',
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
  fill,
  stroke: 'transparent',
  strokeWidth: 0,
  borderStyle: 'solid',
  cornerRadius: 0,
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
      ...createImageElement('/static/branding/tap2connect-logo.png', 'T2C Logo'),
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

function luxuryCanvaTemplateDocument(side: CardSide): CardDocument {
  const document = createBlankDocument('#07111f')
  document.background = {
    type: 'image',
    color: '#07111f',
    gradient: { from: '#07111f', to: '#d8b15f', angle: 135 },
    imageUrl: side === 'front' ? LUXURY_CANVA_FRONT_URL : LUXURY_CANVA_BACK_URL,
    pattern: 'none',
    opacity: 1,
    locked: true,
  }

  if (side === 'back') {
    document.elements = [
      {
        ...createShapeElement('rounded'),
        id: 'luxury-back-qr-panel',
        name: 'QR Panel',
        x: 95,
        y: 58,
        width: 300,
        height: 384,
        locked: false,
        maintainProportion: false,
        opacity: 0.9,
        style: {
          ...baseStyle('#07111f'),
          stroke: '#d8b15f',
          strokeWidth: 2,
          cornerRadius: 28,
          shadowColor: '#000000',
          shadowBlur: 24,
          shadowOpacity: 0.24,
        },
      },
      {
        ...createQrElement(),
        id: 'luxury-back-qr',
        name: 'Profile QR Code',
        x: 150,
        y: 98,
        width: 190,
        height: 190,
        qrOptions: {
          ...defaultQrOptions(),
          foreground: '#07111f',
          background: '#ffffff',
          margin: 2,
        },
      },
      {
        ...createTextElement('SCAN TO CONNECT', 'subheading'),
        id: 'luxury-back-scan-label',
        name: 'Scan Label',
        x: 116,
        y: 316,
        width: 258,
        height: 42,
        style: textStyle('#f8fafc', 22, 800, 'center'),
      },
      {
        ...createTextElement('{{website}}', 'small'),
        id: 'luxury-back-website',
        name: 'Website',
        x: 116,
        y: 368,
        width: 258,
        height: 30,
        style: textStyle('#d8b15f', 13, 600, 'center'),
      },
      {
        ...createImageElement('/static/branding/tap2connect-logo.png', 'Company Logo'),
        id: 'luxury-back-logo',
        x: 560,
        y: 164,
        width: 190,
        height: 74,
      },
      {
        ...createTextElement('{{company}}', 'subheading'),
        id: 'luxury-back-company',
        name: 'Company Name',
        x: 486,
        y: 258,
        width: 340,
        height: 42,
        style: textStyle('#f8fafc', 24, 800, 'center'),
      },
      {
        ...createTextElement('{{social_username}}', 'small'),
        id: 'luxury-back-social',
        name: 'Social Handle',
        x: 486,
        y: 306,
        width: 340,
        height: 30,
        style: textStyle('#d8b15f', 14, 600, 'center'),
      },
    ]
    return document
  }

  document.elements = [
    {
      ...createShapeElement('rounded'),
      id: 'luxury-front-info-panel',
      name: 'Identity Panel',
      x: 468,
      y: 54,
      width: 364,
      height: 392,
      locked: false,
      maintainProportion: false,
      opacity: 0.9,
      style: {
        ...baseStyle('#07111f'),
        stroke: '#d8b15f',
        strokeWidth: 2,
        cornerRadius: 28,
        shadowColor: '#000000',
        shadowBlur: 24,
        shadowOpacity: 0.26,
      },
    },
    {
      ...createImageElement('/static/branding/tap2connect-logo.png', 'Company Logo'),
      id: 'luxury-front-logo',
      x: 548,
      y: 86,
      width: 204,
      height: 78,
    },
    {
      ...createTextElement('{{full_name}}', 'heading'),
      id: 'luxury-front-name',
      name: 'Full Name',
      x: 510,
      y: 202,
      width: 280,
      height: 58,
      style: textStyle('#f8fafc', 34, 800, 'center'),
    },
    {
      ...createTextElement('{{job_title}} | {{company}}', 'body'),
      id: 'luxury-front-role',
      name: 'Role and Company',
      x: 506,
      y: 268,
      width: 288,
      height: 34,
      style: textStyle('#d8b15f', 15, 700, 'center'),
    },
    {
      ...createTextElement('{{phone}}', 'contact'),
      id: 'luxury-front-phone',
      name: 'Phone',
      x: 512,
      y: 336,
      width: 276,
      height: 28,
      style: textStyle('#f8fafc', 13, 500, 'center'),
    },
    {
      ...createTextElement('{{email}}', 'contact'),
      id: 'luxury-front-email',
      name: 'Email',
      x: 512,
      y: 369,
      width: 276,
      height: 28,
      style: textStyle('#f8fafc', 13, 500, 'center'),
    },
    {
      ...createTextElement('{{website}}', 'small'),
      id: 'luxury-front-website',
      name: 'Website',
      x: 512,
      y: 402,
      width: 276,
      height: 28,
      style: textStyle('#d8b15f', 13, 700, 'center'),
    },
  ]
  return document
}

export function createFallbackTemplates(): CardTemplateRecord[] {
  const definitions: Array<{
    id: CardDesignId | 'linework' | 'luxury-gold-blue'
    label: string
    category: string
    premium?: boolean
  }> = [
    { id: 'luxury-gold-blue', label: 'Luxury Gold Blue', category: 'business' },
    { id: 'midnight', label: 'Midnight', category: 'professional' },
    { id: 'signature', label: 'Signature Blue', category: 'corporate' },
    { id: 'minimal', label: 'Minimal White', category: 'minimal' },
    { id: 'linework', label: 'Linework', category: 'creative', premium: true },
  ]
  return definitions.map((item, index) => ({
    id: `built-in-${item.id}`,
    name: item.label,
    slug: item.id,
    description: item.id === 'luxury-gold-blue'
      ? 'A Canva-inspired luxury business card with editable profile fields.'
      : `A clean ${item.category} Tap2Connect card.`,
    category: item.category,
    status: 'published',
    frontData: item.id === 'luxury-gold-blue'
      ? luxuryCanvaTemplateDocument('front')
      : templateDocument(item.id, 'front'),
    backData: item.id === 'luxury-gold-blue'
      ? luxuryCanvaTemplateDocument('back')
      : templateDocument(item.id, 'back'),
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
