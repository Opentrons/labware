import isEqual from 'lodash/isEqual'

import { getLabwareDisplayName, getLabwareDefURI } from '@opentrons/shared-data'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { LPCLabwareInfo, OffsetDetails } from '/app/redux/protocol-runs'
import type { LabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLabwareLocationCombos'
import type { UseLPCLabwareInfoProps } from '.'

interface GetLPCLabwareInfoParams {
  lwURIs: string[]
  currentOffsets: UseLPCLabwareInfoProps['currentOffsets']
  lwLocationCombos: LabwareLocationCombo[]
  labwareDefs: UseLPCLabwareInfoProps['labwareDefs']
}

export function getLPCLabwareInfoFrom(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo {
  return { selectedLabware: null, labware: getLabwareInfoRecords(params) }
}

function getLabwareInfoRecords(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo['labware'] {
  const labwareDetails: LPCLabwareInfo['labware'] = {}

  params.lwURIs.forEach(uri => {
    if (!(uri in labwareDetails)) {
      labwareDetails[uri] = {
        id: getALabwareIdFromUri({ ...params, uri }),
        displayName: getDisplayNameFromUri({ ...params, uri }),
        offsetDetails: getOffsetDetailsForLabware({ ...params, uri }),
      }
    }
  })

  return labwareDetails
}

type GetLPCLabwareInfoForURI = Omit<GetLPCLabwareInfoParams, 'lwURIs'> & {
  uri: string
}

function getALabwareIdFromUri({
  uri,
  lwLocationCombos,
}: GetLPCLabwareInfoForURI): string {
  return (
    lwLocationCombos.find(combo => combo.definitionUri === uri)?.labwareId ?? ''
  )
}

function getDisplayNameFromUri({
  uri,
  labwareDefs,
}: GetLPCLabwareInfoForURI): string {
  const matchedDef = labwareDefs?.find(
    def => getLabwareDefURI(def) === uri
  ) as LabwareDefinition2

  return getLabwareDisplayName(matchedDef)
}

// NOTE: A lot of the logic here acts as temporary adapter that resolves the app's current way of getting offset data (scraping the run record)
// and the end goal of treating labware as first class citizens.
function getOffsetDetailsForLabware({
  currentOffsets,
  lwLocationCombos,
  uri,
}: GetLPCLabwareInfoForURI): OffsetDetails[] {
  return lwLocationCombos.flatMap(comboInfo => {
    const { definitionUri, location, ...restInfo } = comboInfo

    const existingOffset =
      currentOffsets.find(
        offset =>
          uri === offset.definitionUri &&
          isEqual(offset.location, comboInfo.location)
      ) ?? null

    return {
      existingOffset: existingOffset ?? null,
      workingOffset: null,
      locationDetails: {
        ...location,
        ...restInfo,
        definitionUri,
        kind: 'location-specific',
      },
    }
  })
}
