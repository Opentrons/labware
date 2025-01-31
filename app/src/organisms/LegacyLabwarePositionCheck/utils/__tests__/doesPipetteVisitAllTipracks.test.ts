import { describe, it, expect } from 'vitest'
import { doesPipetteVisitAllTipracks } from '../doesPipetteVisitAllTipracks'
import { multiple_tipracks, one_tiprack } from '@opentrons/shared-data'
import type {
  LoadedLabware,
  ProtocolAnalysisOutput,
  RunTimeCommand,
} from '@opentrons/shared-data'

// TODO: update these fixtures to be v6 protocols
const protocolMultipleTipracks = (multiple_tipracks as unknown) as ProtocolAnalysisOutput
const labwareDefinitionsMultipleTipracks = multiple_tipracks.labwareDefinitions as {}
const protocolOneTiprack = (one_tiprack as unknown) as ProtocolAnalysisOutput
const labwareDefinitionsOneTiprack = one_tiprack.labwareDefinitions as {}
const labwareWithDefinitionUri = [
  {
    id: 'fixedTrash',
    displayName: 'Trash',
    definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
    loadName: 'opentrons_1_trash_1100ml_fixed',
  },
  {
    id:
      '50d3ebb0-0042-11ec-8258-f7ffdf5ad45a:opentrons/opentrons_96_tiprack_300ul/1',
    displayName: 'Opentrons 96 Tip Rack 300 µL',
    definitionUri: 'opentrons/opentrons_96_tiprack_300ul/1',
    loadName: 'opentrons_96_tiprack_300ul',
  },
  {
    id:
      '9fbc1db0-0042-11ec-8258-f7ffdf5ad45a:opentrons/nest_12_reservoir_15ml/1',
    displayName: 'NEST 12 Well Reservoir 15 mL',
    definitionUri: 'opentrons/nest_12_reservoir_15ml/1',
    loadName: 'nest_12_reservoir_15ml',
  },
  {
    id: 'e24818a0-0042-11ec-8258-f7ffdf5ad45a',
    displayName: 'Opentrons 96 Tip Rack 300 µL (1)',
    definitionUri: 'opentrons/opentrons_96_tiprack_300ul/1',
    loadName: 'opentrons_96_tiprack_300ul',
  },
] as LoadedLabware[]

describe('doesPipetteVisitAllTipracks', () => {
  it('should return true when the pipette visits both tipracks', () => {
    const pipetteId = 'c235a5a0-0042-11ec-8258-f7ffdf5ad45a' // this is just taken from the protocol fixture
    const labware = labwareWithDefinitionUri
    const commands: RunTimeCommand[] = protocolMultipleTipracks.commands

    expect(
      doesPipetteVisitAllTipracks(
        pipetteId,
        labware,
        labwareDefinitionsMultipleTipracks,
        commands
      )
    ).toBe(true)
  })
  it('should return false when the pipette does NOT visit all tipracks', () => {
    const pipetteId = '50d23e00-0042-11ec-8258-f7ffdf5ad45a' // this is just taken from the protocol fixture
    const labware = labwareWithDefinitionUri
    const commands: RunTimeCommand[] = protocolMultipleTipracks.commands

    expect(
      doesPipetteVisitAllTipracks(
        pipetteId,
        labware,
        labwareDefinitionsMultipleTipracks,
        commands
      )
    ).toBe(false)
  })
  it('should return true when there is only one tiprack and pipette visits it', () => {
    const pipetteId = 'pipetteId' // this is just taken from the protocol fixture
    const labware = [
      {
        id: 'fixedTrash',
        displayName: 'Trash',
        definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
        loadName: 'opentrons_1_trash_1100ml_fixed',
      },
      {
        id: 'tiprackId',
        displayName: 'Opentrons 96 Tip Rack 10 µL',
        definitionUri: 'opentrons/opentrons_96_tiprack_10ul/1',
        loadName: 'opentrons_96_tiprack_10ul',
      },
      {
        id: 'sourcePlateId',
        displayName: 'Source Plate',
        definitionUri: 'example/plate/1',
        loadName: 'plate',
      },
      {
        id: 'destPlateId',
        displayName: 'Dest Plate',
        definitionUri: 'example/plate/1',
        loadName: 'plate',
      },
    ] as LoadedLabware[]
    const commands: RunTimeCommand[] = protocolOneTiprack.commands

    expect(
      doesPipetteVisitAllTipracks(
        pipetteId,
        labware,
        labwareDefinitionsOneTiprack,
        commands
      )
    ).toBe(true)
  })
})
