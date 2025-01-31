import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { useIsFlex } from '/app/redux-resources/robots'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'
import { UpdateBanner } from '..'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/devices/hooks/useIsEstopNotDisengaged')

const render = (props: ComponentProps<typeof UpdateBanner>) => {
  return renderWithProviders(<UpdateBanner {...props} />, {
    i18nInstance: i18n,
    initialState: { robotsByName: 'test' },
  })[0]
}

describe('Module Update Banner', () => {
  let props: ComponentProps<typeof UpdateBanner>

  beforeEach(() => {
    props = {
      robotName: 'testRobot',
      updateType: 'calibration',
      setShowBanner: vi.fn(),
      handleUpdateClick: vi.fn(),
      serialNumber: 'test_number',
      isTooHot: false,
    }
    when(useIsFlex).calledWith(props.robotName).thenReturn(true)
    when(useIsEstopNotDisengaged).calledWith(props.robotName).thenReturn(false)
  })

  it('enables the updateType and serialNumber to be used as the test ID', () => {
    render(props)
    screen.getByTestId('ModuleCard_calibration_update_banner_test_number')
  })

  it('renders an error banner if calibration is required with no exit button', () => {
    render(props)
    screen.getByLabelText('icon_error')
    expect(screen.queryByLabelText('close_icon')).not.toBeInTheDocument()
  })

  it('renders an error banner if a mandatory firmware update is required with no exit button', () => {
    props = {
      ...props,
      updateType: 'firmware_important',
    }
    render(props)
    screen.getByLabelText('icon_error')
    expect(screen.queryByLabelText('close_icon')).not.toBeInTheDocument()
  })

  it('renders a warning banner if an optional firmware update is needed with an exit button that dismisses the banner', () => {
    props = {
      ...props,
      updateType: 'firmware',
    }
    render(props)
    screen.getByLabelText('icon_warning')
    expect(screen.getByLabelText('close_icon')).toBeInTheDocument()
    const btn = screen.getByLabelText('close_icon')
    fireEvent.click(btn)
    expect(props.setShowBanner).toHaveBeenCalled()
  })

  it('enables clicking of text to open the appropriate update modal', () => {
    render(props)
    const calibrateBtn = screen.getByText('Calibrate now')
    fireEvent.click(calibrateBtn)
    expect(props.handleUpdateClick).toHaveBeenCalled()

    props = {
      ...props,
      updateType: 'firmware',
    }
    render(props)
    const firmwareBtn = screen.getByText('Update now')
    fireEvent.click(firmwareBtn)
    expect(props.handleUpdateClick).toHaveBeenCalledTimes(2)
  })

  it('should not render a calibrate link if pipette attachment is required', () => {
    props = {
      ...props,
      attachPipetteRequired: true,
    }
    render(props)
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })

  it('should not render a calibrate link if pipette calibration is required', () => {
    props = {
      ...props,
      calibratePipetteRequired: true,
    }
    render(props)
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })

  it('should not render a calibrate link if pipette firmware update is required', () => {
    props = {
      ...props,
      updatePipetteFWRequired: true,
    }
    render(props)
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })

  it('should not render a calibrate link when e-stop is pressed', () => {
    when(useIsEstopNotDisengaged).calledWith(props.robotName).thenReturn(true)
    render(props)
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })

  it('should render a firmware update link if pipette calibration or firmware update is required', () => {
    props = {
      ...props,
      updateType: 'firmware',
      attachPipetteRequired: true,
      calibratePipetteRequired: true,
      updatePipetteFWRequired: true,
    }
    render(props)
    expect(screen.getByText('Update now')).toBeInTheDocument()
  })

  it('should not render a calibrate update link if the robot is an OT-2', () => {
    when(useIsFlex).calledWith(props.robotName).thenReturn(false)
    render(props)
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })
})
