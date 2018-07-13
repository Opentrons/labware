// @flow
// LabwareComponent for Deck in ReviewDeckModal
import * as React from 'react'
import {connect} from 'react-redux'

import {selectors as robotSelectors} from '../../robot'

import type {LabwareComponentProps} from '@opentrons/components'
import LabwareItem, {type LabwareItemProps} from '../DeckMap/LabwareItem'

type OwnProps = LabwareComponentProps

type StateProps = {
  labware?: $PropertyType<LabwareItemProps, 'labware'>
}

type Props = OwnProps & StateProps

export default connect(mapStateToProps)(LabwareComponent)

function LabwareComponent (props: Props) {
  return (
    // $FlowFixMe: doesn't type properly with upgrade to flow@0.76
    <LabwareItem {...props} />
  )
}

function mapStateToProps (state, ownProps: OwnProps): StateProps {
  const allLabware = robotSelectors.getLabware(state)
  const labware = allLabware.find((lw) => lw.slot === ownProps.slot)

  if (!labware) return {}

  return {labware: {...labware}}
}
