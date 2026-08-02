import { AdvancedCardEditor } from './CardEditor'


export function CardEditorPage() {
  const isTemplateStudio = window.location.pathname === '/dashboard/templates/'
    || window.location.pathname === '/dashboard/templates'

  return (
    <AdvancedCardEditor
      open
      initialFrontDesign="midnight"
      initialBackDesign="minimal"
      finish="pvc"
      mode={isTemplateStudio ? 'template-studio' : 'design'}
      onClose={() => {
        window.location.assign(isTemplateStudio ? '/dashboard/' : '/')
      }}
    />
  )
}
