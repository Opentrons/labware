import type {
  LPCWizardAction,
  LPCWizardState,
  OffsetDetails,
} from '../../types'
import isEqual from 'lodash/isEqual'
import {
  SET_FINAL_POSITION,
  SET_INITIAL_POSITION,
} from '/app/redux/protocol-runs'

// Handle positional updates, only updating the working offset that matches the location specified in the action.
export function updateOffsetsForURI(
  state: LPCWizardState,
  action: Extract<
    LPCWizardAction,
    { type: 'SET_INITIAL_POSITION' | 'SET_FINAL_POSITION' }
  >
): OffsetDetails[] {
  const { type, payload } = action
  const { labwareUri, position, location } = payload
  const { offsetDetails } = state.labwareInfo.labware[labwareUri]
  const relevantDetailsIdx = offsetDetails.findIndex(detail =>
    isEqual(location, detail.locationDetails)
  )

  if (relevantDetailsIdx < 0) {
    console.warn(`No matching location found for ${labwareUri}`)
    return offsetDetails
  } else {
    const relevantDetail = offsetDetails[relevantDetailsIdx]
    const newOffsetDetails = [
      ...offsetDetails.slice(0, relevantDetailsIdx),
      ...offsetDetails.slice(relevantDetailsIdx + 1),
    ]

    if (relevantDetail.workingOffset == null) {
      const newWorkingDetail = {
        initialPosition: type === SET_INITIAL_POSITION ? position : null,
        finalPosition: type === SET_FINAL_POSITION ? position : null,
      }

      return [
        ...newOffsetDetails,
        { ...relevantDetail, workingOffset: newWorkingDetail },
      ]
    } else {
      const newWorkingDetail =
        type === SET_INITIAL_POSITION
          ? {
              initialPosition: position,
              finalPosition: null,
            }
          : {
              ...relevantDetail.workingOffset,
              finalPosition: position,
            }

      return [
        ...newOffsetDetails,
        { ...relevantDetail, workingOffset: newWorkingDetail },
      ]
    }
  }
}
