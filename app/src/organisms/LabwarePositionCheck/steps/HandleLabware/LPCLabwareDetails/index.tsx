import { Flex } from '@opentrons/components'

import { AppliedLocationOffsetsContainer } from './AppliedLocationOffsetsContainer'
import { DefaultLocationOffset } from './DefaultLocationOffset'
import { LIST_CONTAINER_STYLE } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/contants'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCLabwareDetails(props: LPCWizardContentProps): JSX.Element {
  return (
    <Flex css={LIST_CONTAINER_STYLE}>
      <DefaultLocationOffset {...props} />
      <AppliedLocationOffsetsContainer {...props} />
    </Flex>
  )
}
