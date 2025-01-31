import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { fixture96Plate, fixtureTiprackAdapter } from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { LabwareOffsetTable } from '../LabwareOffsetTable'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { OffsetCandidate } from '../hooks/useOffsetCandidatesForAnalysis'

const mockLabwareDef = fixture96Plate as LabwareDefinition2
const mockAdapterDef = fixtureTiprackAdapter as LabwareDefinition2

const mockFirstCandidate: OffsetCandidate = {
  id: 'first_offset_id',
  labwareDisplayName: 'First Fake Labware Display Name',
  location: { slotName: '1' },
  vector: { x: 1, y: 2, z: 3 },
  definitionUri: 'firstFakeDefURI',
  createdAt: '2022-07-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-07-11T13:33:51.012179+00:00',
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
  createdAt: '2022-05-11T13:34:51.012179+00:00',
  runCreatedAt: '2022-05-11T13:33:51.012179+00:00',
}

const mockFourthCandidate: OffsetCandidate = {
  id: 'fourth_offset_id',
  labwareDisplayName: 'Fourth Fake Labware Display Name',
  location: {
    slotName: '3',
    moduleModel: 'heaterShakerModuleV1',
    definitionUri: 'opentrons/opentrons_96_pcr_adapter/1',
  },
  vector: { x: 7.1, y: 8.1, z: 7.2 },
  definitionUri: 'fourthFakeDefURI',
  createdAt: '2022-05-12T13:34:51.012179+00:00',
  runCreatedAt: '2022-05-12T13:33:51.012179+00:00',
}
const render = () =>
  renderWithProviders<ComponentProps<typeof LabwareOffsetTable>>(
    <LabwareOffsetTable
      labwareDefinitions={[mockLabwareDef, mockAdapterDef]}
      offsetCandidates={[
        mockFirstCandidate,
        mockSecondCandidate,
        mockThirdCandidate,
        mockFourthCandidate,
      ]}
    />,
    { i18nInstance: i18n }
  )

describe('LabwareOffsetTable', () => {
  it('renders headers text and values for each candidate', () => {
    render()
    // headers
    screen.getByText('location')
    screen.getByText('Run')
    screen.getByText('labware')
    screen.getByText('labware offset data')
    expect(screen.queryAllByText('X')).toHaveLength(4)
    expect(screen.queryAllByText('Y')).toHaveLength(4)
    expect(screen.queryAllByText('Z')).toHaveLength(4)
    // first candidate
    screen.getByText('Slot 1')
    screen.getByText(/7\/11\/2022/i)
    screen.getByText('First Fake Labware Display Name')
    screen.getByText('1.00')
    screen.getByText('2.00')
    screen.getByText('3.00')
    // second candidate
    screen.getByText('Slot 2')
    screen.getByText(/6\/11\/2022/i)
    screen.getByText('Second Fake Labware Display Name')
    screen.getByText('4.00')
    screen.getByText('5.00')
    screen.getByText('6.00')
    // third candidate is adapter on module
    screen.getByText('Heater-Shaker Module GEN1 in Slot 3')
    screen.getByText(/5\/11\/2022/i)
    screen.getByText('Third Fake Labware Display Name')
    screen.getByText('7.00')
    screen.getByText('8.00')
    screen.getByText('9.00')
    //  fourth candidate is labware on adapter on module
    screen.getByText('in Heater-Shaker Module GEN1 in Slot 3')
    screen.getByText('Fourth Fake Labware Display Name')
    screen.getByText('7.20')
    screen.getByText('8.10')
    screen.getByText('7.10')
  })
})
