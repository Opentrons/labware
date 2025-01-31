import { css } from 'styled-components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import { labwareImages } from './labware-images'

const IMAGE_MAX_WIDTH = '96px'
export function LabwareDiagram({
  def,
}: {
  def: LabwareDefinition2
}): JSX.Element | undefined {
  const labwareSrc: string = labwareImages[def.parameters.loadName]?.[0] ?? ''

  if (labwareSrc === '') {
    return
  }

  return (
    <img
      css={css`
        max-width: ${IMAGE_MAX_WIDTH};
        width: 100%;
        height: auto;
      `}
      src={labwareSrc}
      alt={def.parameters.loadName}
    />
  )
}
