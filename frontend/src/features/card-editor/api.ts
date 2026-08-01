import { apiFetch, jsonBody } from '../../lib/api'
import type {
  CardAssetRecord,
  CardDesignRecord,
  CardDocument,
  CardTemplateRecord,
  EditorBootstrap,
} from './types'

type DesignResponse = { ok: true; design: CardDesignRecord }
type TemplateResponse = { ok: true; template: CardTemplateRecord }

export function loadEditorBootstrap() {
  return apiFetch<EditorBootstrap>('/api/card-designer/bootstrap/')
}

export function createDesign(payload: {
  name: string
  finish: string
  frontData: CardDocument
  backData: CardDocument
  sourceTemplateId?: string | null
}) {
  return apiFetch<DesignResponse>('/api/card-designer/designs/', {
    method: 'POST',
    body: jsonBody(payload),
  })
}

export function updateDesign(
  designId: string,
  payload: {
    name: string
    finish: string
    frontData: CardDocument
    backData: CardDocument
    createRevision?: boolean
    reason?: string
    status?: string
  },
) {
  return apiFetch<DesignResponse>(`/api/card-designer/designs/${designId}/`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

export function duplicateDesign(designId: string) {
  return apiFetch<DesignResponse>(`/api/card-designer/designs/${designId}/`, {
    method: 'POST',
    body: jsonBody({ action: 'duplicate' }),
  })
}

export function loadDesign(designId: string) {
  return apiFetch<DesignResponse>(`/api/card-designer/designs/${designId}/`)
}

export function loadDesignRevisions(designId: string) {
  return apiFetch<{
    ok: true
    revisions: Array<{
      version: number
      name: string
      reason: string
      createdAt: string
    }>
  }>(`/api/card-designer/designs/${designId}/revisions/`)
}

export function restoreDesignRevision(designId: string, version: number) {
  return apiFetch<DesignResponse>(
    `/api/card-designer/designs/${designId}/revisions/${version}/restore/`,
    {
      method: 'POST',
      body: jsonBody({ confirm: true }),
    },
  )
}

export function uploadAsset(file: File, assetType: string, isGlobal = false) {
  const form = new FormData()
  form.set('file', file)
  form.set('name', file.name)
  form.set('assetType', assetType)
  form.set('isGlobal', String(isGlobal))
  return apiFetch<{ ok: true; asset: CardAssetRecord }>('/api/card-designer/assets/', {
    method: 'POST',
    body: form,
  })
}

export function saveTemplate(payload: {
  name: string
  description: string
  category: string
  frontData: CardDocument
  backData: CardDocument
  supportsBack: boolean
  isFeatured: boolean
  isPremium: boolean
  eligibleAccountTypes: string[]
  sortOrder: number
}) {
  return apiFetch<TemplateResponse>('/api/card-designer/templates/', {
    method: 'POST',
    body: jsonBody(payload),
  })
}

export function loadManagedTemplates() {
  return apiFetch<{ ok: true; templates: CardTemplateRecord[] }>(
    '/api/card-designer/templates/?manage=1',
  )
}

export function updateTemplate(
  templateId: string,
  payload: Partial<CardTemplateRecord>,
) {
  return apiFetch<TemplateResponse>(`/api/card-designer/templates/${templateId}/`, {
    method: 'PATCH',
    body: jsonBody(payload),
  })
}

export function templateAction(
  templateId: string,
  action: 'publish' | 'unpublish' | 'archive' | 'duplicate',
) {
  return apiFetch<TemplateResponse>(`/api/card-designer/templates/${templateId}/`, {
    method: 'POST',
    body: jsonBody({ action, confirm: true }),
  })
}

export function deleteTemplate(templateId: string) {
  return apiFetch<{ ok: true }>(`/api/card-designer/templates/${templateId}/`, {
    method: 'DELETE',
    body: jsonBody({ confirm: true }),
  })
}
