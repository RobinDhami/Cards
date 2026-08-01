import ContactRound from 'lucide-react/dist/esm/icons/contact-round.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template.mjs'
import PaintBucket from 'lucide-react/dist/esm/icons/paint-bucket.mjs'
import Palette from 'lucide-react/dist/esm/icons/palette.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import Shapes from 'lucide-react/dist/esm/icons/shapes.mjs'
import Type from 'lucide-react/dist/esm/icons/type.mjs'
import UploadCloud from 'lucide-react/dist/esm/icons/upload-cloud.mjs'
import type { EditorTool } from './types'


export const editorTools: Array<{
  id: EditorTool
  label: string
  icon: typeof LayoutTemplate
}> = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'uploads', label: 'Uploads', icon: UploadCloud },
  { id: 'brand', label: 'Brand', icon: Palette },
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'contact', label: 'Contact details', icon: ContactRound },
  { id: 'background', label: 'Background', icon: PaintBucket },
  { id: 'layers', label: 'Layers', icon: Layers3 },
]

