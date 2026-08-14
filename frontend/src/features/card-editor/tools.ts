import ContactRound from 'lucide-react/dist/esm/icons/contact-round.js'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.js'
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template.js'
import PaintBucket from 'lucide-react/dist/esm/icons/paint-bucket.js'
import Palette from 'lucide-react/dist/esm/icons/palette.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Shapes from 'lucide-react/dist/esm/icons/shapes.js'
import Type from 'lucide-react/dist/esm/icons/type.js'
import UploadCloud from 'lucide-react/dist/esm/icons/upload-cloud.js'
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

