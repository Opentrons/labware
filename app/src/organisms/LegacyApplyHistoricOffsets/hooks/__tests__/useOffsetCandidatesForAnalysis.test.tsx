import { describe, it, expect, vi, beforeEach } from 'vitest'
import { when } from 'vitest-when'
import { renderHook, waitFor } from '@testing-library/react'
import {
  getLabwareDisplayName,
  getLoadedLabwareDefinitionsByUri,
  fixtureTiprack300ul,
} from '@opentrons/shared-data'
import { useAllHistoricOffsets } from '../useAllHistoricOffsets'
import { getLabwareLocationCombos } from '../getLabwareLocationCombos'

import { useOffsetCandidatesForAnalysis } from '../useOffsetCandidatesForAnalysis'
import { storedProtocolData as storedProtocolDataFixture } from '/app/redux/protocol-storage/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { OffsetCandidate } from '../useOffsetCandidatesForAnalysis'

vi.mock('../useAllHistoricOffsets')
vi.mock('../getLabwareLocationCombos')
vi.mock('@opentrons/shared-data')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/useNotifyDataReady')

const mockLabwareDef = fixtureTiprack300ul as LabwareDefinition2

const mockFirstCandidate: OffsetCandidate = {
  id: 'first_offset_id',
  labwareDisplayName: 'First Fake Labware Display Name',
  location: { slotName: '1' },
  vector: { x: 1, y: 2, z: 3 },
  definitionUri: 'firstFakeDefURI',
  createdAt: '2022-05-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-05-11T13:33:51.012179+00:00',
}
const mockSecondCandidate: OffsetCandidate = {
  id: 'second_offset_id',
  labwareDisplayName: 'Second Fake Labware Display Name',
  location: { slotName: '2' },
  vector: { x: 4, y: 5, z: 6 },
  definitionUri: 'secondFakeDefURI',
  createdAt: '2022-06-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-06-11T13:33:51.012179+00:00',
}
const mockThirdCandidate: OffsetCandidate = {
  id: 'third_offset_id',
  labwareDisplayName: 'Third Fake Labware Display Name',
  location: { slotName: '3', moduleModel: 'heaterShakerModuleV1' },
  vector: { x: 7, y: 8, z: 9 },
  definitionUri: 'thirdFakeDefURI',
  createdAt: '2022-07-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-07-11T13:33:51.012179+00:00',
}

const mockFirstDupCandidate = {
  ...mockFirstCandidate,
  id: 'laterDuplicateOfFirstOffset',
  createdAt: '2022-08-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-08-11T13:33:51.012179+00:00',
}

const mockRobotIp = 'fakeRobotIp'

describe('useOffsetCandidatesForAnalysis', () => {
  beforeEach(() => {
    when(useAllHistoricOffsets)
      .calledWith({ hostname: mockRobotIp })
      .thenReturn([
        mockFirstDupCandidate,
        mockThirdCandidate,
        mockSecondCandidate,
        mockFirstCandidate,
      ])
    when(useAllHistoricOffsets).calledWith(null).thenReturn([])
    when(getLabwareLocationCombos)
      .calledWith(expect.any(Array), expect.any(Array), expect.any(Array))
      .thenReturn([
        {
          location: { slotName: '1' },
          definitionUri: 'firstFakeDefURI',
          labwareId: 'firstFakeId',
        },
        {
          location: { slotName: '2' },
          definitionUri: 'secondFakeDefURI',
          labwareId: 'secondFakeId',
        },
        {
          location: { slotName: '3', moduleModel: 'heaterShakerModuleV1' },
          labwareId: 'thirdFakeId',
          moduleId: 'fakeHSId',
          definitionUri: 'thirdFakeDefURI',
        },
      ])
    when(getLoadedLabwareDefinitionsByUri)
      .calledWith(expect.any(Array))
      .thenReturn({
        firstFakeDefURI: mockLabwareDef,
        secondFakeDefURI: mockLabwareDef,
        thirdFakeDefURI: mockLabwareDef,
      })
  })

  it('returns an empty array if robot ip but no analysis output', async () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <div>{children}</div>
    const { result } = renderHook(
      () => useOffsetCandidatesForAnalysis(null, mockRobotIp),
      { wrapper }
    )
    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })

  it('returns an empty array if no robot ip', async () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <div>{children}</div>
    const { result } = renderHook(
      () =>
        useOffsetCandidatesForAnalysis(
          storedProtocolDataFixture.mostRecentAnalysis,
          null
        ),
      { wrapper }
    )
    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })
  it('returns candidates for each first match with newest first', async () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <div>{children}</div>
    const { result } = renderHook(
      () =>
        useOffsetCandidatesForAnalysis(
          storedProtocolDataFixture.mostRecentAnalysis,
          mockRobotIp
        ),
      { wrapper }
    )
    await waitFor(() => {
      expect(result.current).toEqual([
        {
          ...mockFirstDupCandidate,
          labwareDisplayName: getLabwareDisplayName(mockLabwareDef),
        },
        {
          ...mockSecondCandidate,
          labwareDisplayName: getLabwareDisplayName(mockLabwareDef),
        },
        {
          ...mockThirdCandidate,
          labwareDisplayName: getLabwareDisplayName(mockLabwareDef),
        },
      ])
    })
  })
})
