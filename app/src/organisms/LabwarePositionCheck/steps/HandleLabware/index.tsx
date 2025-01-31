import { useSelector } from 'react-redux'

import {
  selectSelectedLabwareFlowType,
  selectSelectedLabwareInfo,
} from '/app/redux/protocol-runs'
import { CheckItem } from './CheckItem'
import { LPCLabwareList } from './LPCLabwareList'
import { LPCLabwareDetails } from './LPCLabwareDetails'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function HandleLabware(props: LPCWizardContentProps): JSX.Element {
  const selectedLw = useSelector(selectSelectedLabwareInfo(props.runId))
  const offsetFlowType = useSelector(selectSelectedLabwareFlowType(props.runId))

  if (selectedLw == null) {
    return <LPCLabwareList {...props} />
  } else if (selectedLw.offsetLocationDetails == null) {
    return <LPCLabwareDetails {...props} />
  } else {
    switch (offsetFlowType) {
      case 'default':
        return <CheckItem {...props} />
      case 'location-specific':
        return <CheckItem {...props} />
      default: {
        console.error(`Unexpected offsetFlowType: ${offsetFlowType}`)
        return <CheckItem {...props} />
      }
    }
  }
}
