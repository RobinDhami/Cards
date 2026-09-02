import { useRef, useState } from 'react'
import { backendHref } from '../../lib/api'
import AlignCenter from 'lucide-react/dist/esm/icons/align-center.js'
import AlignHorizontalDistributeCenter from 'lucide-react/dist/esm/icons/align-horizontal-distribute-center.js'
import AlignLeft from 'lucide-react/dist/esm/icons/align-left.js'
import AlignRight from 'lucide-react/dist/esm/icons/align-right.js'
import AlignVerticalDistributeCenter from 'lucide-react/dist/esm/icons/align-vertical-distribute-center.js'
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down.js'
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up.js'
import Bold from 'lucide-react/dist/esm/icons/bold.js'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.js'
import Circle from 'lucide-react/dist/esm/icons/circle.js'
import ContactRound from 'lucide-react/dist/esm/icons/contact-round.js'
import Copy from 'lucide-react/dist/esm/icons/copy.js'
import Crop from 'lucide-react/dist/esm/icons/crop.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off.js'
import FlipHorizontal2 from 'lucide-react/dist/esm/icons/flip-horizontal-2.js'
import FlipVertical2 from 'lucide-react/dist/esm/icons/flip-vertical-2.js'
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical.js'
import Group from 'lucide-react/dist/esm/icons/group.js'
import Image from 'lucide-react/dist/esm/icons/image.js'
import Italic from 'lucide-react/dist/esm/icons/italic.js'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.js'
import Lock from 'lucide-react/dist/esm/icons/lock.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import Minus from 'lucide-react/dist/esm/icons/minus.js'
import MoveRight from 'lucide-react/dist/esm/icons/move-right.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Shapes from 'lucide-react/dist/esm/icons/shapes.js'
import Square from 'lucide-react/dist/esm/icons/square.js'
import Star from 'lucide-react/dist/esm/icons/star.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import Type from 'lucide-react/dist/esm/icons/type.js'
import Underline from 'lucide-react/dist/esm/icons/underline.js'
import Ungroup from 'lucide-react/dist/esm/icons/ungroup.js'
import Unlock from 'lucide-react/dist/esm/icons/unlock.js'
import UploadCloud from 'lucide-react/dist/esm/icons/upload-cloud.js'
import Waves from 'lucide-react/dist/esm/icons/waves.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import Smartphone from 'lucide-react/dist/esm/icons/smartphone.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import Briefcase from 'lucide-react/dist/esm/icons/briefcase.js'
import Calendar from 'lucide-react/dist/esm/icons/calendar.js'
import Clock from 'lucide-react/dist/esm/icons/clock.js'
import Instagram from 'lucide-react/dist/esm/icons/instagram.js'
import Facebook from 'lucide-react/dist/esm/icons/facebook.js'
import Linkedin from 'lucide-react/dist/esm/icons/linkedin.js'
import Youtube from 'lucide-react/dist/esm/icons/youtube.js'
import Wifi from 'lucide-react/dist/esm/icons/wifi.js'
import Share2 from 'lucide-react/dist/esm/icons/share-2.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Camera from 'lucide-react/dist/esm/icons/camera.js'
import Heart from 'lucide-react/dist/esm/icons/heart.js'
import {
  BRAND_COLORS,
  FONT_FAMILIES,
  contactComponents,
  decorationChoices,
  iconChoices,
  shapeChoices,
  smartFieldChoices,
} from './defaults'
import type {
  BackgroundSettings,
  CardAssetRecord,
  CardDocument,
  CardTemplateRecord,
  DecorationType,
  EditorElement,
  EditorTool,
  ElementStyle,
  FillType,
  IconType,
  ImageFit,
  ImageMask,
  ProfileFields,
  ShapeType,
} from './types'
import { editorTools } from './tools'
import { readableBytes, resolveProfileTokens } from './utils'

export function EditorToolRail({
  activeTool,
  collapsed,
  onChange,
}: {
  activeTool: EditorTool
  collapsed: boolean
  onChange: (tool: EditorTool) => void
}) {
  return (
    <nav className={`t2c-editor-tool-rail${collapsed ? ' is-collapsed' : ''}`} aria-label="Editor tools">
      {editorTools.map((tool) => {
        const Icon = tool.icon
        return (
          <button
            type="button"
            className={activeTool === tool.id ? 'is-active' : ''}
            aria-current={activeTool === tool.id ? 'page' : undefined}
            title={tool.label}
            onClick={() => onChange(tool.id)}
            key={tool.id}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{tool.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function PanelHeading({
  title,
  onCollapse,
  action,
}: {
  title: string
  onCollapse: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="t2c-panel-heading">
      <strong>{title}</strong>
      <div>
        {action}
        <button type="button" onClick={onCollapse} title="Collapse panel" aria-label="Collapse panel">
          <ChevronLeft size={17} />
        </button>
      </div>
    </div>
  )
}

function TemplatePreview({ template }: { template: CardTemplateRecord }) {
  const firstText = template.frontData.elements.find((element) => element.type === 'text')
  const background = template.frontData.background
  return (
    <span
      className="t2c-template-preview"
      style={{
        background:
          background.type === 'gradient'
            ? `linear-gradient(${background.gradient.angle}deg, ${background.gradient.from}, ${background.gradient.to})`
            : background.color,
        color: firstText?.style.fill || '#111111',
      }}
      aria-hidden="true"
    >
      <b>T2C</b>
      <small>{template.category}</small>
    </span>
  )
}

function ShapeGlyph({ shape }: { shape: ShapeType }) {
  if (shape === 'circle') return <Circle size={28} />
  if (shape === 'square') return <Square size={28} />
  if (shape === 'star') return <Star size={30} />
  return <span className={`t2c-shape-glyph t2c-shape-glyph--${shape}`} aria-hidden="true" />
}

function EditorIconGlyph({ icon }: { icon: IconType }) {
  const icons = {
    contact: ContactRound,
    address: MapPin,
    website: Globe2,
    mail: Mail,
    telephone: Phone,
    mobile: Smartphone,
    whatsapp: MessageCircle,
    message: MessageCircle,
    company: Building2,
    education: GraduationCap,
    briefcase: Briefcase,
    calendar: Calendar,
    clock: Clock,
    social: ContactRound,
    instagram: Instagram,
    facebook: Facebook,
    linkedin: Linkedin,
    youtube: Youtube,
    nfc: Wifi,
    wifi: Wifi,
    share: Share2,
    download: Download,
    camera: Camera,
    heart: Heart,
    star: Star,
  }
  const Icon = icons[icon]
  return <Icon size={28} />
}

function DecorationGlyph({ decoration }: { decoration: DecorationType }) {
  if (decoration === 'abstract-waves' || decoration === 'curves') return <Waves size={29} />
  if (decoration === 'gradient-circles') return <Circle size={29} />
  if (decoration === 'luxury-gold-accent') return <Sparkles size={29} />
  return <Shapes size={29} />
}

const fillTypes: Array<{ id: FillType; label: string }> = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'transparent', label: 'Transparent' },
]

const borderPresets: Array<{ label: string; patch: Partial<ElementStyle> }> = [
  { label: 'None', patch: { stroke: 'transparent', strokeWidth: 0, borderStyle: 'solid' } },
  { label: 'Thin', patch: { stroke: '#111111', strokeWidth: 1, borderStyle: 'solid' } },
  { label: 'Medium', patch: { stroke: '#111111', strokeWidth: 3, borderStyle: 'solid' } },
  { label: 'Dashed', patch: { stroke: '#2563eb', strokeWidth: 2, borderStyle: 'dashed' } },
  { label: 'Gold', patch: { stroke: '#d6a84f', strokeWidth: 3, borderStyle: 'solid' } },
]

type LibraryPanelProps = {
  tool: EditorTool
  templates: CardTemplateRecord[]
  currentTemplateId: string | null
  assets: CardAssetRecord[]
  brandAssets: CardAssetRecord[]
  profileFields: ProfileFields
  document: CardDocument
  selectedIds: string[]
  canManageTemplates: boolean
  authenticated: boolean
  uploading: boolean
  onCollapse: () => void
  onApplyTemplate: (template: CardTemplateRecord) => void
  onCreateBlank: () => void
  onAddShape: (shape: ShapeType) => void
  onAddIcon: (icon: IconType) => void
  onAddDecoration: (decoration: DecorationType) => void
  onAddLine: (arrow: boolean) => void
  onAddText: (
    variant: 'heading' | 'subheading' | 'body' | 'small' | 'contact',
    value?: string,
    name?: string,
  ) => void
  onAddImage: (asset: CardAssetRecord) => void
  onAddQr: (value: string, name: string) => void
  onUpload: (file: File, assetType: string, isGlobal: boolean) => void
  onBackgroundChange: (patch: Partial<BackgroundSettings>) => void
  onSelectLayer: (id: string, additive: boolean) => void
  onToggleLayer: (id: string, field: 'visible' | 'locked') => void
  onMoveLayer: (from: number, to: number) => void
  onRenameLayer: (id: string, name: string) => void
  onOpenTemplateManager: () => void
}

export function EditorLibraryPanel({
  tool,
  templates,
  currentTemplateId,
  assets,
  brandAssets,
  profileFields,
  document,
  selectedIds,
  canManageTemplates,
  authenticated,
  uploading,
  onCollapse,
  onApplyTemplate,
  onCreateBlank,
  onAddShape,
  onAddIcon,
  onAddDecoration,
  onAddLine,
  onAddText,
  onAddImage,
  onAddQr,
  onUpload,
  onBackgroundChange,
  onSelectLayer,
  onToggleLayer,
  onMoveLayer,
  onRenameLayer,
  onOpenTemplateManager,
}: LibraryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [assetType, setAssetType] = useState('decoration')
  const [elementSearch, setElementSearch] = useState('')
  const [globalUpload, setGlobalUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [dragLayerIndex, setDragLayerIndex] = useState<number | null>(null)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredTemplates = templates.filter(
    (template) =>
      !normalizedSearch
      || template.name.toLowerCase().includes(normalizedSearch)
      || template.category.toLowerCase().includes(normalizedSearch),
  )
  const filteredAssets = [...brandAssets, ...assets].filter(
    (asset) =>
      !normalizedSearch
      || asset.name.toLowerCase().includes(normalizedSearch)
      || asset.assetType.toLowerCase().includes(normalizedSearch),
  )

  return (
    <aside className="t2c-editor-library" aria-label={`${tool} options`}>
      <PanelHeading
        title={editorTools.find((item) => item.id === tool)?.label ?? 'Tools'}
        onCollapse={onCollapse}
        action={
          tool === 'templates' && canManageTemplates ? (
            <button
              type="button"
              className="t2c-panel-text-action"
              onClick={onOpenTemplateManager}
            >
              Manage
            </button>
          ) : undefined
        }
      />

      {tool === 'templates' || tool === 'uploads' || tool === 'brand' ? (
        <label className="t2c-panel-search">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${tool}`}
          />
        </label>
      ) : null}

      <div className="t2c-editor-library-content">
        {tool === 'templates' ? (
          <>
            <button type="button" className="t2c-create-blank-button" onClick={onCreateBlank}>
              <Plus size={17} />
              <span>
                <b>Create from scratch</b>
                <small>Blank front and back canvas</small>
              </span>
            </button>
            <div className="t2c-template-grid">
              {filteredTemplates.map((template) => (
                <button
                  type="button"
                  className={currentTemplateId === template.id ? 'is-active' : ''}
                  onClick={() => onApplyTemplate(template)}
                  key={template.id}
                >
                  <TemplatePreview template={template} />
                  <span>
                    <b>{template.name}</b>
                    <small>
                      {template.category}
                      {template.isPremium ? ' - Premium' : ''}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {tool === 'elements' ? (
          <>
            <label className="t2c-element-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={elementSearch}
                onChange={(event) => setElementSearch(event.target.value)}
                placeholder="Search icons and elements"
                aria-label="Search icons and elements"
              />
            </label>
            <section className="t2c-library-section">
              <h3>Basic shapes</h3>
              <div className="t2c-shape-grid">
                {shapeChoices.map((shape) => (
                  <button type="button" onClick={() => onAddShape(shape.id)} key={shape.id}>
                    <ShapeGlyph shape={shape.id} />
                    <span>{shape.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="t2c-library-section">
              <h3>Contact icons</h3>
              <div className="t2c-shape-grid">
                {iconChoices
                  .filter((icon) => icon.label.toLowerCase().includes(elementSearch.trim().toLowerCase()))
                  .map((icon) => (
                  <button type="button" onClick={() => onAddIcon(icon.id)} key={icon.id}>
                    <EditorIconGlyph icon={icon.id} />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="t2c-library-section">
              <h3>Decorations and patterns</h3>
              <div className="t2c-decoration-grid">
                {decorationChoices.map((decoration) => (
                  <button
                    type="button"
                    onClick={() => onAddDecoration(decoration.id)}
                    key={decoration.id}
                  >
                    <DecorationGlyph decoration={decoration.id} />
                    <span>{decoration.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="t2c-library-section">
              <h3>Lines & arrows</h3>
              <div className="t2c-shape-grid t2c-shape-grid--compact">
                <button type="button" onClick={() => onAddLine(false)}>
                  <Minus size={31} />
                  <span>Line</span>
                </button>
                <button type="button" onClick={() => onAddLine(true)}>
                  <MoveRight size={31} />
                  <span>Arrow</span>
                </button>
              </div>
            </section>
          </>
        ) : null}

        {tool === 'text' ? (
          <div className="t2c-text-presets">
            <button type="button" onClick={() => onAddText('heading')}>
              <strong>Add a heading</strong>
            </button>
            <button type="button" onClick={() => onAddText('subheading')}>
              <b>Add a subheading</b>
            </button>
            <button type="button" onClick={() => onAddText('body')}>
              Add normal text
            </button>
            <button type="button" onClick={() => onAddText('small')}>
              <small>Add small text</small>
            </button>
            <button type="button" onClick={() => onAddText('contact')}>
              <ContactRound size={16} />
              Add contact text
            </button>
            <button type="button" onClick={() => onAddText('body', 'Custom text')}>
              <Plus size={16} />
              Custom text box
            </button>
            <section className="t2c-library-section">
              <h3>Smart profile fields</h3>
              <div className="t2c-smart-field-list">
                {smartFieldChoices.map((field) => (
                  <button
                    type="button"
                    onClick={() =>
                      onAddText(
                        field.key === 'full_name' ? 'heading' : 'small',
                        `{{${field.key}}}`,
                        field.label,
                      )
                    }
                    key={field.key}
                  >
                    <span>{field.label}</span>
                    <small>{profileFields[field.key] || 'Not added yet'}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {tool === 'uploads' ? (
          <>
            <section className="t2c-upload-drop">
              <UploadCloud size={26} />
              <strong>{authenticated ? 'Upload to your media library' : 'Sign in to keep uploads'}</strong>
              <p>PNG, JPG, WebP, or safe SVG. Up to 10 MB.</p>
              <label>
                <span>Asset type</span>
                <select value={assetType} onChange={(event) => setAssetType(event.target.value)}>
                  <option value="profile_photo">Profile photo</option>
                  <option value="company_logo">Company logo</option>
                  <option value="school_logo">School logo</option>
                  <option value="background">Background</option>
                  <option value="signature">Signature</option>
                  <option value="decoration">Decorative image</option>
                  <option value="icon">Custom icon</option>
                  {canManageTemplates ? <option value="brand">Official brand asset</option> : null}
                </select>
              </label>
              {canManageTemplates ? (
                <label className="t2c-checkbox-row">
                  <input
                    type="checkbox"
                    checked={globalUpload}
                    onChange={(event) => setGlobalUpload(event.target.checked)}
                  />
                  Add to global asset library
                </label>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onUpload(file, assetType, globalUpload)
                  event.currentTarget.value = ''
                }}
              />
              <button
                type="button"
                className="t2c-primary-panel-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={16} />
                {uploading ? 'Uploading…' : 'Choose file'}
              </button>
            </section>
            <section className="t2c-library-section">
              <h3>Your media</h3>
              <div className="t2c-asset-grid">
                {filteredAssets.filter((asset) => !asset.isGlobal).map((asset) => (
                  <button type="button" onClick={() => onAddImage(asset)} key={asset.id}>
                    <img src={backendHref(asset.url)} alt="" />
                    <span>{asset.name}</span>
                    <small>{readableBytes(asset.fileSize)}</small>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {tool === 'brand' ? (
          <>
            <section className="t2c-library-section">
              <h3>Official T2C assets</h3>
              <div className="t2c-asset-grid">
                {filteredAssets.filter((asset) => asset.isGlobal).map((asset) => (
                  <button type="button" onClick={() => onAddImage(asset)} key={asset.id}>
                    <img src={backendHref(asset.url)} alt="" />
                    <span>{asset.name}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="t2c-library-section">
              <h3>Brand colors</h3>
              <div className="t2c-color-swatches">
                {BRAND_COLORS.map((color) => (
                  <button
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => onBackgroundChange({ color, type: 'solid' })}
                    aria-label={`Use ${color} as background`}
                    title={color}
                    key={color}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}

        {tool === 'qr' ? (
          <>
            <section className="t2c-library-section">
              <h3>QR components</h3>
              <div className="t2c-component-list">
                {[
                  ['Digital profile QR', '{{qr_code}}'],
                  ['Save contact QR', 'MECARD:N:{{full_name}};TEL:{{phone}};EMAIL:{{email}};;'],
                  ['Website QR', '{{website}}'],
                  ['Connection QR', 'https://tap2connectnepal.com/connect/{{connection_id}}'],
                ].map(([label, value]) => (
                  <button type="button" onClick={() => onAddQr(value, label)} key={label}>
                    <QrCode size={19} />
                    <span>
                      <b>{label}</b>
                      <small>{resolveProfileTokens(value, profileFields)}</small>
                    </span>
                    <Plus size={15} />
                  </button>
                ))}
              </div>
            </section>
            <section className="t2c-library-section">
              <h3>Custom URL</h3>
              <button
                type="button"
                className="t2c-primary-panel-button"
                onClick={() => onAddQr('https://', 'Custom URL QR')}
              >
                <Plus size={16} />
                Add custom QR
              </button>
            </section>
          </>
        ) : null}

        {tool === 'contact' ? (
          <section className="t2c-library-section">
            <h3>Contact components</h3>
            <div className="t2c-component-list">
              {contactComponents.map((component) => (
                <button
                  type="button"
                  onClick={() => onAddText('contact', component.text, component.name)}
                  key={component.label}
                >
                  <ContactRound size={18} />
                  <span>
                    <b>{component.label}</b>
                    <small>{resolveProfileTokens(component.text, profileFields)}</small>
                  </span>
                  <Plus size={15} />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {tool === 'background' ? (
          <>
            <section className="t2c-library-section">
              <h3>Background type</h3>
              <div className="t2c-segmented t2c-segmented--wrap">
                {(['solid', 'gradient', 'image', 'pattern', 'transparent'] as const).map((type) => (
                  <button
                    type="button"
                    className={document.background.type === type ? 'is-active' : ''}
                    onClick={() => onBackgroundChange({ type })}
                    key={type}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>
            {document.background.type === 'solid' ? (
              <section className="t2c-library-section">
                <h3>Solid color</h3>
                <div className="t2c-color-swatches t2c-color-swatches--large">
                  {BRAND_COLORS.map((color) => (
                    <button
                      type="button"
                      className={document.background.color === color ? 'is-active' : ''}
                      style={{ backgroundColor: color }}
                      onClick={() => onBackgroundChange({ color })}
                      aria-label={`Use ${color}`}
                      key={color}
                    />
                  ))}
                </div>
                <label className="t2c-control-field">
                  <span>Custom color</span>
                  <input
                    type="color"
                    value={document.background.color}
                    onChange={(event) => onBackgroundChange({ color: event.target.value })}
                  />
                </label>
              </section>
            ) : null}
            {document.background.type === 'gradient' ? (
              <section className="t2c-library-section">
                <h3>Gradient</h3>
                <div className="t2c-color-input-row">
                  <input
                    type="color"
                    value={document.background.gradient.from}
                    onChange={(event) =>
                      onBackgroundChange({
                        gradient: { ...document.background.gradient, from: event.target.value },
                      })
                    }
                  />
                  <input
                    type="color"
                    value={document.background.gradient.to}
                    onChange={(event) =>
                      onBackgroundChange({
                        gradient: { ...document.background.gradient, to: event.target.value },
                      })
                    }
                  />
                </div>
                <label className="t2c-range-field">
                  <span>Angle <b>{document.background.gradient.angle}°</b></span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={document.background.gradient.angle}
                    onChange={(event) =>
                      onBackgroundChange({
                        gradient: {
                          ...document.background.gradient,
                          angle: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              </section>
            ) : null}
            {document.background.type === 'pattern' ? (
              <section className="t2c-library-section">
                <h3>Pattern</h3>
                <div className="t2c-segmented">
                  {(['dots', 'grid', 'diagonal'] as const).map((pattern) => (
                    <button
                      type="button"
                      className={document.background.pattern === pattern ? 'is-active' : ''}
                      onClick={() => onBackgroundChange({ pattern })}
                      key={pattern}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {tool === 'layers' ? (
          <>
            <div className="t2c-layer-list">
              {[...document.elements].reverse().map((element, reverseIndex) => {
                const actualIndex = document.elements.length - reverseIndex - 1
                return (
                  <div
                    className={selectedIds.includes(element.id) ? 'is-selected' : ''}
                    draggable
                    onDragStart={() => setDragLayerIndex(actualIndex)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragLayerIndex !== null) onMoveLayer(dragLayerIndex, actualIndex)
                      setDragLayerIndex(null)
                    }}
                    onClick={(event) => onSelectLayer(element.id, event.shiftKey)}
                    key={element.id}
                  >
                    <GripVertical size={14} className="t2c-layer-grip" />
                    <span className="t2c-layer-type-icon">
                      {element.type === 'text' ? <Type size={14} /> : null}
                      {element.type === 'shape' ? <Shapes size={14} /> : null}
                      {element.type === 'icon' ? <ContactRound size={14} /> : null}
                      {element.type === 'decoration' ? <Waves size={14} /> : null}
                      {element.type === 'image' ? <Image size={14} /> : null}
                      {element.type === 'qr' ? <QrCode size={14} /> : null}
                      {element.type === 'line' ? <Minus size={14} /> : null}
                    </span>
                    <input
                      value={element.name}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onRenameLayer(element.id, event.target.value)}
                      aria-label={`Rename ${element.name}`}
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleLayer(element.id, 'visible')
                      }}
                      aria-label={element.visible ? 'Hide layer' : 'Show layer'}
                      title={element.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {element.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleLayer(element.id, 'locked')
                      }}
                      aria-label={element.locked ? 'Unlock layer' : 'Lock layer'}
                      title={element.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {element.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                )
              })}
              <div className="t2c-layer-background">
                <Lock size={14} />
                <span>Background</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  )
}

function NumericField({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  suffix?: string
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="t2c-number-field">
      <span>{label}</span>
      <div>
        <input
          type="number"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <small>{suffix}</small> : null}
      </div>
    </label>
  )
}

function IconChoice({
  active,
  label,
  children,
  onClick,
}: {
  active?: boolean
  label: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? 'is-active' : ''}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

type InspectorPanelProps = {
  selectedElements: EditorElement[]
  onCollapse: () => void
  onPatch: (patch: Partial<EditorElement>, label: string) => void
  onStylePatch: (patch: Partial<ElementStyle>, label: string) => void
  onAlign: (
    action:
      | 'left'
      | 'right'
      | 'top'
      | 'bottom'
      | 'center-horizontal'
      | 'center-vertical'
      | 'distribute-horizontal'
      | 'distribute-vertical'
      | 'match-width'
      | 'match-height',
  ) => void
  onLayerAction: (action: 'forward' | 'backward' | 'front' | 'back') => void
  onDuplicate: () => void
  onDelete: () => void
  onGroup: () => void
  onUngroup: () => void
}

export function EditorInspectorPanel({
  selectedElements,
  onCollapse,
  onPatch,
  onStylePatch,
  onAlign,
  onLayerAction,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
}: InspectorPanelProps) {
  const selected = selectedElements[0] ?? null
  const multiple = selectedElements.length > 1

  if (!selected) {
    return (
      <aside className="t2c-editor-inspector" aria-label="Properties panel">
        <PanelHeading title="Properties" onCollapse={onCollapse} />
        <div className="t2c-empty-inspector">
          <Shapes size={25} />
          <strong>Select an element</strong>
          <p>Choose an object on the card to edit its style, size, and position.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="t2c-editor-inspector" aria-label="Properties panel">
      <PanelHeading
        title={multiple ? `${selectedElements.length} elements` : selected.name}
        onCollapse={onCollapse}
        action={
          <button type="button" onClick={onDelete} title="Delete selection" aria-label="Delete selection">
            <Trash2 size={16} />
          </button>
        }
      />
      <div className="t2c-editor-inspector-content">
        {multiple ? (
          <section className="t2c-inspector-section">
            <h3>Align and distribute</h3>
            <div className="t2c-icon-button-grid">
              <IconChoice label="Align left" onClick={() => onAlign('left')}>
                <AlignLeft size={17} />
              </IconChoice>
              <IconChoice label="Center horizontally" onClick={() => onAlign('center-horizontal')}>
                <AlignCenter size={17} />
              </IconChoice>
              <IconChoice label="Align right" onClick={() => onAlign('right')}>
                <AlignRight size={17} />
              </IconChoice>
              <IconChoice label="Distribute horizontally" onClick={() => onAlign('distribute-horizontal')}>
                <AlignHorizontalDistributeCenter size={17} />
              </IconChoice>
              <IconChoice label="Distribute vertically" onClick={() => onAlign('distribute-vertical')}>
                <AlignVerticalDistributeCenter size={17} />
              </IconChoice>
              <IconChoice label="Match width" onClick={() => onAlign('match-width')}>
                <FlipHorizontal2 size={17} />
              </IconChoice>
              <IconChoice label="Match height" onClick={() => onAlign('match-height')}>
                <FlipVertical2 size={17} />
              </IconChoice>
            </div>
            <div className="t2c-two-button-row">
              <button type="button" onClick={onGroup}>
                <Group size={16} />
                Group
              </button>
              <button type="button" onClick={onUngroup}>
                <Ungroup size={16} />
                Ungroup
              </button>
            </div>
          </section>
        ) : null}

        {!multiple && selected.type === 'text' ? (
          <>
            <section className="t2c-inspector-section">
              <h3>Text</h3>
              <textarea
                className="t2c-inspector-textarea"
                value={selected.text ?? ''}
                onChange={(event) => onPatch({ text: event.target.value }, 'Edit text')}
                rows={4}
              />
              <label className="t2c-control-field">
                <span>Font</span>
                <select
                  value={selected.style.fontFamily ?? 'Inter'}
                  onChange={(event) => onStylePatch({ fontFamily: event.target.value }, 'Change font')}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option value={font} key={font}>{font}</option>
                  ))}
                </select>
              </label>
              <div className="t2c-inline-controls">
                <NumericField
                  label="Size"
                  value={selected.style.fontSize ?? 18}
                  min={6}
                  max={160}
                  suffix="px"
                  onChange={(fontSize) => onStylePatch({ fontSize }, 'Change font size')}
                />
                <div className="t2c-icon-toggle-row">
                  <IconChoice
                    active={(selected.style.fontWeight ?? 400) >= 600}
                    label="Bold"
                    onClick={() =>
                      onStylePatch(
                        { fontWeight: (selected.style.fontWeight ?? 400) >= 600 ? 400 : 700 },
                        'Toggle bold',
                      )
                    }
                  >
                    <Bold size={17} />
                  </IconChoice>
                  <IconChoice
                    active={selected.style.fontStyle === 'italic'}
                    label="Italic"
                    onClick={() =>
                      onStylePatch(
                        { fontStyle: selected.style.fontStyle === 'italic' ? 'normal' : 'italic' },
                        'Toggle italic',
                      )
                    }
                  >
                    <Italic size={17} />
                  </IconChoice>
                  <IconChoice
                    active={selected.style.textDecoration === 'underline'}
                    label="Underline"
                    onClick={() =>
                      onStylePatch(
                        {
                          textDecoration:
                            selected.style.textDecoration === 'underline' ? '' : 'underline',
                        },
                        'Toggle underline',
                      )
                    }
                  >
                    <Underline size={17} />
                  </IconChoice>
                </div>
              </div>
              <div className="t2c-inspector-color-row">
                <label>
                  <span>Text color</span>
                  <input
                    type="color"
                    value={selected.style.fill}
                    onChange={(event) => onStylePatch({ fill: event.target.value }, 'Change text color')}
                  />
                </label>
                <label>
                  <span>Highlight</span>
                  <input
                    type="color"
                    value={
                      selected.style.backgroundColor === 'transparent'
                        ? '#ffffff'
                        : selected.style.backgroundColor
                    }
                    onChange={(event) =>
                      onStylePatch({ backgroundColor: event.target.value }, 'Change text highlight')
                    }
                  />
                </label>
              </div>
              <div className="t2c-icon-toggle-row t2c-icon-toggle-row--wide">
                {[
                  { value: 'left' as const, icon: AlignLeft, label: 'Align left' },
                  { value: 'center' as const, icon: AlignCenter, label: 'Align center' },
                  { value: 'right' as const, icon: AlignRight, label: 'Align right' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <IconChoice
                      active={selected.style.align === item.value}
                      label={item.label}
                      onClick={() => onStylePatch({ align: item.value }, item.label)}
                      key={item.value}
                    >
                      <Icon size={17} />
                    </IconChoice>
                  )
                })}
              </div>
              <div className="t2c-two-column-fields">
                <NumericField
                  label="Letter spacing"
                  value={selected.style.letterSpacing ?? 0}
                  min={-4}
                  max={30}
                  onChange={(letterSpacing) => onStylePatch({ letterSpacing }, 'Change letter spacing')}
                />
                <NumericField
                  label="Line height"
                  value={selected.style.lineHeight ?? 1.2}
                  min={0.8}
                  max={3}
                  onChange={(lineHeight) => onStylePatch({ lineHeight }, 'Change line height')}
                />
              </div>
            </section>
          </>
        ) : null}

        {!multiple && ['shape', 'icon', 'decoration'].includes(selected.type) ? (
          <section className="t2c-inspector-section">
            <h3>{selected.type === 'shape' ? 'Shape' : selected.type === 'icon' ? 'Icon' : 'Decoration'}</h3>
            <div className="t2c-segmented t2c-segmented--wrap">
              {fillTypes.map((fillType) => (
                <button
                  type="button"
                  className={(selected.style.fillType ?? 'solid') === fillType.id ? 'is-active' : ''}
                  onClick={() => onStylePatch({ fillType: fillType.id }, `Use ${fillType.label.toLowerCase()} fill`)}
                  key={fillType.id}
                >
                  {fillType.label}
                </button>
              ))}
            </div>
            <div className="t2c-inspector-color-row">
              <label>
                <span>{selected.type === 'icon' ? 'Icon color' : 'Fill'}</span>
                <input
                  type="color"
                  value={selected.style.fill === 'transparent' ? '#2563eb' : selected.style.fill}
                  onChange={(event) =>
                    onStylePatch(
                      {
                        fill: event.target.value,
                        fillType: selected.style.fillType === 'transparent' ? 'solid' : selected.style.fillType,
                      },
                      'Change fill',
                    )
                  }
                />
              </label>
              <label>
                <span>Border</span>
                <input
                  type="color"
                  value={selected.style.stroke === 'transparent' ? '#2563eb' : selected.style.stroke}
                  onChange={(event) => onStylePatch({ stroke: event.target.value }, 'Change border')}
                />
              </label>
            </div>
            {(selected.style.fillType ?? 'solid') === 'gradient' ? (
              <>
                <div className="t2c-inspector-color-row">
                  <label>
                    <span>Gradient from</span>
                    <input
                      type="color"
                      value={selected.style.gradient?.from ?? selected.style.fill ?? '#2563eb'}
                      onChange={(event) =>
                        onStylePatch(
                          {
                            gradient: {
                              from: event.target.value,
                              to: selected.style.gradient?.to ?? '#14b8a6',
                              angle: selected.style.gradient?.angle ?? 135,
                            },
                          },
                          'Change gradient start',
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Gradient to</span>
                    <input
                      type="color"
                      value={selected.style.gradient?.to ?? '#14b8a6'}
                      onChange={(event) =>
                        onStylePatch(
                          {
                            gradient: {
                              from: selected.style.gradient?.from ?? selected.style.fill ?? '#2563eb',
                              to: event.target.value,
                              angle: selected.style.gradient?.angle ?? 135,
                            },
                          },
                          'Change gradient end',
                        )
                      }
                    />
                  </label>
                </div>
                <label className="t2c-control-field">
                  <span>Gradient angle</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selected.style.gradient?.angle ?? 135}
                    onChange={(event) =>
                      onStylePatch(
                        {
                          gradient: {
                            from: selected.style.gradient?.from ?? selected.style.fill ?? '#2563eb',
                            to: selected.style.gradient?.to ?? '#14b8a6',
                            angle: Number(event.target.value),
                          },
                        },
                        'Change gradient angle',
                      )
                    }
                  />
                </label>
              </>
            ) : null}
            <div className="t2c-border-preset-grid">
              {borderPresets.map((preset) => (
                <button
                  type="button"
                  onClick={() => onStylePatch(preset.patch, `Use ${preset.label.toLowerCase()} border`)}
                  key={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="t2c-two-column-fields">
              <NumericField
                label="Border width"
                value={selected.style.strokeWidth}
                min={0}
                max={40}
                suffix="px"
                onChange={(strokeWidth) => onStylePatch({ strokeWidth }, 'Change border width')}
              />
              <NumericField
                label="Radius"
                value={selected.style.cornerRadius}
                min={0}
                max={120}
                suffix="px"
                onChange={(cornerRadius) => onStylePatch({ cornerRadius }, 'Change corner radius')}
              />
            </div>
            <label className="t2c-control-field">
              <span>Border style</span>
              <select
                value={selected.style.borderStyle}
                onChange={(event) =>
                  onStylePatch(
                    { borderStyle: event.target.value as ElementStyle['borderStyle'] },
                    'Change border style',
                  )
                }
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </label>
          </section>
        ) : null}

        {!multiple && selected.type === 'image' ? (
          <section className="t2c-inspector-section">
            <h3>Image</h3>
            <label className="t2c-control-field">
              <span>Fit</span>
              <select
                value={selected.fit ?? 'contain'}
                onChange={(event) => onPatch({ fit: event.target.value as ImageFit }, 'Change image fit')}
              >
                <option value="contain">Fit</option>
                <option value="cover">Fill</option>
                <option value="fill">Stretch</option>
              </select>
            </label>
            <label className="t2c-control-field">
              <span>Mask</span>
              <select
                value={selected.mask ?? 'none'}
                onChange={(event) => onPatch({ mask: event.target.value as ImageMask }, 'Change image mask')}
              >
                <option value="none">None</option>
                <option value="circle">Circle</option>
                <option value="square">Square</option>
                <option value="rounded">Rounded</option>
              </select>
            </label>
            <div className="t2c-icon-toggle-row t2c-icon-toggle-row--wide">
              <IconChoice
                active={selected.flipX}
                label="Flip horizontally"
                onClick={() => onPatch({ flipX: !selected.flipX }, 'Flip image horizontally')}
              >
                <FlipHorizontal2 size={17} />
              </IconChoice>
              <IconChoice
                active={selected.flipY}
                label="Flip vertically"
                onClick={() => onPatch({ flipY: !selected.flipY }, 'Flip image vertically')}
              >
                <FlipVertical2 size={17} />
              </IconChoice>
              <IconChoice label="Reset image" onClick={() =>
                onPatch(
                  { fit: 'contain', mask: 'none', flipX: false, flipY: false, rotation: 0 },
                  'Reset image',
                )
              }>
                <RotateCcw size={17} />
              </IconChoice>
              <IconChoice label="Crop and fill" onClick={() => onPatch({ fit: 'cover' }, 'Crop image')}>
                <Crop size={17} />
              </IconChoice>
            </div>
          </section>
        ) : null}

        {!multiple && selected.type === 'qr' ? (
          <section className="t2c-inspector-section">
            <h3>QR code</h3>
            <label className="t2c-control-field">
              <span>Linked information</span>
              <textarea
                rows={3}
                value={selected.qrValue ?? ''}
                onChange={(event) => onPatch({ qrValue: event.target.value }, 'Change QR destination')}
              />
            </label>
            <div className="t2c-inspector-color-row">
              <label>
                <span>Foreground</span>
                <input
                  type="color"
                  value={selected.qrOptions?.foreground ?? '#111111'}
                  onChange={(event) =>
                    onPatch(
                      {
                        qrOptions: {
                          ...selected.qrOptions!,
                          foreground: event.target.value,
                        },
                      },
                      'Change QR color',
                    )
                  }
                />
              </label>
              <label>
                <span>Background</span>
                <input
                  type="color"
                  value={selected.qrOptions?.background ?? '#ffffff'}
                  onChange={(event) =>
                    onPatch(
                      {
                        qrOptions: {
                          ...selected.qrOptions!,
                          background: event.target.value,
                        },
                      },
                      'Change QR background',
                    )
                  }
                />
              </label>
            </div>
            <label className="t2c-control-field">
              <span>Error correction</span>
              <select
                value={selected.qrOptions?.errorCorrection ?? 'M'}
                onChange={(event) =>
                  onPatch(
                    {
                      qrOptions: {
                        ...selected.qrOptions!,
                        errorCorrection: event.target.value as 'L' | 'M' | 'Q' | 'H',
                      },
                    },
                    'Change QR correction',
                  )
                }
              >
                <option value="L">Low</option>
                <option value="M">Medium</option>
                <option value="Q">Quartile</option>
                <option value="H">High</option>
              </select>
            </label>
            <label className="t2c-checkbox-row">
              <input
                type="checkbox"
                checked={selected.qrOptions?.transparent ?? false}
                onChange={(event) =>
                  onPatch(
                    {
                      qrOptions: {
                        ...selected.qrOptions!,
                        transparent: event.target.checked,
                      },
                    },
                    'Toggle QR background',
                  )
                }
              />
              Transparent background
            </label>
          </section>
        ) : null}

        <section className="t2c-inspector-section">
          <h3>Position and size</h3>
          <div className="t2c-four-column-fields">
            <NumericField label="X" value={selected.x} suffix="px" onChange={(x) => onPatch({ x }, 'Set X position')} />
            <NumericField label="Y" value={selected.y} suffix="px" onChange={(y) => onPatch({ y }, 'Set Y position')} />
            <NumericField label="W" value={selected.width} suffix="px" min={10} onChange={(width) => onPatch({ width }, 'Set width')} />
            <NumericField label="H" value={selected.height} suffix="px" min={10} onChange={(height) => onPatch({ height }, 'Set height')} />
          </div>
          <div className="t2c-two-column-fields">
            <NumericField
              label="Rotation"
              value={selected.rotation}
              suffix="°"
              min={-360}
              max={360}
              onChange={(rotation) => onPatch({ rotation }, 'Rotate element')}
            />
            <NumericField
              label="Opacity"
              value={Math.round(selected.opacity * 100)}
              suffix="%"
              min={0}
              max={100}
              onChange={(opacity) => onPatch({ opacity: opacity / 100 }, 'Change opacity')}
            />
          </div>
          <label className="t2c-range-field">
            <span>Shadow <b>{selected.style.shadowBlur}px</b></span>
            <input
              type="range"
              min="0"
              max="60"
              value={selected.style.shadowBlur}
              onChange={(event) =>
                onStylePatch(
                  {
                    shadowBlur: Number(event.target.value),
                    shadowOpacity: Number(event.target.value) ? 0.24 : 0,
                  },
                  'Change shadow',
                )
              }
            />
          </label>
        </section>

        <section className="t2c-inspector-section">
          <h3>Layer actions</h3>
          <div className="t2c-icon-button-grid">
            <IconChoice label="Bring forward" onClick={() => onLayerAction('forward')}>
              <ArrowUp size={17} />
            </IconChoice>
            <IconChoice label="Send backward" onClick={() => onLayerAction('backward')}>
              <ArrowDown size={17} />
            </IconChoice>
            <IconChoice label="Bring to front" onClick={() => onLayerAction('front')}>
              <Layers3 size={17} />
            </IconChoice>
            <IconChoice label="Send to back" onClick={() => onLayerAction('back')}>
              <Layers3 size={17} />
            </IconChoice>
          </div>
          <div className="t2c-two-button-row">
            <button type="button" onClick={onDuplicate}>
              <Copy size={16} />
              Duplicate
            </button>
            <button type="button" onClick={() => onPatch({ locked: !selected.locked }, 'Toggle lock')}>
              {selected.locked ? <Unlock size={16} /> : <Lock size={16} />}
              {selected.locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </section>
      </div>
    </aside>
  )
}

export function InlineTextEditor({
  element,
  onSave,
  onClose,
}: {
  element: EditorElement
  onSave: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(element.text ?? '')
  return (
    <div className="t2c-inline-text-editor" role="dialog" aria-label={`Edit ${element.name}`}>
      <div>
        <strong>Edit text</strong>
        <button type="button" onClick={onClose} aria-label="Close text editor">
          <X size={17} />
        </button>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            onSave(value)
          }
        }}
      />
      <footer>
        <span>Ctrl/Command + Enter to apply</span>
        <button type="button" onClick={() => onSave(value)}>Apply</button>
      </footer>
    </div>
  )
}
