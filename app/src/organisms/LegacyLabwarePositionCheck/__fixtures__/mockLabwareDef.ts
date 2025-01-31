import { fixture96Plate } from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export const mockLabwareDef: LabwareDefinition2 = {
  ...(fixture96Plate as LabwareDefinition2),
  metadata: {
    displayName: 'Mock Labware Definition',
    displayCategory: 'wellPlate',
    displayVolumeUnits: 'mL',
  },
}
