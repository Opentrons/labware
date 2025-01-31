import {
  getPipetteSpecsV2,
  getLabwareDefURI,
  getLabwareDisplayName,
} from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from '../../labware-defs'
import type {
  PipetteName,
  PipetteV2Specs,
  PipetteMount,
} from '@opentrons/shared-data'
import type {
  Gen,
  PipetteType,
} from '../../pages/CreateNewProtocolWizard/types'
import type { PipetteOnDeck } from '../../step-forms'

export interface PipetteSections {
  type: PipetteType
  gen: Gen | 'flex'
  volume: string
}

export const getSectionsFromPipetteName = (
  pipetteName: PipetteName,
  specs: PipetteV2Specs
): PipetteSections => {
  const channels = specs.channels
  let type: PipetteType = 'multi'
  if (channels === 96) {
    type = '96'
  } else if (channels === 1) {
    type = 'single'
  }
  const volume = pipetteName.split('_')[0]
  return {
    type,
    gen: specs.displayCategory === 'FLEX' ? 'flex' : specs.displayCategory,
    volume,
  }
}

export const getShouldShowPipetteType = (
  type: PipetteType,
  has96Channel: boolean,
  leftPipette?: PipetteOnDeck | null,
  rightPipette?: PipetteOnDeck | null,
  currentEditingMount?: PipetteMount | null
): boolean => {
  if (type === '96') {
    // if a protocol has 96-Channel, no 96-Channel button
    if (has96Channel) {
      return false
    }

    // If no mount is being edited (adding a new pipette)
    if (currentEditingMount == null) {
      // Only show if both mounts are empty
      return leftPipette == null && rightPipette == null
    }

    // Only show if the opposite mount of the one being edited is empty
    return currentEditingMount === 'left'
      ? rightPipette == null
      : leftPipette == null
  }

  // Always show 1-Channel and Multi-Channel options
  return true
}

export interface TiprackOption {
  name: string
  value: string
}

interface TiprackOptionsProps {
  allLabware: LabwareDefByDefURI
  allowAllTipracks: boolean
  selectedPipetteName?: string | null
}
export function getTiprackOptions(props: TiprackOptionsProps): TiprackOption[] {
  const { allLabware, allowAllTipracks, selectedPipetteName } = props
  const selectedPipetteDefaultTipracks =
    selectedPipetteName != null
      ? getPipetteSpecsV2(selectedPipetteName as PipetteName)?.liquids.default
          .defaultTipracks ?? []
      : []
  const selectedPipetteDisplayCategory =
    selectedPipetteName != null
      ? getPipetteSpecsV2(selectedPipetteName as PipetteName)
          ?.displayCategory ?? []
      : []

  const isFlexPipette =
    selectedPipetteDisplayCategory === 'FLEX' ||
    selectedPipetteName === 'p1000_96'
  const tiprackOptions = allLabware
    ? Object.values(allLabware)
        .filter(def => def.metadata.displayCategory === 'tipRack')
        .filter(def => {
          if (allowAllTipracks && !isFlexPipette) {
            return !def.metadata.displayName.includes('Flex')
          } else if (allowAllTipracks && isFlexPipette) {
            return def.metadata.displayName.includes('Flex')
          } else {
            return (
              selectedPipetteDefaultTipracks.includes(getLabwareDefURI(def)) ||
              def.namespace === 'custom_beta'
            )
          }
        })
        .map(def => ({
          name: getLabwareDisplayName(def),
          value: getLabwareDefURI(def),
        }))
        .sort((a, b) => (a.name.includes('(Retired)') ? 1 : -1))
    : []

  return tiprackOptions
}
