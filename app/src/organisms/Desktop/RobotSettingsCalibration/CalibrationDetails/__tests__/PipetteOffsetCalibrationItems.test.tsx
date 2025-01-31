import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import {
  mockAttachedPipette,
  mockAttachedPipetteInformation,
} from '/app/redux/pipettes/__fixtures__'
import {
  useAttachedPipettes,
  useAttachedPipettesFromInstrumentsQuery,
} from '/app/resources/instruments'
import { useIsFlex } from '/app/redux-resources/robots'
import { renderWithProviders } from '/app/__testing-utils__'
import { PipetteOffsetCalibrationItems } from '../PipetteOffsetCalibrationItems'
import { OverflowMenu } from '../OverflowMenu'
import { formatLastCalibrated } from '../utils'

import type { ComponentProps } from 'react'
import type { Mount } from '@opentrons/components'
import type { AttachedPipettesByMount } from '/app/redux/pipettes/types'

const render = (
  props: ComponentProps<typeof PipetteOffsetCalibrationItems>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<PipetteOffsetCalibrationItems {...props} />, {
    i18nInstance: i18n,
  })
}

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
const mockPipetteOffsetCalibrationsForOt3 = [
  {
    modelName: 'mockPipetteModelLeft',
    serialNumber: '1234567',
    mount: 'left' as Mount,
    lastCalibrated: '2022-11-10T18:15:02',
  },
]

vi.mock('/app/redux/custom-labware/selectors')
vi.mock('/app/redux/sessions/selectors')
vi.mock('/app/redux/discovery')
vi.mock('/app/assets/labware/findLabware')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/instruments')
vi.mock('../OverflowMenu')

const mockAttachedPipettes: AttachedPipettesByMount = {
  left: mockAttachedPipette,
  right: mockAttachedPipette,
} as any
const mockUpdateRobotStatus = vi.fn()

describe('PipetteOffsetCalibrationItems', () => {
  let props: ComponentProps<typeof PipetteOffsetCalibrationItems>

  beforeEach(() => {
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: null,
      right: null,
    })
    vi.mocked(OverflowMenu).mockReturnValue(<div>mock overflow menu</div>)
    vi.mocked(useAttachedPipettes).mockReturnValue(mockAttachedPipettes)
    when(useIsFlex).calledWith('otie').thenReturn(false)
    props = {
      robotName: ROBOT_NAME,
      formattedPipetteOffsetCalibrations: mockPipetteOffsetCalibrations,
      updateRobotStatus: mockUpdateRobotStatus,
    }
  })

  it('should render table headers', () => {
    render(props)
    screen.getByText('Pipette Model and Serial')
    screen.getByText('Mount')
    screen.getByText('Tip Rack')
    screen.getByText('Last Calibrated')
  })

  it('should omit tip rack table header for Flex', () => {
    when(useIsFlex).calledWith('otie').thenReturn(true)
    render(props)
    screen.getByText('Pipette Model and Serial')
    screen.getByText('Mount')
    expect(screen.queryByText('Tip Rack')).toBeNull()
    screen.getByText('Last Calibrated')
  })

  it('should include the correct information for Flex when 1 pipette is attached', () => {
    props = {
      ...props,
      formattedPipetteOffsetCalibrations: mockPipetteOffsetCalibrationsForOt3,
    }
    vi.mocked(useIsFlex).mockReturnValue(true)
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: mockAttachedPipetteInformation,
      right: null,
    })
    render(props)
    screen.getByText('mockPipetteModelLeft')
    screen.getByText('1234567')
    screen.getByText('left')
    screen.getByText('11/10/2022 18:15:02')
  })

  it('should render overflow menu', () => {
    render(props)
    expect(screen.queryAllByText('mock overflow menu')).toHaveLength(2)
  })

  it('should render pipette offset calibrations data - unknown custom tiprack', () => {
    render(props)
    screen.getByText('mockPipetteModelLeft')
    screen.getByText('1234567')
    screen.getByText('left')
    screen.getByText('11/10/2022 18:14:01')
    screen.getByText('mockPipetteModelRight')
    screen.getByText('01234567')
    screen.getByText('right')
    screen.getByText('11/10/2022 18:15:02')
  })

  it('should only render text when calibration missing', () => {
    props = {
      ...props,
      formattedPipetteOffsetCalibrations: [
        {
          modelName: 'mockPipetteModelLeft',
          serialNumber: '1234567',
          mount: 'left' as Mount,
          tiprack: 'mockTiprackLeft',
          markedBad: false,
        },
      ],
    }
    render(props)
    screen.getByText('Not calibrated')
  })

  it('should only render last calibrated date text when calibration recommended', () => {
    props = {
      ...props,
      formattedPipetteOffsetCalibrations: [
        {
          modelName: 'mockPipetteModelLeft',
          serialNumber: '1234567',
          mount: 'left' as Mount,
          tiprack: 'mockTiprackLeft',
          lastCalibrated: '2022-11-10T18:15:02',
          markedBad: true,
        },
      ],
    }
    render(props)
    expect(screen.queryByText('Not calibrated')).not.toBeInTheDocument()
    screen.getByText(formatLastCalibrated('2022-11-10T18:15:02'))
  })
})
