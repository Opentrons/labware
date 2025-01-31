import { LabwareRender, RobotWorkSpace } from '@opentrons/components'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof LabwareRender>

/** Avoid boilerplate for viewbox-based-on-labware-dimensions */
export function SingleLabware(props: Props): JSX.Element {
  return (
    <RobotWorkSpace
      viewBox={`0 0 ${props.definition.dimensions.xDimension} ${props.definition.dimensions.yDimension}`}
    >
      {() => <LabwareRender {...props} />}
    </RobotWorkSpace>
  )
}
