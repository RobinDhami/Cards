export type CardSide = 'front' | 'back'
export type CardDesignId = 'midnight' | 'signature' | 'minimal'
export type CardFinishId = 'pvc' | 'metal' | 'wood'

export type EditorTool =
  | 'templates'
  | 'elements'
  | 'text'
  | 'uploads'
  | 'brand'
  | 'qr'
  | 'contact'
  | 'background'
  | 'layers'

export type ElementType = 'text' | 'shape' | 'image' | 'qr' | 'line' | 'group'
export type ShapeType =
  | 'circle'
  | 'oval'
  | 'square'
  | 'rectangle'
  | 'rounded'
  | 'triangle'
  | 'polygon'
  | 'star'
  | 'corner'
export type TextAlignment = 'left' | 'center' | 'right' | 'justify'
export type ImageFit = 'contain' | 'cover' | 'fill'
export type ImageMask = 'none' | 'circle' | 'square' | 'rounded'
export type BorderStyle = 'solid' | 'dashed' | 'dotted'

export type ElementStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  borderStyle: BorderStyle
  cornerRadius: number
  shadowColor: string
  shadowBlur: number
  shadowOpacity: number
  blur: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: '' | 'underline'
  align?: TextAlignment
  letterSpacing?: number
  lineHeight?: number
  backgroundColor?: string
}

export type QrOptions = {
  foreground: string
  background: string
  transparent: boolean
  margin: number
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  style: 'square' | 'rounded'
  centerLogoUrl: string
}

export type EditorElement = {
  id: string
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  groupId?: string
  maintainProportion?: boolean
  text?: string
  placeholder?: string
  shape?: ShapeType
  points?: number[]
  assetUrl?: string
  assetId?: string
  fit?: ImageFit
  mask?: ImageMask
  flipX?: boolean
  flipY?: boolean
  qrValue?: string
  qrOptions?: QrOptions
  style: ElementStyle
}

export type BackgroundSettings = {
  type: 'solid' | 'gradient' | 'image' | 'pattern' | 'transparent'
  color: string
  gradient: {
    from: string
    to: string
    angle: number
  }
  imageUrl: string
  pattern: 'none' | 'dots' | 'grid' | 'diagonal'
  opacity: number
  locked: boolean
}

export type CardDocument = {
  version: 2
  size: {
    width: number
    height: number
  }
  background: BackgroundSettings
  guides: {
    horizontal: number[]
    vertical: number[]
  }
  elements: EditorElement[]
}

export type DesignSnapshot = {
  name: string
  finish: CardFinishId
  front: CardDocument
  back: CardDocument
}

export type ProfileFields = {
  full_name: string
  job_title: string
  company: string
  phone: string
  email: string
  website: string
  address: string
  connection_id: string
  social_username: string
  profile_photo: string
  company_logo: string
  qr_code: string
}

export type CardTemplateRecord = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  frontData: CardDocument
  backData: CardDocument
  supportsBack: boolean
  isFeatured: boolean
  isPremium: boolean
  eligibleAccountTypes: string[]
  sortOrder: number
  version: number
  thumbnailUrl: string
  publishedAt: string | null
  updatedAt: string
}

export type CardAssetRecord = {
  id: string
  name: string
  assetType: string
  mimeType?: string
  fileSize?: number
  isGlobal: boolean
  url: string
  createdAt?: string
}

export type CardDesignRecord = {
  id: string
  name: string
  status: 'draft' | 'ready' | 'ordered' | 'archived'
  finish: CardFinishId
  currentRevision: number
  sourceTemplateId: string | null
  sourceTemplateVersion: number | null
  lastSavedAt: string
  updatedAt: string
  createdAt: string
  frontData?: CardDocument
  backData?: CardDocument
}

export type EditorBootstrap = {
  ok: true
  authenticated: boolean
  isSuperuser: boolean
  accountType: string
  profileFields: ProfileFields
  templates: CardTemplateRecord[]
  designs: CardDesignRecord[]
  assets: CardAssetRecord[]
  brandAssets: CardAssetRecord[]
  card: {
    widthMm: number
    heightMm: number
    bleedMm: number
    safeMarginMm: number
  }
  templateCategories: Array<{ value: string; label: string }>
  assetTypes: Array<{ value: string; label: string }>
}

export type EditorValidationIssue = {
  id: string
  level: 'error' | 'warning'
  side: CardSide
  elementId?: string
  title: string
  detail: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export type CardDesignerProps = {
  open: boolean
  initialFrontDesign: CardDesignId
  initialBackDesign: CardDesignId
  finish: CardFinishId
  onClose: () => void
}

