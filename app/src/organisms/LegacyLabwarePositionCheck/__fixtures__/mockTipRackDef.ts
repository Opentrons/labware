import { fixtureTiprack10ul } from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export const mockTipRackDef: LabwareDefinition2 = {
  ...(fixtureTiprack10ul as LabwareDefinition2),
  metadata: {
    displayName: 'Mock TipRack Definition',
    displayCategory: 'tipRack',
    displayVolumeUnits: 'mL',
  },
}
