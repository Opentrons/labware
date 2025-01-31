import { LabwareRender } from '@opentrons/components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

interface LabwareRenderOnDeckProps {
  labwareDef: LabwareDefinition2
  x: number
  y: number
}
export function LabwareRenderOnDeck(
  props: LabwareRenderOnDeckProps
): JSX.Element {
  const { x, y, labwareDef } = props
  return (
    <g transform={`translate(${x}, ${y})`}>
      <LabwareRender definition={labwareDef} />
    </g>
  )
}
