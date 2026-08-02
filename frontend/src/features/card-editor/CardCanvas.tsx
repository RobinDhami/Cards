import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type Konva from 'konva'
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Text,
  Transformer,
} from 'react-konva'
import QRCode from 'qrcode'
import useImage from 'use-image'
import { CARD_HEIGHT, CARD_WIDTH, SAFE_MARGIN } from './defaults'
import type {
  BackgroundSettings,
  CardDocument,
  EditorElement,
  ProfileFields,
} from './types'
import { clamp, resolveProfileTokens } from './utils'

type AlignmentGuides = {
  horizontal: number[]
  vertical: number[]
}

export type CanvasElementPatch = {
  id: string
  patch: Partial<EditorElement>
}

export type CardCanvasHandle = {
  exportDataUrl: () => string
}

type CardCanvasProps = {
  document: CardDocument
  profileFields: ProfileFields
  selectedIds: string[]
  zoom: number
  showGrid: boolean
  showSafeArea: boolean
  showBleed: boolean
  snapToGrid: boolean
  snapToElements: boolean
  onSelect: (id: string | null, additive?: boolean) => void
  onCommitElements: (patches: CanvasElementPatch[], label: string) => void
  onOpenTextEdit: (id: string) => void
  onContextMenu: (event: { x: number; y: number; elementId: string | null }) => void
  onAddGuide?: (axis: 'horizontal' | 'vertical', value: number) => void
  onMoveGuide?: (axis: 'horizontal' | 'vertical', index: number, value: number) => void
}

type ElementNodeProps = {
  element: EditorElement
  profileFields: ProfileFields
  selected: boolean
  registerNode: (id: string, node: Konva.Group | null) => void
  onSelect: (id: string, additive: boolean) => void
  onDragMove: (id: string, node: Konva.Group) => void
  onDragEnd: (id: string, node: Konva.Group) => void
  onTransformEnd: (id: string, node: Konva.Group) => void
  onOpenTextEdit: (id: string) => void
  onContextMenu: (event: { x: number; y: number; elementId: string }) => void
}

function dashForStyle(style: EditorElement['style']) {
  if (style.borderStyle === 'dashed') return [12, 8]
  if (style.borderStyle === 'dotted') return [3, 7]
  return []
}

function gradientPoints(width: number, height: number, angle = 135) {
  const radians = (angle * Math.PI) / 180
  return {
    start: {
      x: width / 2 - Math.cos(radians) * width / 2,
      y: height / 2 - Math.sin(radians) * height / 2,
    },
    end: {
      x: width / 2 + Math.cos(radians) * width / 2,
      y: height / 2 + Math.sin(radians) * height / 2,
    },
  }
}

function fillProps(element: EditorElement, width = element.width, height = element.height) {
  if (element.style.fillType === 'transparent') {
    return { fill: 'transparent' }
  }
  if (element.style.fillType === 'gradient') {
    const gradient = element.style.gradient ?? {
      from: element.style.fill,
      to: '#2563eb',
      angle: 135,
    }
    const points = gradientPoints(width, height, gradient.angle)
    return {
      fillLinearGradientStartPoint: points.start,
      fillLinearGradientEndPoint: points.end,
      fillLinearGradientColorStops: [0, gradient.from, 1, gradient.to],
    }
  }
  return { fill: element.style.fill }
}

function ElementImage({
  element,
  width,
  height,
}: {
  element: EditorElement
  width: number
  height: number
}) {
  const [image] = useImage(element.assetUrl || '', 'anonymous')
  if (!image) {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill="#f8fafc"
          stroke="#cbd5e1"
          dash={[8, 6]}
          cornerRadius={Math.min(element.style.cornerRadius, Math.min(width, height) / 2)}
        />
        <Text
          width={width}
          height={height}
          text="Image"
          align="center"
          verticalAlign="middle"
          fill="#64748b"
          fontSize={18}
          fontFamily="Arial"
        />
      </Group>
    )
  }

  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const targetRatio = width / Math.max(height, 1)
  const sourceRatio = sourceWidth / Math.max(sourceHeight, 1)
  let crop
  if (element.fit === 'cover') {
    if (sourceRatio > targetRatio) {
      const cropWidth = sourceHeight * targetRatio
      crop = {
        x: (sourceWidth - cropWidth) / 2,
        y: 0,
        width: cropWidth,
        height: sourceHeight,
      }
    } else {
      const cropHeight = sourceWidth / targetRatio
      crop = {
        x: 0,
        y: (sourceHeight - cropHeight) / 2,
        width: sourceWidth,
        height: cropHeight,
      }
    }
  }

  return (
    <Group
      scaleX={element.flipX ? -1 : 1}
      scaleY={element.flipY ? -1 : 1}
      offsetX={element.flipX ? width : 0}
      offsetY={element.flipY ? height : 0}
      clipFunc={
        element.mask === 'circle'
          ? (context) => {
              context.beginPath()
              context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
              context.closePath()
            }
          : element.mask === 'rounded'
            ? (context) => {
                const radius = Math.min(element.style.cornerRadius || 28, width / 2, height / 2)
                context.beginPath()
                context.roundRect(0, 0, width, height, radius)
                context.closePath()
              }
            : undefined
      }
    >
      <KonvaImage
        image={image}
        width={width}
        height={height}
        crop={crop}
        opacity={element.opacity}
        shadowColor={element.style.shadowColor}
        shadowBlur={element.style.shadowBlur}
        shadowOpacity={element.style.shadowOpacity}
        cornerRadius={
          element.mask === 'rounded' ? element.style.cornerRadius || 28 : element.style.cornerRadius
        }
      />
      {element.style.strokeWidth > 0 ? (
        <Rect
          width={width}
          height={height}
          fill="transparent"
          stroke={element.style.stroke}
          strokeWidth={element.style.strokeWidth}
          dash={dashForStyle(element.style)}
          cornerRadius={
            element.mask === 'circle'
              ? Math.min(width, height) / 2
              : element.style.cornerRadius
          }
          listening={false}
        />
      ) : null}
    </Group>
  )
}

function QrImage({
  element,
  profileFields,
}: {
  element: EditorElement
  profileFields: ProfileFields
}) {
  const [dataUrl, setDataUrl] = useState('')
  const options = element.qrOptions
  const value = resolveProfileTokens(element.qrValue || '', profileFields) || 'https://tap2connectnepal.com'

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, {
      width: 640,
      margin: options?.margin ?? 2,
      errorCorrectionLevel: options?.errorCorrection ?? 'M',
      color: {
        dark: options?.foreground ?? '#111111',
        light: options?.transparent ? '#00000000' : options?.background ?? '#ffffff',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl('')
      })
    return () => {
      active = false
    }
  }, [
    options?.background,
    options?.errorCorrection,
    options?.foreground,
    options?.margin,
    options?.transparent,
    value,
  ])

  const [image] = useImage(dataUrl)
  const [centerLogo] = useImage(options?.centerLogoUrl || '', 'anonymous')

  return (
    <Group>
      <Rect
        width={element.width}
        height={element.height}
        fill={options?.transparent ? 'transparent' : options?.background ?? '#ffffff'}
        cornerRadius={element.style.cornerRadius}
      />
      {image ? (
        <KonvaImage
          image={image}
          width={element.width}
          height={element.height}
          cornerRadius={options?.style === 'rounded' ? 12 : 0}
        />
      ) : (
        <Text
          width={element.width}
          height={element.height}
          text="QR"
          align="center"
          verticalAlign="middle"
          fill="#64748b"
          fontSize={32}
          fontFamily="Arial"
        />
      )}
      {centerLogo ? (
        <Group x={element.width * 0.36} y={element.height * 0.36}>
          <Rect
            width={element.width * 0.28}
            height={element.height * 0.28}
            fill="#ffffff"
            cornerRadius={8}
          />
          <KonvaImage
            image={centerLogo}
            x={element.width * 0.02}
            y={element.height * 0.04}
            width={element.width * 0.24}
            height={element.height * 0.2}
          />
        </Group>
      ) : null}
    </Group>
  )
}

function ShapeNode({ element }: { element: EditorElement }) {
  const common = {
    stroke: element.style.stroke,
    strokeWidth: element.style.strokeWidth,
    dash: dashForStyle(element.style),
    opacity: element.opacity,
    shadowColor: element.style.shadowColor,
    shadowBlur: element.style.shadowBlur,
    shadowOpacity: element.style.shadowOpacity,
    ...fillProps(element),
  }
  const width = element.width
  const height = element.height

  if (element.shape === 'circle' || element.shape === 'oval') {
    return (
      <Ellipse
        x={width / 2}
        y={height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        {...common}
      />
    )
  }
  if (element.shape === 'triangle' || element.shape === 'polygon') {
    return (
      <RegularPolygon
        x={width / 2}
        y={height / 2}
        sides={element.shape === 'triangle' ? 3 : 6}
        radius={Math.min(width, height) / 2}
        {...common}
      />
    )
  }
  if (element.shape === 'star') {
    return (
      <Star
        x={width / 2}
        y={height / 2}
        numPoints={5}
        innerRadius={Math.min(width, height) * 0.22}
        outerRadius={Math.min(width, height) * 0.48}
        {...common}
      />
    )
  }
  if (element.shape === 'corner') {
    return (
      <Line
        points={[width, 0, 0, 0, 0, height]}
        stroke={element.style.stroke === 'transparent' ? element.style.fill : element.style.stroke}
        strokeWidth={Math.max(element.style.strokeWidth, 12)}
        lineCap="round"
        lineJoin="round"
        opacity={element.opacity}
      />
    )
  }
  return (
    <Rect
      width={width}
      height={height}
      cornerRadius={element.shape === 'rounded' ? element.style.cornerRadius || 24 : element.style.cornerRadius}
      {...common}
    />
  )
}

const iconPaths: Record<NonNullable<EditorElement['icon']>, string[]> = {
  contact: [
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M4 22v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  ],
  address: [
    'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z',
    'M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  ],
  website: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'M2 12h20',
    'M12 2c2.6 2.7 4 6 4 10s-1.4 7.3-4 10',
    'M12 2c-2.6 2.7-4 6-4 10s1.4 7.3 4 10',
  ],
  mail: [
    'M4 5h16v14H4Z',
    'M4 7l8 6 8-6',
  ],
  telephone: [
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z',
  ],
}

function IconNode({ element }: { element: EditorElement }) {
  const paths = iconPaths[element.icon ?? 'contact']
  const color = element.style.fill === 'transparent' ? element.style.stroke : element.style.fill
  return (
    <Group scaleX={element.width / 24} scaleY={element.height / 24}>
      {paths.map((data, index) => (
        <Path
          key={`${element.id}-icon-${index}`}
          data={data}
          fill="transparent"
          stroke={color === 'transparent' ? '#111111' : color}
          strokeWidth={Math.max(element.style.strokeWidth || 2, 0.5)}
          lineCap="round"
          lineJoin="round"
          opacity={element.opacity}
        />
      ))}
    </Group>
  )
}

function DecorationNode({ element }: { element: EditorElement }) {
  const width = element.width
  const height = element.height
  const stroke = element.style.stroke === 'transparent' ? element.style.fill : element.style.stroke
  const fill = fillProps(element, width, height)
  const commonStroke = {
    stroke,
    strokeWidth: Math.max(element.style.strokeWidth, 1),
    dash: dashForStyle(element.style),
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    opacity: element.opacity,
  }
  const decoration = element.decoration ?? 'abstract-waves'

  if (decoration === 'abstract-waves') {
    return (
      <Group>
        {[0.24, 0.5, 0.76].map((ratio, index) => (
          <Line
            key={ratio}
            points={[0, height * ratio, width * 0.24, height * (ratio - 0.18), width * 0.5, height * ratio, width * 0.76, height * (ratio + 0.18), width, height * ratio]}
            tension={0.55}
            {...commonStroke}
            opacity={element.opacity * (1 - index * 0.18)}
          />
        ))}
      </Group>
    )
  }

  if (decoration === 'geometric-pattern') {
    return (
      <Group>
        <RegularPolygon x={width * 0.24} y={height * 0.28} sides={6} radius={Math.min(width, height) * 0.18} {...commonStroke} {...fill} />
        <Rect x={width * 0.52} y={height * 0.14} width={width * 0.26} height={height * 0.26} rotation={12} {...commonStroke} {...fill} />
        <Circle x={width * 0.68} y={height * 0.72} radius={Math.min(width, height) * 0.16} {...commonStroke} {...fill} />
      </Group>
    )
  }

  if (decoration === 'gradient-circles') {
    return (
      <Group>
        <Circle x={width * 0.38} y={height * 0.5} radius={Math.min(width, height) * 0.32} {...fill} opacity={element.opacity} />
        <Circle x={width * 0.62} y={height * 0.5} radius={Math.min(width, height) * 0.32} {...fill} opacity={element.opacity * 0.68} />
      </Group>
    )
  }

  if (decoration === 'corner-decoration' || decoration === 'luxury-gold-accent') {
    return (
      <Group>
        <Line points={[width, 0, 0, 0, 0, height]} {...commonStroke} />
        <Line points={[width * 0.78, height * 0.16, width * 0.16, height * 0.16, width * 0.16, height * 0.78]} {...commonStroke} opacity={element.opacity * 0.72} />
        {decoration === 'luxury-gold-accent' ? (
          <Circle x={width * 0.16} y={height * 0.16} radius={Math.min(width, height) * 0.08} {...fill} opacity={element.opacity} />
        ) : null}
      </Group>
    )
  }

  if (decoration === 'dots-grid' || decoration === 'technology-pattern') {
    return (
      <Group>
        {Array.from({ length: 6 }).flatMap((_, column) =>
          Array.from({ length: 4 }).map((__, row) => (
            <Circle
              key={`${column}-${row}`}
              x={(column + 0.5) * (width / 6)}
              y={(row + 0.5) * (height / 4)}
              radius={decoration === 'technology-pattern' ? 3 : 4}
              fill={element.style.fill}
              opacity={element.opacity * 0.75}
            />
          )),
        )}
        {decoration === 'technology-pattern' ? (
          <Line points={[width * 0.08, height * 0.5, width * 0.92, height * 0.5, width * 0.72, height * 0.2, width * 0.72, height * 0.82]} {...commonStroke} opacity={element.opacity * 0.45} />
        ) : null}
      </Group>
    )
  }

  if (decoration === 'minimal-leaves') {
    return (
      <Group>
        <Line points={[width * 0.12, height * 0.88, width * 0.86, height * 0.14]} {...commonStroke} />
        {[0.25, 0.45, 0.65].map((ratio) => (
          <Ellipse key={ratio} x={width * ratio} y={height * (1 - ratio)} radiusX={width * 0.08} radiusY={height * 0.18} rotation={-35} {...commonStroke} {...fill} />
        ))}
      </Group>
    )
  }

  if (decoration === 'brush-stroke') {
    return (
      <Line
        points={[0, height * 0.55, width * 0.18, height * 0.28, width * 0.4, height * 0.66, width * 0.62, height * 0.36, width, height * 0.5]}
        tension={0.65}
        stroke={element.style.fill}
        strokeWidth={Math.max(height * 0.28, 12)}
        lineCap="round"
        lineJoin="round"
        opacity={element.opacity * 0.5}
      />
    )
  }

  if (decoration === 'curves') {
    return (
      <Group>
        <Line points={[0, height, width * 0.32, 0, width * 0.68, height, width, 0]} tension={0.5} {...commonStroke} />
        <Line points={[0, height * 0.72, width * 0.36, height * 0.08, width * 0.7, height * 0.82, width, height * 0.2]} tension={0.5} {...commonStroke} opacity={element.opacity * 0.52} />
      </Group>
    )
  }

  if (decoration === 'business-pattern') {
    return (
      <Group>
        {[0.18, 0.42, 0.66].map((ratio, index) => (
          <Rect key={ratio} x={width * ratio} y={height * (0.72 - index * 0.18)} width={width * 0.12} height={height * (0.22 + index * 0.18)} {...fill} opacity={element.opacity * 0.72} />
        ))}
        <Line points={[width * 0.08, height * 0.84, width * 0.92, height * 0.84]} {...commonStroke} />
      </Group>
    )
  }

  return <Rect width={width} height={height} cornerRadius={element.style.cornerRadius || 24} {...fill} opacity={element.opacity} />
}

const ElementNode = memo(function ElementNode({
  element,
  profileFields,
  registerNode,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onOpenTextEdit,
  onContextMenu,
}: ElementNodeProps) {
  if (!element.visible) return null
  const resolvedText = resolveProfileTokens(element.text || '', profileFields)

  return (
    <Group
      ref={(node) => registerNode(element.id, node)}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={!element.locked}
      onClick={(event) => {
        event.cancelBubble = true
        onSelect(element.id, Boolean(event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey))
      }}
      onTap={(event) => {
        event.cancelBubble = true
        onSelect(element.id, false)
      }}
      onDblClick={() => {
        if (element.type === 'text') onOpenTextEdit(element.id)
      }}
      onDblTap={() => {
        if (element.type === 'text') onOpenTextEdit(element.id)
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        onContextMenu({
          x: event.evt.clientX,
          y: event.evt.clientY,
          elementId: element.id,
        })
      }}
      onDragMove={(event) => onDragMove(element.id, event.target as Konva.Group)}
      onDragEnd={(event) => onDragEnd(element.id, event.target as Konva.Group)}
      onTransformEnd={(event) => onTransformEnd(element.id, event.target as Konva.Group)}
    >
      {element.type === 'text' ? (
        <Group>
          {element.style.backgroundColor && element.style.backgroundColor !== 'transparent' ? (
            <Rect
              width={element.width}
              height={element.height}
              fill={element.style.backgroundColor}
              cornerRadius={element.style.cornerRadius}
            />
          ) : null}
          <Text
            width={element.width}
            height={element.height}
            text={resolvedText}
            fontFamily={
              element.style.fontFamily === 'Inter'
                ? 'Arial'
                : element.style.fontFamily || 'Arial'
            }
            fontSize={element.style.fontSize || 18}
            fontStyle={`${element.style.fontWeight && element.style.fontWeight >= 600 ? 'bold' : ''} ${
              element.style.fontStyle === 'italic' ? 'italic' : ''
            }`.trim()}
            textDecoration={element.style.textDecoration}
            fill={element.style.fill}
            align={element.style.align}
            letterSpacing={element.style.letterSpacing}
            lineHeight={element.style.lineHeight}
            verticalAlign="middle"
            shadowColor={element.style.shadowColor}
            shadowBlur={element.style.shadowBlur}
            shadowOpacity={element.style.shadowOpacity}
            wrap="word"
          />
        </Group>
      ) : null}
      {element.type === 'shape' ? <ShapeNode element={element} /> : null}
      {element.type === 'icon' ? <IconNode element={element} /> : null}
      {element.type === 'decoration' ? <DecorationNode element={element} /> : null}
      {element.type === 'image' ? (
        <ElementImage element={element} width={element.width} height={element.height} />
      ) : null}
      {element.type === 'qr' ? (
        <QrImage element={element} profileFields={profileFields} />
      ) : null}
      {element.type === 'line' ? (
        element.placeholder === 'arrow' ? (
          <Arrow
            points={[0, element.height / 2, element.width, element.height / 2]}
            pointerLength={18}
            pointerWidth={16}
            stroke={element.style.stroke}
            fill={element.style.stroke}
            strokeWidth={element.style.strokeWidth}
            dash={dashForStyle(element.style)}
            opacity={element.opacity}
          />
        ) : (
          <Line
            points={[0, element.height / 2, element.width, element.height / 2]}
            stroke={element.style.stroke}
            strokeWidth={element.style.strokeWidth}
            dash={dashForStyle(element.style)}
            lineCap="round"
            opacity={element.opacity}
          />
        )
      ) : null}
    </Group>
  )
})

function BackgroundImage({ background }: { background: BackgroundSettings }) {
  const [image] = useImage(background.imageUrl || '', 'anonymous')
  if (!image || background.type !== 'image') return null
  return (
    <KonvaImage
      image={image}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      opacity={background.opacity}
    />
  )
}

function BackgroundLayer({
  background,
  showGrid,
}: {
  background: BackgroundSettings
  showGrid: boolean
}) {
  const angle = (background.gradient.angle * Math.PI) / 180
  const gradientStart = {
    x: CARD_WIDTH / 2 - Math.cos(angle) * CARD_WIDTH / 2,
    y: CARD_HEIGHT / 2 - Math.sin(angle) * CARD_HEIGHT / 2,
  }
  const gradientEnd = {
    x: CARD_WIDTH / 2 + Math.cos(angle) * CARD_WIDTH / 2,
    y: CARD_HEIGHT / 2 + Math.sin(angle) * CARD_HEIGHT / 2,
  }
  return (
    <Layer listening={false}>
      <Rect
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        fill={
          background.type === 'transparent'
            ? '#ffffff'
            : background.type === 'solid' || background.type === 'pattern'
              ? background.color
              : undefined
        }
        fillLinearGradientStartPoint={background.type === 'gradient' ? gradientStart : undefined}
        fillLinearGradientEndPoint={background.type === 'gradient' ? gradientEnd : undefined}
        fillLinearGradientColorStops={
          background.type === 'gradient'
            ? [0, background.gradient.from, 1, background.gradient.to]
            : undefined
        }
        opacity={background.opacity}
        shadowColor="#0f172a"
        shadowBlur={30}
        shadowOpacity={0.16}
        shadowOffsetY={12}
      />
      <BackgroundImage background={background} />
      {background.type === 'transparent' ? (
        Array.from({ length: 18 }).flatMap((_, column) =>
          Array.from({ length: 10 }).map((__, row) => (
            <Rect
              key={`transparent-${column}-${row}`}
              x={column * 50}
              y={row * 50}
              width={50}
              height={50}
              fill={(column + row) % 2 ? '#f1f5f9' : '#ffffff'}
            />
          )),
        )
      ) : null}
      {background.type === 'pattern' && background.pattern === 'dots'
        ? Array.from({ length: 18 }).flatMap((_, column) =>
            Array.from({ length: 10 }).map((__, row) => (
              <Circle
                key={`dot-${column}-${row}`}
                x={column * 50 + 25}
                y={row * 50 + 25}
                radius={2}
                fill="#64748b"
                opacity={0.22}
              />
            )),
          )
        : null}
      {showGrid
        ? Array.from({ length: 19 }).map((_, index) => (
            <Line
              key={`grid-v-${index}`}
              points={[index * 50, 0, index * 50, CARD_HEIGHT]}
              stroke="#2563eb"
              strokeWidth={1}
              opacity={0.12}
            />
          ))
        : null}
      {showGrid
        ? Array.from({ length: 11 }).map((_, index) => (
            <Line
              key={`grid-h-${index}`}
              points={[0, index * 50, CARD_WIDTH, index * 50]}
              stroke="#2563eb"
              strokeWidth={1}
              opacity={0.12}
            />
          ))
        : null}
    </Layer>
  )
}

function nearestSnap(value: number, candidates: number[], tolerance: number) {
  let best = value
  let distance = tolerance + 1
  candidates.forEach((candidate) => {
    const current = Math.abs(candidate - value)
    if (current < distance && current <= tolerance) {
      best = candidate
      distance = current
    }
  })
  return distance <= tolerance ? best : null
}

export const CardCanvas = forwardRef<CardCanvasHandle, CardCanvasProps>(function CardCanvas(
  {
    document,
    profileFields,
    selectedIds,
    zoom,
    showGrid,
    showSafeArea,
    showBleed,
    snapToGrid,
    snapToElements,
    onSelect,
    onCommitElements,
    onOpenTextEdit,
    onContextMenu,
    onAddGuide,
    onMoveGuide,
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const elementNodesRef = useRef(new Map<string, Konva.Group>())
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 700 })
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({
    horizontal: [],
    vertical: [],
  })

  useImperativeHandle(
    forwardedRef,
    () => ({
      exportDataUrl: () => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? '',
    }),
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const update = () => {
      const rect = container.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const nodes = selectedIds.flatMap((id) => {
      const node = elementNodesRef.current.get(id)
      const locked = document.elements.find((element) => element.id === id)?.locked
      return node && !locked ? [node] : []
    })
    transformerRef.current?.nodes(nodes)
    transformerRef.current?.getLayer()?.batchDraw()
  }, [document.elements, selectedIds])

  const baseScale = useMemo(() => {
    const widthScale = Math.max(0.28, (containerSize.width - 150) / CARD_WIDTH)
    const heightScale = Math.max(0.28, (containerSize.height - 170) / CARD_HEIGHT)
    return Math.min(widthScale, heightScale, 1.05)
  }, [containerSize.height, containerSize.width])
  const displayScale = baseScale * zoom
  const stageWidth = CARD_WIDTH * displayScale
  const stageHeight = CARD_HEIGHT * displayScale

  const visibleElements = document.elements.filter((element) => element.visible)

  const registerNode = (id: string, node: Konva.Group | null) => {
    if (node) elementNodesRef.current.set(id, node)
    else elementNodesRef.current.delete(id)
  }

  const snapNode = (id: string, node: Konva.Group) => {
    let nextX = node.x()
    let nextY = node.y()
    const element = document.elements.find((candidate) => candidate.id === id)
    if (!element) return
    const tolerance = 7 / Math.max(displayScale, 0.25)
    const verticalGuides: number[] = []
    const horizontalGuides: number[] = []

    if (snapToGrid) {
      nextX = Math.round(nextX / 10) * 10
      nextY = Math.round(nextY / 10) * 10
    }
    if (snapToElements) {
      const verticalCandidates = [0, CARD_WIDTH / 2, CARD_WIDTH]
      const horizontalCandidates = [0, CARD_HEIGHT / 2, CARD_HEIGHT]
      document.elements.forEach((candidate) => {
        if (candidate.id === id || !candidate.visible) return
        verticalCandidates.push(
          candidate.x,
          candidate.x + candidate.width / 2,
          candidate.x + candidate.width,
        )
        horizontalCandidates.push(
          candidate.y,
          candidate.y + candidate.height / 2,
          candidate.y + candidate.height,
        )
      })
      const xPoints = [
        { offset: 0, value: nextX },
        { offset: element.width / 2, value: nextX + element.width / 2 },
        { offset: element.width, value: nextX + element.width },
      ]
      const yPoints = [
        { offset: 0, value: nextY },
        { offset: element.height / 2, value: nextY + element.height / 2 },
        { offset: element.height, value: nextY + element.height },
      ]
      for (const point of xPoints) {
        const snapped = nearestSnap(point.value, verticalCandidates, tolerance)
        if (snapped !== null) {
          nextX = snapped - point.offset
          verticalGuides.push(snapped)
          break
        }
      }
      for (const point of yPoints) {
        const snapped = nearestSnap(point.value, horizontalCandidates, tolerance)
        if (snapped !== null) {
          nextY = snapped - point.offset
          horizontalGuides.push(snapped)
          break
        }
      }
    }
    node.position({
      x: clamp(nextX, -element.width + 12, CARD_WIDTH - 12),
      y: clamp(nextY, -element.height + 12, CARD_HEIGHT - 12),
    })
    setAlignmentGuides({
      vertical: verticalGuides,
      horizontal: horizontalGuides,
    })
  }

  return (
    <div className="t2c-canvas-viewport" ref={containerRef}>
      <div
        className="t2c-canvas-ruler t2c-canvas-ruler--horizontal"
        style={{ width: stageWidth }}
        aria-hidden="true"
        onDoubleClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          onAddGuide?.(
            'vertical',
            clamp(((event.clientX - rect.left) / rect.width) * CARD_WIDTH, 0, CARD_WIDTH),
          )
        }}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span style={{ left: `${index * 10}%` }} key={index}>
            {index * 10}
          </span>
        ))}
      </div>
      <div
        className="t2c-canvas-ruler t2c-canvas-ruler--vertical"
        style={{ height: stageHeight }}
        aria-hidden="true"
        onDoubleClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          onAddGuide?.(
            'horizontal',
            clamp(((event.clientY - rect.top) / rect.height) * CARD_HEIGHT, 0, CARD_HEIGHT),
          )
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <span style={{ top: `${index * 20}%` }} key={index}>
            {index * 10}
          </span>
        ))}
      </div>
      <div
        className="t2c-canvas-stage-shell"
        style={{ width: stageWidth, height: stageHeight }}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={displayScale}
          scaleY={displayScale}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) onSelect(null)
          }}
          onTouchStart={(event) => {
            if (event.target === event.target.getStage()) onSelect(null)
          }}
          onContextMenu={(event) => {
            event.evt.preventDefault()
            onContextMenu({
              x: event.evt.clientX,
              y: event.evt.clientY,
              elementId: null,
            })
          }}
        >
          <BackgroundLayer background={document.background} showGrid={showGrid} />
          <Layer>
            {visibleElements.map((element) => (
              <ElementNode
                key={element.id}
                element={element}
                profileFields={profileFields}
                selected={selectedIds.includes(element.id)}
                registerNode={registerNode}
                onSelect={onSelect}
                onOpenTextEdit={onOpenTextEdit}
                onContextMenu={onContextMenu}
                onDragMove={(id, node) => snapNode(id, node)}
                onDragEnd={(id, node) => {
                  const source = document.elements.find((item) => item.id === id)
                  setAlignmentGuides({ horizontal: [], vertical: [] })
                  if (!source) return
                  onCommitElements(
                    [
                      {
                        id,
                        patch: {
                          x: node.x(),
                          y: node.y(),
                        },
                      },
                    ],
                    `Move ${source.name}`,
                  )
                }}
                onTransformEnd={(id, node) => {
                  const source = document.elements.find((item) => item.id === id)
                  if (!source) return
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()
                  node.scaleX(1)
                  node.scaleY(1)
                  onCommitElements(
                    [
                      {
                        id,
                        patch: {
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(20, source.width * scaleX),
                          height: Math.max(20, source.height * scaleY),
                          rotation: node.rotation(),
                        },
                      },
                    ],
                    `Transform ${source.name}`,
                  )
                }}
              />
            ))}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={5}
              keepRatio={
                selectedIds.length === 1
                && Boolean(
                  document.elements.find((element) => element.id === selectedIds[0])
                    ?.maintainProportion,
                )
              }
              anchorFill="#ffffff"
              anchorStroke="#2563eb"
              anchorStrokeWidth={2}
              anchorSize={10 / Math.max(displayScale, 0.5)}
              borderStroke="#2563eb"
              borderStrokeWidth={2 / Math.max(displayScale, 0.5)}
              rotateAnchorOffset={26 / Math.max(displayScale, 0.5)}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) return oldBox
                return newBox
              }}
            />
          </Layer>
          <Layer>
            {showSafeArea ? (
              <Rect
                x={SAFE_MARGIN}
                y={SAFE_MARGIN}
                width={CARD_WIDTH - SAFE_MARGIN * 2}
                height={CARD_HEIGHT - SAFE_MARGIN * 2}
                stroke="#2563eb"
                strokeWidth={1.5}
                dash={[7, 6]}
                opacity={0.8}
                listening={false}
              />
            ) : null}
            {showBleed ? (
              <Rect
                x={2}
                y={2}
                width={CARD_WIDTH - 4}
                height={CARD_HEIGHT - 4}
                stroke="#ef4444"
                strokeWidth={1.5}
                dash={[8, 6]}
                opacity={0.66}
                listening={false}
              />
            ) : null}
            {document.guides.vertical.map((guide, index) => (
              <Line
                key={`manual-v-${index}`}
                x={guide}
                points={[0, 0, 0, CARD_HEIGHT]}
                stroke="#06b6d4"
                strokeWidth={3}
                hitStrokeWidth={14}
                draggable
                dragBoundFunc={(position) => ({
                  x: clamp(position.x, 0, CARD_WIDTH),
                  y: 0,
                })}
                onDragEnd={(event) =>
                  onMoveGuide?.('vertical', index, event.target.x())
                }
              />
            ))}
            {document.guides.horizontal.map((guide, index) => (
              <Line
                key={`manual-h-${index}`}
                y={guide}
                points={[0, 0, CARD_WIDTH, 0]}
                stroke="#06b6d4"
                strokeWidth={3}
                hitStrokeWidth={14}
                draggable
                dragBoundFunc={(position) => ({
                  x: 0,
                  y: clamp(position.y, 0, CARD_HEIGHT),
                })}
                onDragEnd={(event) =>
                  onMoveGuide?.('horizontal', index, event.target.y())
                }
              />
            ))}
            {alignmentGuides.vertical.map((guide, index) => (
              <Line
                key={`snap-v-${index}`}
                points={[guide, 0, guide, CARD_HEIGHT]}
                stroke="#06b6d4"
                strokeWidth={2}
                listening={false}
              />
            ))}
            {alignmentGuides.horizontal.map((guide, index) => (
              <Line
                key={`snap-h-${index}`}
                points={[0, guide, CARD_WIDTH, guide]}
                stroke="#06b6d4"
                strokeWidth={2}
                listening={false}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
})
