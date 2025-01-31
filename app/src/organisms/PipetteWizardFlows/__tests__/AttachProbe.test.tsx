import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { LEFT, SINGLE_MOUNT_PIPETTES } from '@opentrons/shared-data'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mock8ChannelAttachedPipetteInformation,
  mock96ChannelAttachedPipetteInformation,
  mockAttachedPipetteInformation,
} from '/app/redux/pipettes/__fixtures__'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { AttachProbe } from '../AttachProbe'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof AttachProbe>) => {
  return renderWithProviders(<AttachProbe {...props} />, {
    i18nInstance: i18n,
  })[0]
}
vi.mock('/app/resources/deck_configuration')

describe('AttachProbe', () => {
  let props: ComponentProps<typeof AttachProbe>
  beforeEach(() => {
    props = {
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve()),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.CALIBRATE,
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isRobotMoving: false,
      isExiting: false,
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      isOnDevice: false,
    }
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        {
          cutoutId: 'cutoutD3',
        } as any,
      ],
    } as any)
  })
  it('returns the correct information, buttons work as expected', async () => {
    render(props)
    screen.getByText('Attach calibration probe')
    screen.getByText(
      'Take the calibration probe from its storage location. Ensure its collar is unlocked. Push the pipette ejector up and press the probe firmly onto the pipette nozzle. Twist the collar to lock the probe. Test that the probe is secure by gently pulling it back and forth.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
    )
    const proceedBtn = screen.getByRole('button', { name: 'Begin calibration' })
    fireEvent.click(proceedBtn)
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'verifyTipPresence',
            params: {
              pipetteId: 'abc',
              expectedState: 'present',
              followSingularSensor: 'primary',
            },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'home',
            params: { axes: ['leftZ'] },
          },
          {
            commandType: 'home',
            params: { skipIfMountPositionOk: 'left' },
          },
          {
            commandType: 'calibration/calibratePipette',
            params: { mount: 'left' },
          },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: 'left' },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })

    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
  })

  it('returns the correct info when the pipette is a 8 channel', () => {
    props = {
      ...props,
      attachedPipettes: {
        left: mock8ChannelAttachedPipetteInformation,
        right: null,
      },
    }
    render(props)
    screen.getByText(
      nestedTextMatcher(
        'Take the calibration probe from its storage location. Ensure its collar is unlocked. Push the pipette ejector up and press the probe firmly onto the backmost pipette nozzle. Twist the collar to lock the probe. Test that the probe is secure by gently pulling it back and forth.'
      )
    )
  })

  it('returns the correct information when robot is in motion for single channel', () => {
    props = {
      ...props,
      isRobotMoving: true,
    }
    render(props)
    screen.getByText('Stand back, Flex 1-Channel 1000 μL is calibrating')
    screen.getByText(
      'The calibration probe will touch the sides of the calibration square in slot C2 to determine its exact position.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Probing_1.webm'
    )
  })

  it('returns the correct information when robot is in motion for 96 channel', () => {
    props = {
      ...props,
      attachedPipettes: {
        left: mock96ChannelAttachedPipetteInformation,
        right: null,
      },
      isRobotMoving: true,
    }
    render(props)
    screen.getByText('Stand back, Flex 96-Channel 1000 μL is calibrating')
    screen.getByText(
      'The calibration probe will touch the sides of the calibration square in slot C2 to determine its exact position.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Probing_96.webm'
    )
  })

  it('returns the correct information when robot is in motion during exiting', () => {
    props = {
      ...props,
      isRobotMoving: true,
      isExiting: true,
    }
    render(props)
    screen.getByText('Stand back, robot is in motion')
    expect(
      screen.queryByText(
        'The calibration probe will touch the sides of the calibration square in slot C2 to determine its exact position.'
      )
    ).not.toBeInTheDocument()
  })

  it('renders the error modal screen when errorMessage is true', () => {
    props = {
      ...props,
      errorMessage: 'error shmerror',
    }
    render(props)
    screen.getByText(
      'Return the calibration probe to its storage location before exiting.'
    )
    screen.getByText('error shmerror')
  })

  it('renders the correct text when is on device', async () => {
    props = {
      ...props,
      isOnDevice: true,
    }
    render(props)
    screen.getByText('Attach calibration probe')
    screen.getByText(
      'Take the calibration probe from its storage location. Ensure its collar is unlocked. Push the pipette ejector up and press the probe firmly onto the pipette nozzle. Twist the collar to lock the probe. Test that the probe is secure by gently pulling it back and forth.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Begin calibration' }))
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'verifyTipPresence',
            params: {
              pipetteId: 'abc',
              expectedState: 'present',
              followSingularSensor: 'primary',
            },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'home',
            params: { axes: ['leftZ'] },
          },
          {
            commandType: 'home',
            params: { skipIfMountPositionOk: 'left' },
          },
          {
            commandType: 'calibration/calibratePipette',
            params: { mount: 'left' },
          },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: 'left' },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByLabelText('back'))
    expect(props.goBack).toHaveBeenCalled()
  })

  it('does not render the goBack button when following a results screen from attach flow', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
    }
    expect(screen.queryByLabelText('back')).not.toBeInTheDocument()
  })

  it('renders a waste chute warning when 96 channel and waste chute are attached', () => {
    props = {
      ...props,
      attachedPipettes: {
        left: mock96ChannelAttachedPipetteInformation,
        right: null,
      },
    }
    render(props)
    screen.getByText(
      'Remove the waste chute from the deck plate adapter before proceeding.'
    )
  })
})
