import { vi, it, describe, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { when } from 'vitest-when'
import {
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useRequiredProtocolHardware } from '/app/resources/protocols'
import { Hardware } from '../Hardware'

import type { ComponentProps } from 'react'

vi.mock('/app/transformations/commands')
vi.mock('/app/resources/protocols')
vi.mock('/app/redux/config')

const MOCK_PROTOCOL_ID = 'mock_protocol_id'

const render = (props: ComponentProps<typeof Hardware>) => {
  return renderWithProviders(<Hardware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Hardware', () => {
  let props: ComponentProps<typeof Hardware>
  beforeEach(() => {
    props = {
      transferId: MOCK_PROTOCOL_ID,
    }
    when(vi.mocked(useRequiredProtocolHardware))
      .calledWith(MOCK_PROTOCOL_ID)
      .thenReturn({
        requiredProtocolHardware: [
          {
            hardwareType: 'pipette',
            pipetteName: 'p10_single',
            mount: 'left',
            connected: true,
          },
          {
            hardwareType: 'pipette',
            pipetteName: 'p1000_single',
            mount: 'right',
            connected: false,
          },
          {
            hardwareType: 'module',
            moduleModel: 'heaterShakerModuleV1',
            slot: '1',
            hasSlotConflict: false,
            connected: true,
          },
          {
            hardwareType: 'module',
            moduleModel: 'temperatureModuleV2',
            slot: '3',
            hasSlotConflict: false,
            connected: false,
          },
          {
            hardwareType: 'fixture',
            cutoutFixtureId: WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
            location: { cutout: WASTE_CHUTE_CUTOUT },
            hasSlotConflict: false,
          },
          {
            hardwareType: 'fixture',
            cutoutFixtureId: STAGING_AREA_RIGHT_SLOT_FIXTURE,
            location: { cutout: 'cutoutB3' },
            hasSlotConflict: false,
          },
        ],
        isLoading: false,
      })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render column headers that indicate where the hardware is, what is called, and whether it is connected', () => {
    render(props)
    screen.getByRole('columnheader', { name: 'Location' })
    screen.getByRole('columnheader', { name: 'Hardware' })
  })
  it('should render the correct location, name, and connected status in each table row', () => {
    render(props)
    screen.getByRole('row', { name: 'Left Mount P10 Single-Channel GEN1' })
    screen.getByRole('row', {
      name: 'Right Mount P1000 Single-Channel GEN1',
    })
    screen.getByRole('row', { name: '1 Heater-Shaker Module GEN1' })
    screen.getByRole('row', { name: '3 Temperature Module GEN2' })
    screen.getByRole('row', { name: 'D3 Waste chute only' })
    screen.getByRole('row', { name: 'B3 Staging area slot' })
  })
})
