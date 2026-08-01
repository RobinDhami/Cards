import type {
  CardDocument,
  CardSide,
  DesignSnapshot,
  EditorElement,
  EditorValidationIssue,
  ProfileFields,
} from './types'
import { CARD_HEIGHT, CARD_WIDTH, SAFE_MARGIN } from './defaults'

const PROFILE_TOKEN = /\{\{([a-z_]+)\}\}/g

export function deepClone<T>(value: T): T {
  return structuredClone(value)
}

export function resolveProfileTokens(value: string, fields: ProfileFields) {
  return value.replace(PROFILE_TOKEN, (_, key: keyof ProfileFields) => {
    const replacement = fields[key]
    return typeof replacement === 'string' ? replacement : ''
  })
}

export function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function readableBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function colorLuminance(hex: string) {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function contrastRatio(first: string, second: string) {
  const firstLuminance = colorLuminance(first)
  const secondLuminance = colorLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function validateDocument(
  side: CardSide,
  document: CardDocument,
  profileFields: ProfileFields,
) {
  const issues: EditorValidationIssue[] = []
  document.elements.forEach((element) => {
    if (!element.visible) return
    const outside =
      element.x < 0
      || element.y < 0
      || element.x + element.width > CARD_WIDTH
      || element.y + element.height > CARD_HEIGHT
    if (outside) {
      issues.push({
        id: `${side}-${element.id}-outside`,
        level: 'error',
        side,
        elementId: element.id,
        title: `${element.name} crosses the card edge`,
        detail: 'Move or resize it so the complete element stays inside the card.',
      })
    }
    const outsideSafe =
      element.x < SAFE_MARGIN
      || element.y < SAFE_MARGIN
      || element.x + element.width > CARD_WIDTH - SAFE_MARGIN
      || element.y + element.height > CARD_HEIGHT - SAFE_MARGIN
    if (outsideSafe) {
      issues.push({
        id: `${side}-${element.id}-safe`,
        level: 'warning',
        side,
        elementId: element.id,
        title: `${element.name} is outside the safe area`,
        detail: 'Important text and QR codes should sit inside the blue safe-area guide.',
      })
    }
    if (element.type === 'text') {
      const resolvedText = resolveProfileTokens(element.text ?? '', profileFields).trim()
      if (!resolvedText) {
        issues.push({
          id: `${side}-${element.id}-empty`,
          level: 'warning',
          side,
          elementId: element.id,
          title: `${element.name} is empty`,
          detail: 'Add content or remove this text element.',
        })
      }
      const fontSize = element.style.fontSize ?? 18
      const estimatedLines = Math.max(
        1,
        Math.ceil((resolvedText.length * fontSize * 0.55) / Math.max(element.width, 1)),
      )
      if (estimatedLines * fontSize * (element.style.lineHeight ?? 1.2) > element.height + 6) {
        issues.push({
          id: `${side}-${element.id}-overflow`,
          level: 'warning',
          side,
          elementId: element.id,
          title: `${element.name} may overflow`,
          detail: 'Increase its text box height or reduce the font size.',
        })
      }
    }
    if (element.type === 'qr') {
      const options = element.qrOptions
      const background =
        options?.transparent
          ? document.background.color
          : options?.background ?? '#ffffff'
      if (Math.min(element.width, element.height) < 150) {
        issues.push({
          id: `${side}-${element.id}-small`,
          level: 'error',
          side,
          elementId: element.id,
          title: 'QR code may be too small to scan',
          detail: 'Keep the QR code at least 15 mm wide for reliable printing.',
        })
      }
      if (contrastRatio(options?.foreground ?? '#111111', background) < 4.5) {
        issues.push({
          id: `${side}-${element.id}-contrast`,
          level: 'error',
          side,
          elementId: element.id,
          title: 'QR contrast is too low',
          detail: 'Use a darker foreground and a lighter background.',
        })
      }
      if (!resolveProfileTokens(element.qrValue ?? '', profileFields).trim()) {
        issues.push({
          id: `${side}-${element.id}-value`,
          level: 'error',
          side,
          elementId: element.id,
          title: 'QR code has no destination',
          detail: 'Connect it to a profile, contact, website, or custom URL.',
        })
      }
    }
    if (element.type === 'image' && element.assetUrl?.startsWith('data:')) {
      issues.push({
        id: `${side}-${element.id}-local-image`,
        level: 'warning',
        side,
        elementId: element.id,
        title: `${element.name} is only stored locally`,
        detail: 'Sign in and upload it to your private media library before ordering.',
      })
    }
  })
  return issues
}

export function validateSnapshot(
  snapshot: DesignSnapshot,
  profileFields: ProfileFields,
): EditorValidationIssue[] {
  const issues = [
    ...validateDocument('front', snapshot.front, profileFields),
    ...validateDocument('back', snapshot.back, profileFields),
  ]
  if (!snapshot.front.elements.some((element) => element.type === 'text' && element.visible)) {
    issues.unshift({
      id: 'front-required-text',
      level: 'error',
      side: 'front',
      title: 'Front card needs an identity',
      detail: 'Add a name or another identifying text field.',
    })
  }
  return issues
}

export function selectedElements(
  document: CardDocument,
  selectedIds: string[],
): EditorElement[] {
  const selected = new Set(selectedIds)
  return document.elements.filter((element) => selected.has(element.id))
}

export function elementPatch(
  document: CardDocument,
  ids: string[],
  patch: Partial<EditorElement>,
): CardDocument {
  const selected = new Set(ids)
  return {
    ...document,
    elements: document.elements.map((element) =>
      selected.has(element.id) ? { ...element, ...patch } : element,
    ),
  }
}

