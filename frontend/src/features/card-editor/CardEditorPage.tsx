import { AdvancedCardEditor } from './CardEditor'


export function CardEditorPage() {
  return (
    <AdvancedCardEditor
      open
      initialFrontDesign="midnight"
      initialBackDesign="minimal"
      finish="pvc"
      onClose={() => {
        window.location.assign('/')
      }}
    />
  )
}

