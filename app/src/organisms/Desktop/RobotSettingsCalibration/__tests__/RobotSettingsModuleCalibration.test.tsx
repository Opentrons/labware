import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach } from 'vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockFetchModulesSuccessActionPayloadModules } from '/app/redux/modules/__fixtures__'
import { RobotSettingsModuleCalibration } from '../RobotSettingsModuleCalibration'
import { ModuleCalibrationItems } from '../CalibrationDetails/ModuleCalibrationItems'

import type { ComponentProps } from 'react'

vi.mock('../CalibrationDetails/ModuleCalibrationItems')

const render = (
  props: ComponentProps<typeof RobotSettingsModuleCalibration>
) => {
  return renderWithProviders(<RobotSettingsModuleCalibration {...props} />, {
    i18nInstance: i18n,
  })
}

const ROBOT_NAME = 'mockRobot'

describe('RobotSettingsModuleCalibration', () => {
  let props: ComponentProps<typeof RobotSettingsModuleCalibration>

  beforeEach(() => {
    props = {
      attachedModules: mockFetchModulesSuccessActionPayloadModules,
      updateRobotStatus: vi.fn(),
      formattedPipetteOffsetCalibrations: [],
      robotName: ROBOT_NAME,
    }
    vi.mocked(ModuleCalibrationItems).mockReturnValue(
      <div>mock ModuleCalibrationItems</div>
    )
  })

  it('should render text and ModuleCalibrationItems when a module is attached', () => {
    render(props)
    screen.getByText('Module Calibration')
    screen.getByText(
      "Module calibration uses a pipette and attached probe to determine the module's exact position relative to the deck."
    )
    screen.getByText('mock ModuleCalibrationItems')
  })

  it('should render no modules attached when there is no module', () => {
    props = { ...props, attachedModules: [] }
    render(props)
    screen.getByText('Module Calibration')
    screen.getByText(
      "Module calibration uses a pipette and attached probe to determine the module's exact position relative to the deck."
    )
    screen.getByText('No modules attached')
  })
})
