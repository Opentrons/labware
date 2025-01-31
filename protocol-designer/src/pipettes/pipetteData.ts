import { getTiprackVolume, getLabwareDefURI } from '@opentrons/shared-data'
import type { PipetteEntity } from '@opentrons/step-generation'

// NOTE: this is similar to getPipetteWithTipMaxVol, the fns
export const getPipetteCapacity = (
  pipetteEntity: PipetteEntity,
  tipRackDefUri?: string | null
): number => {
  const maxVolume = pipetteEntity.spec.liquids.default.maxVolume
  const tipRackDefs = pipetteEntity.tiprackLabwareDef
  let chosenTipRack = null
  for (const def of tipRackDefs) {
    if (getLabwareDefURI(def) === tipRackDefUri) {
      chosenTipRack = def
      break
    }
  }
  const tipRackTipVol = getTiprackVolume(chosenTipRack ?? tipRackDefs[0])

  if (maxVolume != null && tipRackTipVol != null) {
    return Math.min(maxVolume, tipRackTipVol)
  }
  console.assert(
    false,
    `Expected spec and tiprack def for pipette ${
      pipetteEntity ? pipetteEntity.id : '???'
    } and ${tipRackDefUri ?? '???'}`
  )
  return NaN
}

export function getMinPipetteVolume(pipetteEntity: PipetteEntity): number {
  const spec = pipetteEntity.spec

  const minVolumes =
    spec != null
      ? Object.values(spec.liquids).map(liquid => liquid.minVolume)
      : []
  let recommendedMinimumDisposalVol: number = 0
  if (minVolumes.length === 1) {
    recommendedMinimumDisposalVol = minVolumes[0]
    //  to accommodate for lowVolume
  } else {
    const lowestVolume = Math.min(...minVolumes)
    recommendedMinimumDisposalVol = lowestVolume
  }

  if (spec != null) {
    return recommendedMinimumDisposalVol
  }

  console.assert(
    false,
    `Expected spec for pipette ${pipetteEntity ? pipetteEntity.id : '???'}`
  )
  return NaN
}
