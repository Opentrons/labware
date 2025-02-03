import { expect, describe, it, beforeEach } from 'vitest'
import { getIsSafePipetteMovement } from '../utils'
import {
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V2,
  fixture96Plate,
  fixtureP100096V2Specs,
  fixtureTiprack1000ul,
  fixtureTiprackAdapter,
} from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const mockLabwareId = 'labwareId'
const mockPipId = 'pip'
const mockTiprackId = 'tiprackId'
const mockTipUri = 'mockTipUri'
const mockModule = 'moduleId'
const mockLabware2 = 'labwareId2'
const mockAdapter = 'adapterId'
const mockWellName = 'A1'

describe('getIsSafePipetteMovement', () => {
  let mockInvariantProperties: InvariantContext
  let mockRobotState: RobotState
  beforeEach(() => {
    mockInvariantProperties = {
      pipetteEntities: {
        pip: {
          name: 'p1000_96',
          id: 'pip',
          tiprackDefURI: ['mockDefUri'],
          tiprackLabwareDef: [fixtureTiprack1000ul as LabwareDefinition2],
          spec: fixtureP100096V2Specs,
        },
      },
      labwareEntities: {
        [mockLabwareId]: {
          id: mockLabwareId,
          labwareDefURI: 'mockDefUri',
          def: fixture96Plate as LabwareDefinition2,
        },
        [mockTiprackId]: {
          id: mockTiprackId,
          labwareDefURI: mockTipUri,
          def: fixtureTiprack1000ul as LabwareDefinition2,
        },
        [mockAdapter]: {
          id: mockAdapter,
          labwareDefURI: 'mockAdapterUri',
          def: fixtureTiprackAdapter as LabwareDefinition2,
        },
        [mockLabware2]: {
          id: mockLabware2,
          labwareDefURI: 'mockDefUri',
          def: fixture96Plate as LabwareDefinition2,
        },
      },
      moduleEntities: {},
      additionalEquipmentEntities: {},
      liquidEntities: {},
      config: {
        OT_PD_DISABLE_MODULE_RESTRICTIONS: false,
      },
    }
    mockRobotState = {
      pipettes: { pip: { mount: 'left' } },
      labware: {
        [mockLabwareId]: { slot: 'D2' },
        [mockTiprackId]: { slot: 'A2' },
      },
      modules: {},
      tipState: { tipracks: {}, pipettes: {} },
      liquidState: { pipettes: {}, labware: {}, additionalEquipment: {} },
    }
  })

  it('returns true when the labware id is a trash bin', () => {
    const result = getIsSafePipetteMovement(
      {
        labware: {},
        pipettes: {},
        modules: {},
        tipState: {},
        liquidState: {},
      } as any,
      {
        labwareEntities: {},
        pipetteEntities: {},
        moduleEntities: {},
        liquidEntities: {},
        additionalEquipmentEntities: {
          trashBin: { name: 'trashBin', location: 'A3', id: 'trashBin' },
        },
        config: {} as any,
      },
      'mockId',
      'mockTrashBin',
      mockTipUri,
      { x: 0, y: 0, z: 0 }
    )
    expect(result).toEqual(true)
  })
  it('returns false when within pipette extents is false', () => {
    const result = getIsSafePipetteMovement(
      mockRobotState,
      mockInvariantProperties,
      mockPipId,
      mockLabwareId,
      mockTipUri,
      { x: -12, y: -100, z: 20 },
      mockWellName
    )
    expect(result).toEqual(false)
  })
  it('returns true when there are no collisions and a module near it', () => {
    mockRobotState.modules = {
      [mockModule]: { slot: 'D1', moduleState: {} as any },
    }
    mockInvariantProperties.moduleEntities = {
      [mockModule]: {
        id: mockModule,
        type: TEMPERATURE_MODULE_TYPE,
        model: TEMPERATURE_MODULE_V2,
      },
    }
    const result = getIsSafePipetteMovement(
      mockRobotState,
      mockInvariantProperties,
      mockPipId,
      mockLabwareId,
      mockTipUri,
      { x: -1, y: 5, z: 20 },
      mockWellName
    )
    expect(result).toEqual(true)
  })
  it('returns false when there is a tip that collides', () => {
    mockRobotState.tipState.tipracks = { mockTiprackId: { A1: true } }
    mockRobotState.labware = {
      ...mockRobotState.labware,
      [mockAdapter]: { slot: 'D1' },
    }
    const result = getIsSafePipetteMovement(
      mockRobotState,
      mockInvariantProperties,
      mockPipId,
      mockLabwareId,
      mockTipUri,
      { x: -1, y: 5, z: 0 },
      mockWellName
    )
    expect(result).toEqual(false)
  })
  it('returns false when there is a tall module nearby in a diagonal slot with adapter and labware', () => {
    mockRobotState.modules = {
      [mockModule]: { slot: 'D1', moduleState: {} as any },
    }
    mockRobotState.labware = {
      [mockLabwareId]: { slot: 'D2' },
      [mockAdapter]: {
        slot: mockModule,
      },
      [mockLabware2]: {
        slot: mockAdapter,
      },
    }
    mockInvariantProperties.moduleEntities = {
      [mockModule]: {
        id: mockModule,
        type: TEMPERATURE_MODULE_TYPE,
        model: TEMPERATURE_MODULE_V2,
      },
    }
    const result = getIsSafePipetteMovement(
      mockRobotState,
      mockInvariantProperties,
      mockPipId,
      mockLabwareId,
      mockTipUri,
      { x: 0, y: 0, z: 0 },
      mockWellName
    )
    expect(result).toEqual(false)
  })
  //    todo(jr, 4/23/24): add more test cases, test thermocycler collision - i'll do this in a follow up
})
