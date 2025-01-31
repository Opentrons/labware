import { getLabwareDefURI } from '@opentrons/shared-data'
import { mockTipRackDef } from './mockTipRackDef'
import { mockLabwareDef } from './mockLabwareDef'

import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

export const mockCompletedAnalysis: CompletedProtocolAnalysis = {
  id: 'fakeAnalysisId',
  status: 'completed',
  result: 'ok',
  errors: [],
  labware: [
    {
      id: 'labwareId1',
      loadName: 'fakeLoadName',
      definitionUri: getLabwareDefURI(mockTipRackDef),
      location: { slotName: '1' },
    },
    {
      id: 'labwareId2',
      loadName: 'fakeSecondLoadName',
      definitionUri: getLabwareDefURI(mockLabwareDef),
      location: { slotName: '2' },
    },
  ],
  pipettes: [
    {
      id: 'pipetteId1',
      pipetteName: 'p10_single',
      mount: 'left',
    },
  ],
  modules: [],
  liquids: [],
  commands: [
    {
      commandType: 'loadLabware',
      id: 'fakeCommandId',
      status: 'succeeded',
      createdAt: 'fakeCreatedAtTimestamp',
      startedAt: 'fakeStartedAtTimestamp',
      completedAt: 'fakecompletedAtTimestamp',
      error: null,
      params: {
        labwareId: 'labwareId1',
        location: { slotName: '1' },
        version: 1,
        loadName: 'mockLoadname',
        namespace: 'mockNamespace',
      },
      result: {
        labwareId: 'labwareId1',
        definition: mockTipRackDef,
        offset: { x: 0, y: 0, z: 0 },
      },
    },
    {
      commandType: 'loadLabware',
      id: 'fakeSecondCommandId',
      status: 'succeeded',
      createdAt: 'fakeCreatedAtTimestamp',
      startedAt: 'fakeStartedAtTimestamp',
      completedAt: 'fakecompletedAtTimestamp',
      error: null,
      params: {
        labwareId: 'labwareId2',
        location: { slotName: '2' },
        version: 1,
        loadName: 'mockLoadname',
        namespace: 'mockNamespace',
      },
      result: {
        labwareId: 'labwareId2',
        definition: mockLabwareDef,
        offset: { x: 0, y: 0, z: 0 },
      },
    },
  ],
}
