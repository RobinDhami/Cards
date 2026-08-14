import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Copy from 'lucide-react/dist/esm/icons/copy.js'
import Expand from 'lucide-react/dist/esm/icons/expand.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import Grid3X3 from 'lucide-react/dist/esm/icons/grid-3-x-3.js'
import History from 'lucide-react/dist/esm/icons/history.js'
import Lock from 'lucide-react/dist/esm/icons/lock.js'
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2.js'
import Menu from 'lucide-react/dist/esm/icons/menu.js'
import Minus from 'lucide-react/dist/esm/icons/minus.js'
import PanelLeftClose from 'lucide-react/dist/esm/icons/panel-left-close.js'
import PanelLeftOpen from 'lucide-react/dist/esm/icons/panel-left-open.js'
import PanelRightClose from 'lucide-react/dist/esm/icons/panel-right-close.js'
import PanelRightOpen from 'lucide-react/dist/esm/icons/panel-right-open.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Redo2 from 'lucide-react/dist/esm/icons/redo-2.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import ScanLine from 'lucide-react/dist/esm/icons/scan-line.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import Undo2 from 'lucide-react/dist/esm/icons/undo-2.js'
import Unlock from 'lucide-react/dist/esm/icons/unlock.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { displayError } from '../../lib/api'
import { CardCanvas, type CanvasElementPatch } from './CardCanvas'
import {
  InlineTextEditor,
  EditorInspectorPanel,
  EditorLibraryPanel,
  EditorToolRail,
} from './EditorPanels'
import {
  PreviewDialog,
  TemplateManager,
  VersionHistoryDialog,
} from './EditorDialogs'
import {
  createDesign,
  duplicateDesign as duplicateRemoteDesign,
  loadDesign,
  loadDesignRevisions,
  loadEditorBootstrap,
  restoreDesignRevision,
  updateDesign,
  uploadAsset,
} from './api'
import {
  SAMPLE_PROFILE_FIELDS,
  createBlankSnapshot,
  createDecorationElement,
  createFallbackTemplates,
  createIconElement,
  createImageElement,
  createInitialSnapshot,
  createLineElement,
  createQrElement,
  createShapeElement,
  createTextElement,
  nextEditorElementId,
} from './defaults'
import type {
  BackgroundSettings,
  CardAssetRecord,
  CardDesignerProps,
  CardDesignRecord,
  CardDocument,
  CardSide,
  CardTemplateRecord,
  DesignSnapshot,
  DecorationType,
  EditorBootstrap,
  EditorElement,
  EditorTool,
  EditorValidationIssue,
  IconType,
  SaveStatus,
  ShapeType,
} from './types'
import { editorTools } from './tools'
import {
  deepClone,
  elementPatch,
  moveItem,
  selectedElements,
  validateSnapshot,
} from './utils'
import './CardEditor.css'

const LOCAL_DRAFT_KEY = 'tap2connect-card-editor-v2'
const HISTORY_LIMIT = 80

type LocalDraft = {
  version: 2
  snapshot: DesignSnapshot
  designId: string | null
  currentTemplateId: string | null
  savedAt: string
}

type ContextMenuState = {
  x: number
  y: number
  elementId: string | null
} | null

function documentForSide(snapshot: DesignSnapshot, side: CardSide) {
  return side === 'front' ? snapshot.front : snapshot.back
}

function replaceDocument(
  snapshot: DesignSnapshot,
  side: CardSide,
  document: CardDocument,
): DesignSnapshot {
  return side === 'front'
    ? { ...snapshot, front: document }
    : { ...snapshot, back: document }
}

function safeLocalDraft(): LocalDraft | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) || 'null')
    return value?.version === 2 && value.snapshot ? value : null
  } catch {
    return null
  }
}

function saveStatusLabel(status: SaveStatus, authenticated: boolean) {
  if (status === 'saving') return 'Savingâ€¦'
  if (status === 'error') return 'Save failed'
  if (status === 'offline') return authenticated ? 'Saved locally' : 'Local draft'
  if (status === 'saved') return 'All changes saved'
  return 'Unsaved changes'
}

export function AdvancedCardEditor({
  open,
  initialFrontDesign,
  initialBackDesign,
  finish,
  mode = 'design',
  initialTemplateId = null,
  onClose,
}: CardDesignerProps) {
  const fallbackTemplates = useMemo(createFallbackTemplates, [])
  const initialSnapshot = useMemo(
    () => createInitialSnapshot(initialFrontDesign, initialBackDesign, finish),
    [finish, initialBackDesign, initialFrontDesign],
  )
  const [snapshot, setSnapshot] = useState<DesignSnapshot>(initialSnapshot)
  const [side, setSide] = useState<CardSide>('front')
  const [activeTool, setActiveTool] = useState<EditorTool>('templates')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [past, setPast] = useState<DesignSnapshot[]>([])
  const [future, setFuture] = useState<DesignSnapshot[]>([])
  const [bootstrap, setBootstrap] = useState<EditorBootstrap | null>(null)
  const [templates, setTemplates] = useState<CardTemplateRecord[]>(fallbackTemplates)
  const [assets, setAssets] = useState<CardAssetRecord[]>([])
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    `built-in-${initialFrontDesign}`,
  )
  const [design, setDesign] = useState<CardDesignRecord | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const [lastAction, setLastAction] = useState('Open editor')
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [showSafeArea, setShowSafeArea] = useState(true)
  const [showBleed, setShowBleed] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [snapToElements, setSnapToElements] = useState(true)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [revisions, setRevisions] = useState<
    Array<{ version: number; name: string; reason: string; createdAt: string }>
  >([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [inlineTextId, setInlineTextId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false)
  const [topMenuOpen, setTopMenuOpen] = useState(false)
  const clipboardRef = useRef<EditorElement[]>([])
  const openedRef = useRef(false)
  const templateStudioOpenedRef = useRef(false)
  const remoteSaveInFlightRef = useRef(false)
  const latestSnapshotRef = useRef(snapshot)
  const latestDesignRef = useRef(design)

  const currentDocument = documentForSide(snapshot, side)
  const profileFields = bootstrap?.profileFields ?? SAMPLE_PROFILE_FIELDS
  const authenticated = bootstrap?.authenticated ?? false
  const isSuperuser = bootstrap?.isSuperuser ?? false
  const selected = selectedElements(currentDocument, selectedIds)
  const inlineTextElement =
    currentDocument.elements.find((element) => element.id === inlineTextId) ?? null
  const validationIssues = useMemo(
    () => validateSnapshot(snapshot, profileFields),
    [profileFields, snapshot],
  )

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    latestDesignRef.current = design
  }, [design])

  const commitSnapshot = useCallback(
    (next: DesignSnapshot, label: string) => {
      setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), latestSnapshotRef.current])
      setFuture([])
      setSnapshot(next)
      latestSnapshotRef.current = next
      setDirty(true)
      setSaveStatus('idle')
      setLastAction(label)
    },
    [],
  )

  const commitDocument = useCallback(
    (nextDocument: CardDocument, label: string) => {
      commitSnapshot(replaceDocument(latestSnapshotRef.current, side, nextDocument), label)
    },
    [commitSnapshot, side],
  )

  const updateSelected = useCallback(
    (patch: Partial<EditorElement>, label: string) => {
      if (!selectedIds.length) return
      commitDocument(elementPatch(currentDocument, selectedIds, patch), label)
    },
    [commitDocument, currentDocument, selectedIds],
  )

  const updateSelectedStyle = useCallback(
    (stylePatch: Partial<EditorElement['style']>, label: string) => {
      if (!selectedIds.length) return
      const selectedSet = new Set(selectedIds)
      commitDocument(
        {
          ...currentDocument,
          elements: currentDocument.elements.map((element) =>
            selectedSet.has(element.id)
              ? { ...element, style: { ...element.style, ...stylePatch } }
              : element,
          ),
        },
        label,
      )
    },
    [commitDocument, currentDocument, selectedIds],
  )

  const addElement = useCallback(
    (element: EditorElement, label: string) => {
      commitDocument(
        { ...currentDocument, elements: [...currentDocument.elements, element] },
        label,
      )
      setSelectedIds([element.id])
      if (window.matchMedia('(max-width: 760px)').matches) {
        setRightCollapsed(false)
      }
    },
    [commitDocument, currentDocument],
  )

  const changeOrientation = useCallback((orientation: 'landscape' | 'portrait') => {
    const target = orientation === 'portrait' ? { width: 540, height: 860 } : { width: 860, height: 540 }
    const transformDocument = (document: CardDocument): CardDocument => {
      const scaleX = target.width / document.size.width
      const scaleY = target.height / document.size.height
      return {
        ...document,
        size: target,
        guides: {
          vertical: document.guides.vertical.map((value) => value * scaleX),
          horizontal: document.guides.horizontal.map((value) => value * scaleY),
        },
        elements: document.elements.map((element) => ({
          ...element,
          x: element.x * scaleX,
          y: element.y * scaleY,
          width: element.width * scaleX,
          height: element.height * scaleY,
        })),
      }
    }
    commitSnapshot(
      { ...latestSnapshotRef.current, front: transformDocument(latestSnapshotRef.current.front), back: transformDocument(latestSnapshotRef.current.back) },
      `Switch to ${orientation} CR80`,
    )
    setSelectedIds([])
    setZoom(1)
  }, [commitSnapshot])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!openedRef.current) {
      const localDraft = safeLocalDraft()
      if (localDraft && !initialTemplateId) {
        setSnapshot(localDraft.snapshot)
        latestSnapshotRef.current = localDraft.snapshot
        setCurrentTemplateId(localDraft.currentTemplateId)
        if (localDraft.designId) {
          setDesign({
            id: localDraft.designId,
            name: localDraft.snapshot.name,
            finish: localDraft.snapshot.finish,
            status: 'draft',
            currentRevision: 0,
            sourceTemplateId: localDraft.currentTemplateId,
            sourceTemplateVersion: null,
            lastSavedAt: localDraft.savedAt,
            updatedAt: localDraft.savedAt,
            createdAt: localDraft.savedAt,
          })
        }
        setSaveStatus('offline')
      } else {
        setSnapshot(initialSnapshot)
        latestSnapshotRef.current = initialSnapshot
      }
      openedRef.current = true
    }
    loadEditorBootstrap()
      .then(async (response) => {
        setBootstrap(response)
        setTemplates(() => {
          const remote = response.templates.length ? response.templates : []
          const remoteKeys = new Set(remote.flatMap((template) => [template.id, template.slug]))
          return [...remote, ...fallbackTemplates.filter((template) => !remoteKeys.has(template.id) && !remoteKeys.has(template.slug))]
        })
        setAssets(response.assets)
        if (initialTemplateId) {
          const initialTemplate = response.templates.find((template) => template.id === initialTemplateId)
          if (initialTemplate) {
            const templateSnapshot: DesignSnapshot = {
              name: `${initialTemplate.name} card`,
              finish,
              front: deepClone(initialTemplate.frontData),
              back: deepClone(initialTemplate.backData),
            }
            setSnapshot(templateSnapshot)
            latestSnapshotRef.current = templateSnapshot
            setCurrentTemplateId(initialTemplate.id)
            setDesign(null)
            setDirty(false)
            setLastAction(`Open ${initialTemplate.name} template`)
          }
        }
        if (mode === 'template-studio' && response.isSuperuser && !templateStudioOpenedRef.current) {
          templateStudioOpenedRef.current = true
          setTemplateManagerOpen(true)
          setActiveTool('text')
          setMessage('Design with placeholders, then publish from Template Studio.')
        }
        setSaveStatus((current) =>
          response.authenticated
            ? current === 'offline'
              ? 'saved'
              : current
            : 'offline',
        )
        const localDraft = safeLocalDraft()
        if (response.authenticated && localDraft?.designId) {
          try {
            const designResponse = await loadDesign(localDraft.designId)
            const loaded = designResponse.design
            if (loaded.frontData && loaded.backData) {
              const loadedSnapshot: DesignSnapshot = {
                name: loaded.name,
                finish: loaded.finish,
                front: loaded.frontData,
                back: loaded.backData,
              }
              setDesign(loaded)
              setSnapshot(loadedSnapshot)
              latestSnapshotRef.current = loadedSnapshot
              setDirty(false)
              setSaveStatus('saved')
            }
          } catch {
            setDesign(null)
          }
        }
      })
      .catch((error) => {
        setMessage(displayError(error))
        setSaveStatus('offline')
      })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [fallbackTemplates, finish, initialSnapshot, initialTemplateId, mode, open])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      const localDraft: LocalDraft = {
        version: 2,
        snapshot,
        designId: design?.id ?? null,
        currentTemplateId,
        savedAt: new Date().toISOString(),
      }
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(localDraft))
      window.sessionStorage.setItem('tap2connect-card-editor', JSON.stringify(localDraft))
      window.sessionStorage.setItem(
        'tap2connect-card-order',
        JSON.stringify({
          designId: design?.id ?? null,
          finish: snapshot.finish,
          customEditor: true,
          version: 2,
        }),
      )
      if (!authenticated && dirty) setSaveStatus('offline')
    }, 350)
    return () => window.clearTimeout(timer)
  }, [authenticated, currentTemplateId, design?.id, dirty, open, snapshot])

  const persistDesign = useCallback(
    async (createRevision = false, reason = 'autosave') => {
      if (!authenticated || remoteSaveInFlightRef.current) return latestDesignRef.current
      remoteSaveInFlightRef.current = true
      setSaveStatus('saving')
      let hasNewerChanges = false
      try {
        const current = latestSnapshotRef.current
        const currentDesign = latestDesignRef.current
        const response = currentDesign?.id
          ? await updateDesign(currentDesign.id, {
              name: current.name,
              finish: current.finish,
              frontData: current.front,
              backData: current.back,
              createRevision,
              reason,
            })
          : await createDesign({
              name: current.name,
              finish: current.finish,
              frontData: current.front,
              backData: current.back,
              sourceTemplateId:
                currentTemplateId && !currentTemplateId.startsWith('built-in-')
                  ? currentTemplateId
                  : null,
            })
        setDesign(response.design)
        latestDesignRef.current = response.design
        hasNewerChanges = latestSnapshotRef.current !== current
        if (hasNewerChanges) {
          setDirty(true)
          setSaveStatus('idle')
        } else {
          setDirty(false)
          setSaveStatus('saved')
        }
        return response.design
      } catch (error) {
        setMessage(displayError(error))
        setSaveStatus('error')
        return latestDesignRef.current
      } finally {
        remoteSaveInFlightRef.current = false
        if (hasNewerChanges) {
          window.setTimeout(() => {
            void persistDesign(false, 'autosave')
          }, 0)
        }
      }
    },
    [authenticated, currentTemplateId],
  )

  const manualSave = useCallback(async () => {
    if (authenticated) return persistDesign(true, 'manual')

    const current = latestSnapshotRef.current
    const savedAt = new Date().toISOString()
    const localDraft: LocalDraft = {
      version: 2,
      snapshot: current,
      designId: latestDesignRef.current?.id ?? null,
      currentTemplateId,
      savedAt,
    }
    window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(localDraft))
    window.sessionStorage.setItem('tap2connect-card-editor', JSON.stringify(localDraft))
    setSaveStatus('offline')
    setMessage('Draft saved on this device. Sign in when you are ready to keep it with your account.')
    return latestDesignRef.current
  }, [authenticated, currentTemplateId, persistDesign])

  useEffect(() => {
    if (!open || !authenticated || !dirty) return
    const timer = window.setTimeout(() => {
      void persistDesign(false, 'autosave')
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [authenticated, dirty, open, persistDesign, snapshot])

  useEffect(() => {
    if (!open) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty, open])

  const undo = useCallback(() => {
    const previous = past[past.length - 1]
    if (!previous) return
    setFuture((items) => [latestSnapshotRef.current, ...items].slice(0, HISTORY_LIMIT))
    setPast((items) => items.slice(0, -1))
    setSnapshot(previous)
    latestSnapshotRef.current = previous
    setSelectedIds([])
    setDirty(true)
    setSaveStatus('idle')
    setLastAction('Undo')
  }, [past])

  const redo = useCallback(() => {
    const next = future[0]
    if (!next) return
    setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), latestSnapshotRef.current])
    setFuture((items) => items.slice(1))
    setSnapshot(next)
    latestSnapshotRef.current = next
    setSelectedIds([])
    setDirty(true)
    setSaveStatus('idle')
    setLastAction('Redo')
  }, [future])

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length) return
    const selectedSet = new Set(selectedIds)
    const groupMap = new Map<string, string>()
    const duplicates = currentDocument.elements
      .filter((element) => selectedSet.has(element.id))
      .map((element) => {
        let groupId = element.groupId
        if (groupId) {
          if (!groupMap.has(groupId)) groupMap.set(groupId, nextEditorElementId('group'))
          groupId = groupMap.get(groupId)
        }
        return {
          ...deepClone(element),
          id: nextEditorElementId(element.type),
          name: `${element.name} copy`,
          x: element.x + 20,
          y: element.y + 20,
          groupId,
        }
      })
    commitDocument(
      { ...currentDocument, elements: [...currentDocument.elements, ...duplicates] },
      'Duplicate selection',
    )
    setSelectedIds(duplicates.map((element) => element.id))
  }, [commitDocument, currentDocument, selectedIds])

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return
    const selectedSet = new Set(selectedIds)
    commitDocument(
      {
        ...currentDocument,
        elements: currentDocument.elements.filter((element) => !selectedSet.has(element.id)),
      },
      'Delete selection',
    )
    setSelectedIds([])
  }, [commitDocument, currentDocument, selectedIds])

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current.length) return
    const copies = clipboardRef.current.map((element) => ({
      ...deepClone(element),
      id: nextEditorElementId(element.type),
      x: element.x + 24,
      y: element.y + 24,
      groupId: undefined,
    }))
    commitDocument(
      { ...currentDocument, elements: [...currentDocument.elements, ...copies] },
      'Paste elements',
    )
    setSelectedIds(copies.map((element) => element.id))
  }, [commitDocument, currentDocument])

  useEffect(() => {
    if (!open) return
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing =
        target?.matches('input, textarea, select, [contenteditable="true"]') ?? false
      const command = event.ctrlKey || event.metaKey

      if (event.key === 'Escape') {
        if (contextMenu) setContextMenu(null)
        else if (inlineTextId) setInlineTextId(null)
        else setSelectedIds([])
        return
      }
      if (isEditing && !(command && ['s', 'z', 'y'].includes(event.key.toLowerCase()))) return
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void manualSave()
        return
      }
      if (command && event.key.toLowerCase() === 'c') {
        clipboardRef.current = selected.map((element) => deepClone(element))
        return
      }
      if (command && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteClipboard()
        return
      }
      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
        return
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && selectedIds.length) {
        event.preventDefault()
        const amount = event.shiftKey ? 10 : 1
        const delta = {
          x: event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0,
          y: event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0,
        }
        const selectedSet = new Set(selectedIds)
        commitDocument(
          {
            ...currentDocument,
            elements: currentDocument.elements.map((element) =>
              selectedSet.has(element.id)
                ? { ...element, x: element.x + delta.x, y: element.y + delta.y }
                : element,
            ),
          },
          'Nudge selection',
        )
      }
    }
    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [
    commitDocument,
    contextMenu,
    currentDocument,
    deleteSelected,
    duplicateSelected,
    inlineTextId,
    open,
    pasteClipboard,
    manualSave,
    redo,
    selected,
    selectedIds,
    undo,
  ])

  if (!open) return null

  const selectElement = (id: string | null, additive = false) => {
    setContextMenu(null)
    if (!id) {
      setSelectedIds([])
      return
    }
    const element = currentDocument.elements.find((candidate) => candidate.id === id)
    const groupedIds = element?.groupId
      ? currentDocument.elements
          .filter((candidate) => candidate.groupId === element.groupId)
          .map((candidate) => candidate.id)
      : [id]
    setSelectedIds((current) => {
      if (!additive) return groupedIds
      const next = new Set(current)
      groupedIds.forEach((groupedId) => {
        if (next.has(groupedId)) next.delete(groupedId)
        else next.add(groupedId)
      })
      return [...next]
    })
    if (window.matchMedia('(max-width: 760px)').matches) {
      setRightCollapsed(false)
    }
  }

  const applyTemplate = (template: CardTemplateRecord) => {
    commitSnapshot(
      {
        ...snapshot,
        front: deepClone(template.frontData),
        back: deepClone(template.backData),
      },
      `Apply ${template.name} template`,
    )
    setCurrentTemplateId(template.id)
    setSelectedIds([])
    setTemplateManagerOpen(false)
  }

  const createBlankDesign = () => {
    const blank = createBlankSnapshot(finish)
    commitSnapshot(blank, 'Create blank design')
    setCurrentTemplateId(null)
    setDesign(null)
    latestDesignRef.current = null
    setSelectedIds([])
    setSide('front')
    setTemplateManagerOpen(false)
  }

  const handleCanvasPatches = (patches: CanvasElementPatch[], label: string) => {
    const patchMap = new Map(patches.map((item) => [item.id, item.patch]))
    const sourcePatch = patches[0]
    const source = currentDocument.elements.find((element) => element.id === sourcePatch?.id)
    if (source?.groupId && sourcePatch.patch.x !== undefined && sourcePatch.patch.y !== undefined) {
      const deltaX = sourcePatch.patch.x - source.x
      const deltaY = sourcePatch.patch.y - source.y
      currentDocument.elements
        .filter((element) => element.groupId === source.groupId && element.id !== source.id)
        .forEach((element) => {
          patchMap.set(element.id, {
            x: element.x + deltaX,
            y: element.y + deltaY,
          })
        })
    }
    commitDocument(
      {
        ...currentDocument,
        elements: currentDocument.elements.map((element) => {
          const patch = patchMap.get(element.id)
          return patch ? { ...element, ...patch } : element
        }),
      },
      label,
    )
  }

  const alignSelection = (
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
  ) => {
    if (!selected.length) return
    const selectedSet = new Set(selectedIds)
    const minX = Math.min(...selected.map((element) => element.x))
    const minY = Math.min(...selected.map((element) => element.y))
    const maxX = Math.max(...selected.map((element) => element.x + element.width))
    const maxY = Math.max(...selected.map((element) => element.y + element.height))
    const sortedHorizontal = [...selected].sort((a, b) => a.x - b.x)
    const sortedVertical = [...selected].sort((a, b) => a.y - b.y)
    const first = selected[0]

    const nextElements = currentDocument.elements.map((element) => {
      if (!selectedSet.has(element.id)) return element
      if (action === 'left') return { ...element, x: minX }
      if (action === 'right') return { ...element, x: maxX - element.width }
      if (action === 'top') return { ...element, y: minY }
      if (action === 'bottom') return { ...element, y: maxY - element.height }
      if (action === 'center-horizontal') {
        const center = selected.length === 1 ? 450 : (minX + maxX) / 2
        return { ...element, x: center - element.width / 2 }
      }
      if (action === 'center-vertical') {
        const center = selected.length === 1 ? 250 : (minY + maxY) / 2
        return { ...element, y: center - element.height / 2 }
      }
      if (action === 'match-width') return { ...element, width: first.width }
      if (action === 'match-height') return { ...element, height: first.height }
      if (action === 'distribute-horizontal' && sortedHorizontal.length > 2) {
        const index = sortedHorizontal.findIndex((item) => item.id === element.id)
        const totalWidth = sortedHorizontal.reduce((sum, item) => sum + item.width, 0)
        const gap = (maxX - minX - totalWidth) / (sortedHorizontal.length - 1)
        const x =
          minX
          + sortedHorizontal
              .slice(0, index)
              .reduce((sum, item) => sum + item.width + gap, 0)
        return { ...element, x }
      }
      if (action === 'distribute-vertical' && sortedVertical.length > 2) {
        const index = sortedVertical.findIndex((item) => item.id === element.id)
        const totalHeight = sortedVertical.reduce((sum, item) => sum + item.height, 0)
        const gap = (maxY - minY - totalHeight) / (sortedVertical.length - 1)
        const y =
          minY
          + sortedVertical
              .slice(0, index)
              .reduce((sum, item) => sum + item.height + gap, 0)
        return { ...element, y }
      }
      return element
    })
    commitDocument({ ...currentDocument, elements: nextElements }, 'Align selection')
  }

  const layerAction = (action: 'forward' | 'backward' | 'front' | 'back') => {
    if (!selectedIds.length) return
    const selectedSet = new Set(selectedIds)
    const elements = [...currentDocument.elements]
    if (action === 'front' || action === 'back') {
      const chosen = elements.filter((element) => selectedSet.has(element.id))
      const rest = elements.filter((element) => !selectedSet.has(element.id))
      commitDocument(
        {
          ...currentDocument,
          elements: action === 'front' ? [...rest, ...chosen] : [...chosen, ...rest],
        },
        action === 'front' ? 'Bring to front' : 'Send to back',
      )
      return
    }
    const direction = action === 'forward' ? 1 : -1
    const orderedIds = direction > 0 ? [...selectedIds].reverse() : selectedIds
    orderedIds.forEach((id) => {
      const index = elements.findIndex((element) => element.id === id)
      const target = index + direction
      if (index >= 0 && target >= 0 && target < elements.length) {
        ;[elements[index], elements[target]] = [elements[target], elements[index]]
      }
    })
    commitDocument({ ...currentDocument, elements }, action === 'forward' ? 'Bring forward' : 'Send backward')
  }

  const groupSelected = () => {
    if (selectedIds.length < 2) return
    const groupId = nextEditorElementId('group')
    updateSelected({ groupId }, 'Group elements')
  }

  const ungroupSelected = () => {
    if (!selectedIds.length) return
    updateSelected({ groupId: undefined }, 'Ungroup elements')
  }

  const updateBackground = (patch: Partial<BackgroundSettings>) => {
    commitDocument(
      {
        ...currentDocument,
        background: { ...currentDocument.background, ...patch },
      },
      'Change background',
    )
  }

  const uploadFile = async (file: File, assetType: string, isGlobal: boolean) => {
    setUploading(true)
    setMessage('')
    try {
      if (authenticated) {
        const response = await uploadAsset(file, assetType, isGlobal)
        setAssets((items) => [response.asset, ...items])
        addElement(createImageElement(response.asset.url, response.asset.name, response.asset.id), 'Add uploaded image')
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('Could not read this file.'))
          reader.readAsDataURL(file)
        })
        const localAsset: CardAssetRecord = {
          id: nextEditorElementId('local-asset'),
          name: file.name,
          assetType,
          mimeType: file.type,
          fileSize: file.size,
          isGlobal: false,
          url: dataUrl,
        }
        setAssets((items) => [localAsset, ...items])
        addElement(createImageElement(dataUrl, file.name, localAsset.id), 'Add local image')
        setMessage('This upload is stored locally until you sign in.')
      }
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setUploading(false)
    }
  }

  const openHistory = async () => {
    setHistoryOpen(true)
    setTopMenuOpen(false)
    if (!design?.id) return
    setHistoryLoading(true)
    try {
      const response = await loadDesignRevisions(design.id)
      setRevisions(response.revisions)
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setHistoryLoading(false)
    }
  }

  const restoreRevision = async (version: number) => {
    if (!design?.id) return
    setHistoryLoading(true)
    try {
      const response = await restoreDesignRevision(design.id, version)
      const restored = response.design
      if (restored.frontData && restored.backData) {
        const next: DesignSnapshot = {
          name: restored.name,
          finish: restored.finish,
          front: restored.frontData,
          back: restored.backData,
        }
        commitSnapshot(next, `Restore version ${version}`)
        setDesign(restored)
        setHistoryOpen(false)
      }
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setHistoryLoading(false)
    }
  }

  const saveAsNewDesign = async () => {
    setTopMenuOpen(false)
    if (!authenticated) {
      setMessage('Sign in to save multiple designs. This draft remains stored locally.')
      setSaveStatus('offline')
      return
    }
    const currentDesign = await persistDesign(true, 'manual')
    if (!currentDesign) return
    try {
      const response = await duplicateRemoteDesign(currentDesign.id)
      const duplicate = response.design
      if (duplicate.frontData && duplicate.backData) {
        setSnapshot({
          name: duplicate.name,
          finish: duplicate.finish,
          front: duplicate.frontData,
          back: duplicate.backData,
        })
      }
      setDesign(duplicate)
      setDirty(false)
      setSaveStatus('saved')
      setMessage('A new design copy is ready.')
    } catch (error) {
      setMessage(displayError(error))
    }
  }

  const finalContinue = async () => {
    setPreviewOpen(false)
    if (authenticated) {
      const saved = await persistDesign(true, 'review')
      window.location.assign(
        saved?.id
          ? `/dashboard/?intent=card-order&design=${saved.id}`
          : '/dashboard/?intent=card-order',
      )
      return
    }
    window.location.assign('/login/?intent=card-order&editor=advanced')
  }

  const requestClose = () => {
    if (dirty) {
      setCloseConfirmationOpen(true)
      return
    }
    onClose()
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      setMessage('Fullscreen is not available in this browser.')
    }
  }

  const addGuide = (axis: 'horizontal' | 'vertical') => {
    const guides = currentDocument.guides
    const nextGuides =
      axis === 'horizontal'
        ? { ...guides, horizontal: [...guides.horizontal, 250] }
        : { ...guides, vertical: [...guides.vertical, 450] }
    commitDocument({ ...currentDocument, guides: nextGuides }, `Add ${axis} guide`)
  }

  return (
    <div
      className={`t2c-card-editor${leftCollapsed ? ' is-left-collapsed' : ''}${rightCollapsed ? ' is-right-collapsed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tap2Connect advanced card editor"
    >
      <header className="t2c-editor-topbar">
        <div className="t2c-editor-topbar-left">
          <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect" />
          <div className="t2c-side-switch" aria-label="Card side">
            <button
              type="button"
              className={side === 'front' ? 'is-active' : ''}
              onClick={() => {
                setSide('front')
                setSelectedIds([])
              }}
            >
              Front
            </button>
            <button
              type="button"
              className={side === 'back' ? 'is-active' : ''}
              onClick={() => {
                setSide('back')
                setSelectedIds([])
              }}
            >
              Back
            </button>
          </div>
          <div className="t2c-history-buttons">
            <button type="button" onClick={undo} disabled={!past.length} title="Undo" aria-label="Undo">
              <Undo2 size={17} />
            </button>
            <button type="button" onClick={redo} disabled={!future.length} title="Redo" aria-label="Redo">
              <Redo2 size={17} />
            </button>
          </div>
        </div>

        <div className="t2c-editor-title">
          <input
            value={snapshot.name}
            onChange={(event) => {
              const next = { ...latestSnapshotRef.current, name: event.target.value }
              setSnapshot(next)
              latestSnapshotRef.current = next
              setDirty(true)
              setSaveStatus('idle')
            }}
            aria-label="Design name"
          />
          <span className={`t2c-save-state is-${saveStatus}`}>
            {saveStatus === 'saved' ? <Check size={13} /> : null}
            {saveStatus === 'error' ? <AlertCircle size={13} /> : null}
            {mode === 'template-studio' ? 'Template Studio' : saveStatusLabel(saveStatus, authenticated)}
          </span>
        </div>

        <div className="t2c-editor-topbar-actions">
          <button type="button" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button type="button" onClick={() => void manualSave()}>
            <Save size={16} />
            <span>Save draft</span>
          </button>
          {isSuperuser ? (
            <button type="button" onClick={() => setTemplateManagerOpen(true)}>
              <ScanLine size={16} />
              <span>Publish</span>
            </button>
          ) : (
            <button type="button" onClick={saveAsNewDesign}>
              <Copy size={16} />
              <span>Save as design</span>
            </button>
          )}
          <button
            type="button"
            className="t2c-editor-continue"
            onClick={() => setPreviewOpen(true)}
          >
            Continue
            <ChevronRight size={17} />
          </button>
          <div className="t2c-top-menu-wrap">
            <button
              type="button"
              onClick={() => setTopMenuOpen((current) => !current)}
              aria-label="More editor actions"
              title="More actions"
            >
              <Menu size={18} />
            </button>
            {topMenuOpen ? (
              <div className="t2c-top-menu">
                <button type="button" onClick={openHistory}>
                  <History size={16} />
                  Version history
                </button>
                <button type="button" onClick={toggleFullscreen}>
                  <Maximize2 size={16} />
                  Fullscreen
                </button>
                <button type="button" onClick={saveAsNewDesign}>
                  <Copy size={16} />
                  Duplicate design
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={requestClose} aria-label="Close editor" title="Close">
            <X size={19} />
          </button>
        </div>
      </header>

      <div className="t2c-editor-main">
        <EditorToolRail
          activeTool={activeTool}
          collapsed={leftCollapsed}
          onChange={(tool) => {
            setActiveTool(tool)
            setLeftCollapsed(false)
          }}
        />
        {!leftCollapsed ? (
          <EditorLibraryPanel
            tool={activeTool}
            templates={templates}
            currentTemplateId={currentTemplateId}
            assets={assets}
            brandAssets={bootstrap?.brandAssets ?? []}
            profileFields={profileFields}
            document={currentDocument}
            selectedIds={selectedIds}
            isSuperuser={isSuperuser}
            authenticated={authenticated}
            uploading={uploading}
            onCollapse={() => setLeftCollapsed(true)}
            onApplyTemplate={applyTemplate}
            onCreateBlank={createBlankDesign}
            onAddShape={(shape: ShapeType) => addElement(createShapeElement(shape), `Add ${shape}`)}
            onAddIcon={(icon: IconType) => addElement(createIconElement(icon), `Add ${icon} icon`)}
            onAddDecoration={(decoration: DecorationType) =>
              addElement(createDecorationElement(decoration), `Add ${decoration}`)
            }
            onAddLine={(arrow) => addElement(createLineElement(arrow), arrow ? 'Add arrow' : 'Add line')}
            onAddText={(variant, value, name) => {
              const element = createTextElement(value ?? 'Your text', variant)
              if (name) element.name = name
              addElement(element, `Add ${name ?? variant}`)
            }}
            onAddImage={(asset) =>
              addElement(createImageElement(asset.url, asset.name, asset.id), `Add ${asset.name}`)
            }
            onAddQr={(value, name) => addElement(createQrElement(value, name), `Add ${name}`)}
            onUpload={uploadFile}
            onBackgroundChange={updateBackground}
            onSelectLayer={selectElement}
            onToggleLayer={(id, field) => {
              const element = currentDocument.elements.find((candidate) => candidate.id === id)
              if (!element) return
              commitDocument(
                {
                  ...currentDocument,
                  elements: currentDocument.elements.map((candidate) =>
                    candidate.id === id ? { ...candidate, [field]: !candidate[field] } : candidate,
                  ),
                },
                `${field === 'visible' ? 'Toggle visibility' : 'Toggle lock'} for ${element.name}`,
              )
            }}
            onMoveLayer={(from, to) =>
              commitDocument(
                { ...currentDocument, elements: moveItem(currentDocument.elements, from, to) },
                'Reorder layers',
              )
            }
            onRenameLayer={(id, name) =>
              commitDocument(
                {
                  ...currentDocument,
                  elements: currentDocument.elements.map((element) =>
                    element.id === id ? { ...element, name } : element,
                  ),
                },
                'Rename layer',
              )
            }
            onOpenTemplateManager={() => setTemplateManagerOpen(true)}
          />
        ) : null}

        <main className="t2c-editor-stage">
          <div className="t2c-editor-stage-actions">
            <button
              type="button"
              onClick={() => setLeftCollapsed((value) => !value)}
              title={leftCollapsed ? 'Open tools panel' : 'Collapse tools panel'}
              aria-label={leftCollapsed ? 'Open tools panel' : 'Collapse tools panel'}
            >
              {leftCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <span>Drag guides from rulers Â· Double-click text to edit</span>
            <button
              type="button"
              onClick={() => setRightCollapsed((value) => !value)}
              title={rightCollapsed ? 'Open properties panel' : 'Collapse properties panel'}
              aria-label={rightCollapsed ? 'Open properties panel' : 'Collapse properties panel'}
            >
              {rightCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
            </button>
          </div>

          <CardCanvas
            document={currentDocument}
            profileFields={profileFields}
            selectedIds={selectedIds}
            zoom={zoom}
            showGrid={showGrid}
            showSafeArea={showSafeArea}
            showBleed={showBleed}
            snapToGrid={snapToGrid}
            snapToElements={snapToElements}
            onSelect={selectElement}
            onCommitElements={handleCanvasPatches}
            onOpenTextEdit={(id) => {
              setSelectedIds([id])
              setInlineTextId(id)
            }}
            onContextMenu={(state) => {
              if (state.elementId) selectElement(state.elementId)
              setContextMenu(state)
            }}
            onAddGuide={(axis, value) => {
              const guides = currentDocument.guides
              commitDocument(
                {
                  ...currentDocument,
                  guides:
                    axis === 'vertical'
                      ? { ...guides, vertical: [...guides.vertical, value] }
                      : { ...guides, horizontal: [...guides.horizontal, value] },
                },
                `Add ${axis} guide`,
              )
            }}
            onMoveGuide={(axis, index, value) => {
              const guides = currentDocument.guides
              const nextValues = [...guides[axis]]
              nextValues[index] = value
              commitDocument(
                {
                  ...currentDocument,
                  guides: { ...guides, [axis]: nextValues },
                },
                `Move ${axis} guide`,
              )
            }}
          />

          <div className="t2c-canvas-controls">
            <div className="t2c-orientation-control" aria-label="Card orientation">
              <button type="button" className={currentDocument.size.width > currentDocument.size.height ? 'is-active' : ''} onClick={() => changeOrientation('landscape')}>Landscape</button>
              <button type="button" className={currentDocument.size.height > currentDocument.size.width ? 'is-active' : ''} onClick={() => changeOrientation('portrait')}>Portrait</button>
            </div>
            <div className="t2c-zoom-control">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(1))))}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(1))))}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus size={15} />
              </button>
            </div>
            <button type="button" onClick={() => setZoom(1)}>Fit</button>
            <button type="button" onClick={() => setZoom(0.72)}>Actual size</button>
            <button
              type="button"
              className={showGrid ? 'is-active' : ''}
              onClick={() => setShowGrid((value) => !value)}
            >
              <Grid3X3 size={15} />
              Grid
            </button>
            <button
              type="button"
              className={snapToGrid || snapToElements ? 'is-active' : ''}
              onClick={() => {
                const next = !(snapToGrid || snapToElements)
                setSnapToGrid(next)
                setSnapToElements(next)
              }}
            >
              <ScanLine size={15} />
              Snap
            </button>
            <button type="button" onClick={() => addGuide('vertical')}>+ V guide</button>
            <button type="button" onClick={() => addGuide('horizontal')}>+ H guide</button>
            <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen">
              <Expand size={15} />
            </button>
          </div>

          {inlineTextElement ? (
            <InlineTextEditor
              element={inlineTextElement}
              onClose={() => setInlineTextId(null)}
              onSave={(text) => {
                updateSelected({ text }, 'Edit text on canvas')
                setInlineTextId(null)
              }}
            />
          ) : null}

          {contextMenu ? (
            <div
              className="t2c-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              role="menu"
            >
              <button type="button" onClick={duplicateSelected}>
                <Copy size={15} />
                Duplicate
              </button>
              <button type="button" onClick={() => layerAction('front')}>
                <ChevronRight size={15} />
                Bring to front
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selected[0]
                  if (target) updateSelected({ locked: !target.locked }, 'Toggle lock')
                }}
              >
                {selected[0]?.locked ? <Unlock size={15} /> : <Lock size={15} />}
                {selected[0]?.locked ? 'Unlock' : 'Lock'}
              </button>
              <button type="button" className="is-danger" onClick={deleteSelected}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          ) : null}
        </main>

        {!rightCollapsed ? (
          <EditorInspectorPanel
            selectedElements={selected}
            onCollapse={() => setRightCollapsed(true)}
            onPatch={updateSelected}
            onStylePatch={updateSelectedStyle}
            onAlign={alignSelection}
            onLayerAction={layerAction}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onGroup={groupSelected}
            onUngroup={ungroupSelected}
          />
        ) : null}
      </div>

      <footer className="t2c-editor-statusbar">
        <span>CR80 card ({currentDocument.size.width > currentDocument.size.height ? 'landscape' : 'portrait'})</span>
        <span>{currentDocument.size.width > currentDocument.size.height ? '86 × 54 mm' : '54 × 86 mm'}</span>
        <span>Bleed: 2 mm</span>
        <span>Safe area: {currentDocument.size.width > currentDocument.size.height ? '80 × 48 mm' : '48 × 80 mm'}</span>
        <span className="t2c-status-action">{lastAction}</span>
        <button
          type="button"
          className={showSafeArea ? 'is-active' : ''}
          onClick={() => setShowSafeArea((value) => !value)}
        >
          Safe area
        </button>
        <button
          type="button"
          className={showBleed ? 'is-active' : ''}
          onClick={() => setShowBleed((value) => !value)}
        >
          Bleed
        </button>
        <span className={validationIssues.some((issue) => issue.level === 'error') ? 'has-error' : 'is-safe'}>
          {validationIssues.some((issue) => issue.level === 'error') ? (
            <AlertCircle size={14} />
          ) : (
            <Check size={14} />
          )}
          {validationIssues.some((issue) => issue.level === 'error')
            ? `${validationIssues.length} checks`
            : 'Print-safe'}
        </span>
      </footer>

      <div className="t2c-mobile-tool-bar" aria-label="Mobile editor tools">
        {editorTools.slice(0, 6).map((tool) => {
          const Icon = tool.icon
          return (
            <button
              type="button"
              className={activeTool === tool.id ? 'is-active' : ''}
              onClick={() => {
                setActiveTool(tool.id)
                setLeftCollapsed(false)
                setRightCollapsed(true)
              }}
              key={tool.id}
            >
              <Icon size={19} />
              <span>{tool.id === 'qr' ? 'QR' : tool.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setActiveTool('layers')
            setLeftCollapsed(false)
            setRightCollapsed(true)
          }}
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </div>

      <PreviewDialog
        open={previewOpen}
        snapshot={snapshot}
        profileFields={profileFields}
        issues={validationIssues}
        onClose={() => setPreviewOpen(false)}
        onContinue={finalContinue}
        onSelectIssue={(issue: EditorValidationIssue) => {
          setSide(issue.side)
          setSelectedIds(issue.elementId ? [issue.elementId] : [])
          setPreviewOpen(false)
        }}
      />

      {isSuperuser ? (
        <TemplateManager
          open={templateManagerOpen}
          snapshot={snapshot}
          categories={bootstrap?.templateCategories ?? []}
          onClose={() => setTemplateManagerOpen(false)}
          onTemplatesChange={(next) => setTemplates(next.length ? next : fallbackTemplates)}
          onApplyTemplate={applyTemplate}
        />
      ) : null}

      <VersionHistoryDialog
        open={historyOpen}
        design={design}
        revisions={revisions}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreRevision}
      />

      {closeConfirmationOpen ? (
        <div className="t2c-dialog-backdrop" role="presentation">
          <div className="t2c-confirm-dialog" role="alertdialog" aria-modal="true">
            <AlertCircle size={23} />
            <h3>Leave the editor?</h3>
            <p>
              Your latest work is stored locally
              {authenticated ? ' and will continue syncing.' : ', but signing in is required to keep it in your account.'}
            </p>
            <div>
              <button type="button" onClick={() => setCloseConfirmationOpen(false)}>
                Keep editing
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={() => {
                  setCloseConfirmationOpen(false)
                  onClose()
                }}
              >
                Leave editor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="t2c-editor-toast" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
