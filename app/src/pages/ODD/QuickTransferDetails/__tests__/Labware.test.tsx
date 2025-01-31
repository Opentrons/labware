import { vi, it, describe, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import {
  fixtureTiprack10ul,
  fixtureTiprack300ul,
  fixture96Plate,
} from '@opentrons/shared-data'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useRequiredProtocolLabware } from '/app/resources/protocols'
import { Labware } from '../Labware'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('/app/resources/protocols')

const MOCK_PROTOCOL_ID = 'mock_protocol_id'

const render = (props: ComponentProps<typeof Labware>) => {
  return renderWithProviders(<Labware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Labware', () => {
  let props: ComponentProps<typeof Labware>
  beforeEach(() => {
    props = {
      transferId: MOCK_PROTOCOL_ID,
    }
    when(vi.mocked(useRequiredProtocolLabware))
      .calledWith(MOCK_PROTOCOL_ID)
      .thenReturn([
        {
          definition: fixtureTiprack10ul as LabwareDefinition2,
          initialLocation: { slotName: '1' },
          moduleLocation: null,
          moduleModel: null,
          nickName: null,
        },
        {
          definition: fixtureTiprack300ul as LabwareDefinition2,
          initialLocation: { slotName: '3' },
          moduleLocation: null,
          moduleModel: null,
          nickName: null,
        },
        {
          definition: fixture96Plate as LabwareDefinition2,
          initialLocation: { slotName: '5' },
          moduleLocation: null,
          moduleModel: null,
          nickName: null,
        },
        {
          definition: fixtureTiprack10ul as LabwareDefinition2,
          initialLocation: { slotName: '7' },
          moduleLocation: null,
          moduleModel: null,
          nickName: null,
        },
      ])
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render column headers that indicate where the labware is, what is called, and how many are required', () => {
    render(props)
    screen.getByRole('columnheader', { name: 'Labware Name' })
    screen.getByRole('columnheader', { name: 'Quantity' })
  })
  it('should render the correct location, name, and connected status in each table row', () => {
    render(props)
    screen.getByRole('row', { name: 'Opentrons GEB 10uL Tiprack 2' })
    screen.getByRole('row', { name: '300ul Tiprack FIXTURE 1' })
    screen.getByRole('row', { name: 'ANSI 96 Standard Microplate 1' })
  })
})
