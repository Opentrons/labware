import { COLORS } from '../../helix-design-system'

import type { SVGProps } from 'react'

export function SlotClip(props: SVGProps<SVGPathElement>): JSX.Element {
  return (
    <path
      fill="none"
      stroke={COLORS.black90}
      strokeWidth={3}
      strokeOpacity={0.7}
      {...props}
    />
  )
}
