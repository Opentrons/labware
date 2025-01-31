import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getResetConfigOptions, resetConfig } from '/app/redux/robot-admin'
import { useDispatchApiRequest } from '/app/redux/robot-api'

import { DeviceReset } from '../DeviceReset'

import type { ComponentProps } from 'react'
import type { DispatchApiRequestType } from '/app/redux/robot-api'

vi.mock('/app/redux/robot-admin')
vi.mock('/app/redux/robot-api')

const mockResetConfigOptions = [
  {
    id: 'pipetteOffsetCalibrations',
    name: 'pipette calibration FooBar',
    description: 'pipette calibration fooBar description',
  },
  {
    id: 'gripperOffsetCalibrations',
    name: 'gripper calibration FooBar',
    description: 'runsHistory fooBar description',
  },
  {
    id: 'runsHistory',
    name: 'RunsHistory FooBar',
    description: 'runsHistory fooBar description',
  },
  {
    id: 'bootScripts',
    name: 'Boot Scripts FooBar',
    description: 'bootScripts fooBar description',
  },
  {
    id: 'moduleCalibration',
    name: 'Module Calibration FooBar',
    description: 'moduleCalibration fooBar description',
  },
  {
    id: 'authorizedKeys',
    name: 'SSH Keys Foo',
    description: 'SSH Keys foo description',
  },
]

const render = (props: ComponentProps<typeof DeviceReset>) => {
  return renderWithProviders(
    <DeviceReset {...props} />,

    { i18nInstance: i18n }
  )
}

describe('DeviceReset', () => {
  let props: ComponentProps<typeof DeviceReset>
  let dispatchApiRequest: DispatchApiRequestType

  beforeEach(() => {
    props = {
      robotName: 'mockRobot',
      setCurrentOption: vi.fn(),
    }
    vi.mocked(getResetConfigOptions).mockReturnValue(mockResetConfigOptions)
    dispatchApiRequest = vi.fn()
    vi.mocked(useDispatchApiRequest).mockReturnValue([dispatchApiRequest, []])
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('Clear pipette calibration')
    screen.getByText('Clear gripper calibration')
    screen.getByText('Clear module calibration')
    screen.getByText('Clear protocol run history')
    screen.getByText('Clears information about past runs of all protocols.')
    screen.getByText('Clear all stored data')
    screen.getByText(
      'Clears calibrations, protocols, and all settings except robot name and network settings.'
    )
    expect(
      screen.queryByText('Clear the ssh authorized keys')
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('DeviceReset_clear_data_button')).toBeDisabled()
  })

  it('when tapping a option button, the clear button is enabled', () => {
    render(props)
    fireEvent.click(screen.getByText('Clear pipette calibration'))
    expect(
      screen.getByTestId('DeviceReset_clear_data_button')
    ).not.toBeDisabled()
  })

  it('when tapping a option button and tapping the clear button, a mock function is called', () => {
    const clearMockResetOptions = {
      pipetteOffsetCalibrations: true,
      moduleCalibration: true,
      runsHistory: true,
    }
    render(props)
    fireEvent.click(screen.getByText('Clear pipette calibration'))
    fireEvent.click(screen.getByText('Clear protocol run history'))
    fireEvent.click(screen.getByText('Clear module calibration'))
    const clearButton = screen.getByText('Clear data and restart robot')
    fireEvent.click(clearButton)
    screen.getByText('Are you sure you want to reset your device?')
    fireEvent.click(screen.getByText('Confirm'))
    expect(dispatchApiRequest).toBeCalledWith(
      resetConfig('mockRobot', clearMockResetOptions)
    )
  })

  it('when tapping clear all stored data, all options are active', () => {
    const clearMockResetOptions = {
      pipetteOffsetCalibrations: true,
      moduleCalibration: true,
      runsHistory: true,
      gripperOffsetCalibrations: true,
      authorizedKeys: true,
      onDeviceDisplay: true,
      deckConfiguration: true,
    }

    render(props)
    fireEvent.click(screen.getByText('Clear all stored data'))
    const clearButton = screen.getByText('Clear data and restart robot')
    fireEvent.click(clearButton)
    screen.getByText('Are you sure you want to reset your device?')
    fireEvent.click(screen.getByText('Confirm'))
    expect(dispatchApiRequest).toBeCalledWith(
      resetConfig('mockRobot', clearMockResetOptions)
    )
  })

  it('when tapping all options except clear all stored data, all options are active', () => {
    const clearMockResetOptions = {
      pipetteOffsetCalibrations: true,
      moduleCalibration: true,
      runsHistory: true,
      gripperOffsetCalibrations: true,
      authorizedKeys: true,
      onDeviceDisplay: true,
      deckConfiguration: true,
    }

    render(props)
    fireEvent.click(screen.getByText('Clear pipette calibration'))
    fireEvent.click(screen.getByText('Clear gripper calibration'))
    fireEvent.click(screen.getByText('Clear module calibration'))
    fireEvent.click(screen.getByText('Clear protocol run history'))
    const clearButton = screen.getByText('Clear data and restart robot')
    fireEvent.click(clearButton)
    screen.getByText('Are you sure you want to reset your device?')
    fireEvent.click(screen.getByText('Confirm'))
    expect(dispatchApiRequest).toBeCalledWith(
      resetConfig('mockRobot', clearMockResetOptions)
    )
  })

  it('when tapping clear all stored data and unselect one options, all options are not active', () => {
    const clearMockResetOptions = {
      pipetteOffsetCalibrations: false,
      moduleCalibration: true,
      runsHistory: true,
      gripperOffsetCalibrations: true,
      authorizedKeys: false,
      onDeviceDisplay: false,
      deckConfiguration: false,
    }

    render(props)
    fireEvent.click(screen.getByText('Clear all stored data'))
    fireEvent.click(screen.getByText('Clear pipette calibration'))
    const clearButton = screen.getByText('Clear data and restart robot')
    fireEvent.click(clearButton)
    screen.getByText('Are you sure you want to reset your device?')
    fireEvent.click(screen.getByText('Confirm'))
    expect(dispatchApiRequest).toBeCalledWith(
      resetConfig('mockRobot', clearMockResetOptions)
    )
  })
})
