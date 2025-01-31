import { getLabwareDefURI } from '@opentrons/shared-data'
import { mockTipRackDef } from './mockTipRackDef'

export const mockExistingOffset = {
  id: 'offset1',
  createdAt: 'fake_timestamp',
  definitionUri: getLabwareDefURI(mockTipRackDef),
  location: { slotName: '2' },
  vector: { x: 1, y: 2, z: 3 },
}
export const mockOtherExistingOffset = {
  id: 'offset2',
  createdAt: 'fake_timestamp',
  definitionUri: getLabwareDefURI(mockTipRackDef),
  location: { slotName: '4' },
  vector: { x: 4, y: 5, z: 6 },
}
export const mockExistingOffsets = [mockExistingOffset, mockOtherExistingOffset]
