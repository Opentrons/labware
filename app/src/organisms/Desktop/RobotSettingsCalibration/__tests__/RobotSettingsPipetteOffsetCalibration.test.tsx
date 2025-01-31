import { when } from 'vitest-when'
import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { i18n } from '/app/i18n'
import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
  mockPipetteOffsetCalibration3,
} from '/app/redux/calibration/pipette-offset/__fixtures__'
import { usePipetteOffsetCalibrations } from '/app/organisms/Desktop/Devices/hooks'
import { useAttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { useIsFlex } from '/app/redux-resources/robots'

import { RobotSettingsPipetteOffsetCalibration } from '../RobotSettingsPipetteOffsetCalibration'
import { PipetteOffsetCalibrationItems } from '../CalibrationDetails/PipetteOffsetCalibrationItems'

import type { ComponentProps } from 'react'
import type { FormattedPipetteOffsetCalibration } from '..'

vi.mock('/app/organisms/Desktop/Devices/hooks')
vi.mock('/app/resources/instruments')
vi.mock('/app/redux-resources/robots')
vi.mock('../CalibrationDetails/PipetteOffsetCalibrationItems')

const mockFormattedPipetteOffsetCalibrations: FormattedPipetteOffsetCalibration[] = []
const mockUpdateRobotStatus = vi.fn()

const render = (
  props?: Partial<ComponentProps<typeof RobotSettingsPipetteOffsetCalibration>>
) => {
  return renderWithProviders(
    <RobotSettingsPipetteOffsetCalibration
      formattedPipetteOffsetCalibrations={
        mockFormattedPipetteOffsetCalibrations
      }
      robotName="otie"
      updateRobotStatus={mockUpdateRobotStatus}
      {...props}
    />,
    {
      i18nInstance: i18n,
    }
  )
}

describe('RobotSettingsPipetteOffsetCalibration', () => {
  beforeEach(() => {
    when(useIsFlex).calledWith('otie').thenReturn(false)
    vi.mocked(usePipetteOffsetCalibrations).mockReturnValue([
      mockPipetteOffsetCalibration1,
      mockPipetteOffsetCalibration2,
      mockPipetteOffsetCalibration3,
    ])
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: null,
      right: null,
    })
    vi.mocked(PipetteOffsetCalibrationItems).mockReturnValue(
      <div>PipetteOffsetCalibrationItems</div>
    )
  })

  it('renders a title - Pipette Offset Calibrations', () => {
    render()
    screen.getByText('Pipette Offset Calibrations')
    screen.getByText('PipetteOffsetCalibrationItems')
  })

  it('renders a Flex title and description - Pipette Calibrations', () => {
    when(useIsFlex).calledWith('otie').thenReturn(true)
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: mockAttachedPipetteInformation,
      right: null,
    })
    render()
    screen.getByText('Pipette Calibrations')
    screen.getByText(
      `Pipette calibration uses a metal probe to determine the pipette's exact position relative to precision-cut squares on deck slots.`
    )
    screen.getByText('PipetteOffsetCalibrationItems')
  })

  it('renders Not calibrated yet when no pipette offset calibrations data', () => {
    vi.mocked(usePipetteOffsetCalibrations).mockReturnValue(null)
    render()
    screen.getByText('No pipette attached')
  })
})
