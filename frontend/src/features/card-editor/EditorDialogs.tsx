import { useEffect, useMemo, useState } from 'react'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.js'
import Archive from 'lucide-react/dist/esm/icons/archive.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Copy from 'lucide-react/dist/esm/icons/copy.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import History from 'lucide-react/dist/esm/icons/history.js'
import MonitorSmartphone from 'lucide-react/dist/esm/icons/monitor-smartphone.js'
import PackageCheck from 'lucide-react/dist/esm/icons/package-check.js'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import Send from 'lucide-react/dist/esm/icons/send.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { brandLogo } from '../../lib/assets'
import { CardCanvas } from './CardCanvas'
import {
  deleteTemplate,
  loadManagedTemplates,
  saveTemplate,
  templateAction,
  updateTemplate,
} from './api'
import type {
  CardDesignRecord,
  CardSide,
  CardTemplateRecord,
  DesignSnapshot,
  EditorValidationIssue,
  ProfileFields,
} from './types'
import { displayError } from '../../lib/api'

type TemplateManagerProps = {
  open: boolean
  snapshot: DesignSnapshot
  activeTemplateId: string | null
  categories: Array<{ value: string; label: string }>
  onClose: () => void
  onTemplatesChange: (templates: CardTemplateRecord[]) => void
  onTemplateChange: (template: CardTemplateRecord) => void
  onSelectTemplate: (template: CardTemplateRecord) => void
  onApplyTemplate: (template: CardTemplateRecord) => void
}

type PendingTemplateAction = {
  template: CardTemplateRecord
  action: 'publish' | 'unpublish' | 'archive' | 'delete'
} | null

const templateAudienceOptions = [
  { value: 'public', label: 'Homepage visitors' },
  { value: 'student', label: 'Students' },
  { value: 'teacher', label: 'Teachers and staff' },
  { value: 'school_admin', label: 'School admins' },
  { value: 'super_admin', label: 'Platform admins' },
]

export function TemplateManager({
  open,
  snapshot,
  activeTemplateId,
  categories,
  onClose,
  onTemplatesChange,
  onTemplateChange,
  onSelectTemplate,
  onApplyTemplate,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<CardTemplateRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingTemplateAction>(null)
  const selected = templates.find((template) => template.id === selectedId) ?? null
  const [draft, setDraft] = useState({
    name: 'New Tap2Connect template',
    description: '',
    category: 'professional',
    supportsBack: true,
    isFeatured: false,
    isPremium: false,
    eligibleAccountTypes: [] as string[],
    sortOrder: 0,
  })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    loadManagedTemplates()
      .then((response) => {
        setTemplates(response.templates)
        setSelectedId((current) => (
          current && response.templates.some((template) => template.id === current)
            ? current
            : activeTemplateId
        ))
      })
      .catch((error) => setMessage(displayError(error)))
      .finally(() => setLoading(false))
  }, [activeTemplateId, open])

  useEffect(() => {
    if (!selected) return
    setDraft({
      name: selected.name,
      description: selected.description,
      category: selected.category,
      supportsBack: selected.supportsBack,
      isFeatured: selected.isFeatured,
      isPremium: selected.isPremium,
      eligibleAccountTypes: selected.eligibleAccountTypes,
      sortOrder: selected.sortOrder,
    })
  }, [selected])

  if (!open) return null

  const syncTemplates = (next: CardTemplateRecord[]) => {
    setTemplates(next)
    onTemplatesChange(next.filter((template) => template.status === 'published'))
  }

  const saveCurrentAsTemplate = async () => {
    setSaving(true)
    setMessage('')
    try {
      const response = await saveTemplate({
        ...draft,
        frontData: snapshot.front,
        backData: snapshot.back,
      })
      const next = [...templates, response.template]
      syncTemplates(next)
      setSelectedId(response.template.id)
      setMessage('Template draft created.')
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setSaving(false)
    }
  }

  const saveSelectedMetadata = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      const response = await updateTemplate(selected.id, {
        ...draft,
        frontData: snapshot.front,
        backData: snapshot.back,
      })
      syncTemplates(
        templates.map((template) =>
          template.id === selected.id ? response.template : template,
        ),
      )
      onTemplateChange(response.template)
      setMessage('Template draft updated.')
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setSaving(false)
    }
  }

  const duplicateSelected = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const response = await templateAction(selected.id, 'duplicate')
      const next = [...templates, response.template]
      syncTemplates(next)
      setSelectedId(response.template.id)
      setMessage('Template duplicated as a draft.')
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setSaving(false)
    }
  }

  const confirmAction = async () => {
    if (!pendingAction) return
    setSaving(true)
    setMessage('')
    try {
      if (pendingAction.action === 'delete') {
        await deleteTemplate(pendingAction.template.id)
        const next = templates.filter(
          (template) => template.id !== pendingAction.template.id,
        )
        syncTemplates(next)
        setSelectedId(next[0]?.id ?? null)
        setMessage('Template deleted.')
      } else {
        const response = await templateAction(
          pendingAction.template.id,
          pendingAction.action,
        )
        syncTemplates(
          templates.map((template) =>
            template.id === response.template.id ? response.template : template,
          ),
        )
        setMessage(
          pendingAction.action === 'publish'
            ? `Version ${response.template.version} published.`
            : `Template ${pendingAction.action}d.`,
        )
      }
    } catch (error) {
      setMessage(displayError(error))
    } finally {
      setPendingAction(null)
      setSaving(false)
    }
  }

  return (
    <div className="t2c-dialog-backdrop t2c-dialog-backdrop--editor" role="presentation">
      <section
        className="t2c-template-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-manager-title"
      >
        <header>
          <div>
            <h2 id="template-manager-title">Template Studio</h2>
            <p>Publish reusable card designs with smart placeholders for homepage and school users.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close template manager">
            <X size={19} />
          </button>
        </header>
        <div className="t2c-template-manager-body">
          <aside>
            <button
              type="button"
              className={!selected ? 'is-active' : ''}
              onClick={() => {
                setSelectedId(null)
                setDraft({
                  name: 'New Tap2Connect template',
                  description: '',
                  category: 'professional',
                  supportsBack: true,
                  isFeatured: false,
                  isPremium: false,
                  eligibleAccountTypes: [],
                  sortOrder: templates.length,
                })
              }}
            >
              <span className="t2c-template-status t2c-template-status--new">+</span>
              <b>New template</b>
            </button>
            {loading ? <p>Loading templates…</p> : null}
            {templates.map((template) => (
              <button
                type="button"
                className={selectedId === template.id ? 'is-active' : ''}
                onClick={() => {
                  setSelectedId(template.id)
                  onSelectTemplate(template)
                }}
                key={template.id}
              >
                <span className={`t2c-template-status t2c-template-status--${template.status}`} />
                <span>
                  <b>{template.name}</b>
                  <small>{template.status} · v{template.version}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </aside>
          <main>
            <div className="t2c-template-manager-form">
              <label>
                <span>Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <div className="t2c-template-form-grid">
                <label>
                  <span>Category</span>
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    {categories.map((category) => (
                      <option value={category.value} key={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Display order</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        sortOrder: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <fieldset>
                <legend>Availability</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.supportsBack}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        supportsBack: event.target.checked,
                      }))
                    }
                  />
                  Supports front and back
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.isFeatured}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        isFeatured: event.target.checked,
                      }))
                    }
                  />
                  Featured template
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.isPremium}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        isPremium: event.target.checked,
                      }))
                    }
                  />
                  Premium template
                </label>
              </fieldset>
              <fieldset>
                <legend>Eligible account types</legend>
                {templateAudienceOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        checked={draft.eligibleAccountTypes.includes(option.value)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            eligibleAccountTypes: event.target.checked
                              ? [...current.eligibleAccountTypes, option.value]
                              : current.eligibleAccountTypes.filter((value) => value !== option.value),
                          }))
                        }
                      />
                      {option.label}
                    </label>
                ))}
                <p>Leave all unchecked to allow every account type.</p>
              </fieldset>
              <div className="t2c-template-document-note">
                <PackageCheck size={18} />
                <span>
                  Save the current front and back canvas with placeholders like
                  <code>{'{{full_name}}'}</code>, <code>{'{{company}}'}</code>, and <code>{'{{qr_code}}'}</code>.
                  Published templates appear for eligible users to fill with their own details.
                </span>
              </div>
            </div>
            <footer>
              <p aria-live="polite">{message}</p>
              <div>
                {selected ? (
                  <>
                    <button type="button" onClick={() => onApplyTemplate(selected)}>
                      <Eye size={16} />
                      Open in editor
                    </button>
                    <button type="button" onClick={duplicateSelected} disabled={saving}>
                      <Copy size={16} />
                      Duplicate
                    </button>
                    {selected.status === 'published' ? (
                      <button
                        type="button"
                        onClick={() => setPendingAction({ template: selected, action: 'unpublish' })}
                        disabled={saving}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="is-primary"
                        onClick={() => setPendingAction({ template: selected, action: 'publish' })}
                        disabled={saving}
                      >
                        <Send size={16} />
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingAction({ template: selected, action: 'archive' })}
                      disabled={saving}
                    >
                      <Archive size={16} />
                      Archive
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => setPendingAction({ template: selected, action: 'delete' })}
                      disabled={saving}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                    <button
                      type="button"
                      className="is-primary"
                      onClick={saveSelectedMetadata}
                      disabled={saving}
                    >
                      <Save size={16} />
                      Save draft
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="is-primary"
                    onClick={saveCurrentAsTemplate}
                    disabled={saving || !draft.name.trim()}
                  >
                    <Save size={16} />
                    Create draft
                  </button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </section>

      {pendingAction ? (
        <div className="t2c-confirm-dialog" role="alertdialog" aria-modal="true">
          <AlertCircle size={23} />
          <h3>
            {pendingAction.action === 'delete'
              ? 'Delete this template?'
              : `${pendingAction.action[0].toUpperCase()}${pendingAction.action.slice(1)} this template?`}
          </h3>
          <p>
            {pendingAction.action === 'publish'
              ? 'Publishing creates a new immutable template version for eligible users.'
              : pendingAction.action === 'delete'
                ? 'Existing user designs remain unchanged, but this template cannot be recovered.'
                : 'Existing user designs remain unchanged.'}
          </p>
          <div>
            <button type="button" onClick={() => setPendingAction(null)}>Cancel</button>
            <button
              type="button"
              className={pendingAction.action === 'delete' ? 'is-danger' : 'is-primary'}
              onClick={confirmAction}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type PreviewDialogProps = {
  open: boolean
  snapshot: DesignSnapshot
  profileFields: ProfileFields
  issues: EditorValidationIssue[]
  onClose: () => void
  onContinue: () => void
  onSelectIssue: (issue: EditorValidationIssue) => void
}

export function PreviewDialog({
  open,
  snapshot,
  profileFields,
  issues,
  onClose,
  onContinue,
  onSelectIssue,
}: PreviewDialogProps) {
  const [side, setSide] = useState<CardSide>('front')
  const [mode, setMode] = useState<'card' | 'mockup' | 'mobile' | 'validation'>('card')
  const errors = useMemo(
    () => issues.filter((issue) => issue.level === 'error'),
    [issues],
  )
  if (!open) return null

  return (
    <div className="t2c-dialog-backdrop" role="presentation">
      <section
        className="t2c-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <header>
          <div>
            <h2 id="preview-title">Review your card</h2>
            <p>Check both sides and resolve print or QR warnings before continuing.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview">
            <X size={19} />
          </button>
        </header>
        <div className="t2c-preview-tabs">
          {[
            { id: 'card' as const, label: 'Card', icon: Eye },
            { id: 'mockup' as const, label: 'Physical mockup', icon: PackageCheck },
            { id: 'mobile' as const, label: 'Mobile profile', icon: MonitorSmartphone },
            { id: 'validation' as const, label: `Checks (${issues.length})`, icon: AlertCircle },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                type="button"
                className={mode === tab.id ? 'is-active' : ''}
                onClick={() => setMode(tab.id)}
                key={tab.id}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <main>
          {mode === 'card' || mode === 'mockup' ? (
            <div className={`t2c-preview-canvas${mode === 'mockup' ? ' is-mockup' : ''}`}>
              <div className="t2c-preview-side-switch">
                <button
                  type="button"
                  className={side === 'front' ? 'is-active' : ''}
                  onClick={() => setSide('front')}
                >
                  Front
                </button>
                <button
                  type="button"
                  className={side === 'back' ? 'is-active' : ''}
                  onClick={() => setSide('back')}
                >
                  Back
                </button>
              </div>
              <CardCanvas
                document={snapshot[side]}
                profileFields={profileFields}
                selectedIds={[]}
                zoom={mode === 'mockup' ? 0.86 : 1}
                showGrid={false}
                showSafeArea={false}
                showBleed={false}
                snapToGrid={false}
                snapToElements={false}
                onSelect={() => undefined}
                onCommitElements={() => undefined}
                onOpenTextEdit={() => undefined}
                onContextMenu={() => undefined}
              />
            </div>
          ) : null}
          {mode === 'mobile' ? (
            <div className="t2c-mobile-profile-preview">
              <div className="t2c-mobile-device">
                <div className="t2c-mobile-device-header">
                  <img src={brandLogo} alt="Tap2Connect" />
                </div>
                <div className="t2c-mobile-cover" />
                <div className="t2c-mobile-avatar">
                  {profileFields.profile_photo ? (
                    <img src={profileFields.profile_photo} alt="" />
                  ) : (
                    <span>{profileFields.full_name.slice(0, 1)}</span>
                  )}
                </div>
                <h3>{profileFields.full_name}</h3>
                <p>{profileFields.job_title} · {profileFields.company}</p>
                <button type="button">Save contact</button>
                <dl>
                  <div><dt>Phone</dt><dd>{profileFields.phone}</dd></div>
                  <div><dt>Email</dt><dd>{profileFields.email}</dd></div>
                  <div><dt>Website</dt><dd>{profileFields.website}</dd></div>
                </dl>
              </div>
            </div>
          ) : null}
          {mode === 'validation' ? (
            <div className="t2c-validation-list">
              {issues.length ? (
                issues.map((issue) => (
                  <button type="button" onClick={() => onSelectIssue(issue)} key={issue.id}>
                    {issue.level === 'error' ? (
                      <AlertCircle size={18} />
                    ) : (
                      <History size={18} />
                    )}
                    <span>
                      <b>{issue.title}</b>
                      <small>{issue.side} · {issue.detail}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))
              ) : (
                <div className="t2c-validation-success">
                  <Check size={27} />
                  <strong>Ready for review</strong>
                  <p>No print, overflow, or QR issues were found.</p>
                </div>
              )}
            </div>
          ) : null}
        </main>
        <footer>
          <span className={errors.length ? 'has-errors' : ''}>
            {errors.length
              ? `${errors.length} issue${errors.length === 1 ? '' : 's'} should be fixed`
              : 'Print-safe checks passed'}
          </span>
          <div>
            <button type="button" onClick={onClose}>Back to editor</button>
            <button type="button" className="is-primary" onClick={onContinue}>
              Continue
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export function VersionHistoryDialog({
  open,
  design,
  revisions,
  loading,
  onClose,
  onRestore,
}: {
  open: boolean
  design: CardDesignRecord | null
  revisions: Array<{ version: number; name: string; reason: string; createdAt: string }>
  loading: boolean
  onClose: () => void
  onRestore: (version: number) => void
}) {
  if (!open) return null
  return (
    <div className="t2c-dialog-backdrop" role="presentation">
      <section className="t2c-history-dialog" role="dialog" aria-modal="true">
        <header>
          <div>
            <h2>Version history</h2>
            <p>{design?.name ?? 'This local design'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close version history">
            <X size={19} />
          </button>
        </header>
        <main>
          {loading ? <p>Loading versions…</p> : null}
          {!design ? (
            <div className="t2c-history-empty">
              <History size={24} />
              <strong>Save this design first</strong>
              <p>Version history is available after you sign in and save a draft.</p>
            </div>
          ) : null}
          {revisions.map((revision, index) => (
            <article key={revision.version}>
              <span className={index === 0 ? 'is-current' : ''} />
              <div>
                <strong>Version {revision.version}</strong>
                <small>{new Date(revision.createdAt).toLocaleString()} · {revision.reason}</small>
              </div>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onRestore(revision.version)}
              >
                <RotateCcw size={15} />
                Restore
              </button>
            </article>
          ))}
        </main>
      </section>
    </div>
  )
}
