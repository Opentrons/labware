import { fireEvent, waitFor, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { LEFT, NINETY_SIX_CHANNEL } from '@opentrons/shared-data'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { MountingPlate } from '../MountingPlate'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof MountingPlate>) => {
  return renderWithProviders(<MountingPlate {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('MountingPlate', () => {
  let props: ComponentProps<typeof MountingPlate>
  beforeEach(() => {
    props = {
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.ATTACH,
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isRobotMoving: false,
      selectedPipette: NINETY_SIX_CHANNEL,
      isOnDevice: false,
    }
  })
  it('returns the correct information, buttons work as expected for attach flow', async () => {
    render(props)
    screen.getByText('Attach Mounting Plate')
    screen.getByText(
      'Attach the mounting plate by aligning the pins on the plate to the slots on the gantry carriage. You may need to adjust the position of the right pipette mount to achieve proper alignment.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Attach_Plate_96.webm'
    )
    const proceedBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(proceedBtn)
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'home',
            params: { axes: ['rightZ'] },
          },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
    })
    expect(props.proceed).toHaveBeenCalled()
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
  })

  it('returns the correct information, buttons work as expected for detach flow', async () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
    }
    render(props)
    screen.getByText('Loosen Screws and Detach Mounting Plate')
    screen.getByText(
      'Hold onto the plate so it does not fall. Then remove the pins on the plate from the slots on the gantry carriage.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_Plate_96.webm'
    )
    const proceedBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(proceedBtn)
    expect(props.proceed).toHaveBeenCalled()
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
  })
})
