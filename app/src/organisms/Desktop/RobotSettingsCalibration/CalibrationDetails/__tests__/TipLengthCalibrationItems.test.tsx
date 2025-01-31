import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { TipLengthCalibrationItems } from '../TipLengthCalibrationItems'
import { OverflowMenu } from '../OverflowMenu'

import type { ComponentProps } from 'react'
import type { Mount } from '@opentrons/components'

vi.mock('/app/redux/custom-labware/selectors')
vi.mock('/app/redux/config')
vi.mock('/app/redux/sessions/selectors')
vi.mock('/app/redux/discovery')
vi.mock('/app/assets/labware/findLabware')
vi.mock('/app/organisms/Desktop/Devices/hooks')
vi.mock('../OverflowMenu')

const ROBOT_NAME = 'otie'

const mockPipetteOffsetCalibrations = [
  {
    modelName: 'mockPipetteModelLeft',
    serialNumber: '1234567',
    mount: 'left' as Mount,
    tiprack: 'mockTiprackLeft',
    lastCalibrated: '2022-11-10T18:14:01',
    markedBad: false,
  },
  {
    modelName: 'mockPipetteModelRight',
    serialNumber: '01234567',
    mount: 'right' as Mount,
    tiprack: 'mockTiprackRight',
    lastCalibrated: '2022-11-10T18:15:02',
    markedBad: false,
  },
]
const mockTipLengthCalibrations = [
  {
    tiprack: 'opentrons/opentrons_96_tiprack_1000ul/1',
    pipette: 'Mock-P1KSV222021011802',
    lastCalibrated: '2022-11-10T18:14:01',
    markedBad: false,
  },
  {
    tiprack: 'opentrons/opentrons_96_tiprack_1000ul/1',
    pipette: 'Mock-P2KSV222021011802',
    lastCalibrated: '2022-11-10T18:15:02',
    markedBad: false,
  },
]

const mockUpdateRobotStatus = vi.fn()

const render = (
  props: ComponentProps<typeof TipLengthCalibrationItems>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TipLengthCalibrationItems {...props} />, {
    i18nInstance: i18n,
  })
}
describe('TipLengthCalibrationItems', () => {
  let props: ComponentProps<typeof TipLengthCalibrationItems>

  beforeEach(() => {
    vi.mocked(OverflowMenu).mockReturnValue(<div>mock overflow menu</div>)
    props = {
      robotName: ROBOT_NAME,
      formattedPipetteOffsetCalibrations: mockPipetteOffsetCalibrations,
      formattedTipLengthCalibrations: mockTipLengthCalibrations,
      updateRobotStatus: mockUpdateRobotStatus,
    }
  })

  it('should render table headers', () => {
    render(props)
    screen.getByText('Tip Rack')
    screen.getByText('Pipette Model and Serial')
    screen.getByText('Last Calibrated')
  })

  it('should render overFlow menu', () => {
    render(props)
    expect(screen.queryAllByText('mock overflow menu')).toHaveLength(2)
  })

  it('should render tip length calibrations data', () => {
    render(props)
    // todo tiprack
    screen.getByText('Mock-P1KSV222021011802')
    screen.getByText('11/10/2022 18:14:01')

    screen.getByText('Mock-P2KSV222021011802')
    screen.getByText('11/10/2022 18:15:02')
  })
})
