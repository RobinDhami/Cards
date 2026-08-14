declare module 'lucide-react/dist/esm/icons/*.mjs' {
  import type { ComponentType, SVGProps } from 'react'

  const Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
  export default Icon
}

declare module 'lucide-react/dist/esm/icons/*.js' {
  import type { ComponentType, SVGProps } from 'react'

  const Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
  export default Icon
}
