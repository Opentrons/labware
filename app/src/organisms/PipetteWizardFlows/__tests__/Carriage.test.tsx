import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { LEFT, NINETY_SIX_CHANNEL } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { Carriage } from '../Carriage'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Carriage>) => {
  return renderWithProviders(<Carriage {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('Carriage', () => {
  let props: ComponentProps<typeof Carriage>
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

  it('returns the correct information, buttons work as expected when flow is attach', () => {
    render(props)
    screen.getByText('Unscrew z-axis carriage')
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Zaxis_Attach_96.webm'
    )
    screen.getByRole('button', { name: 'Continue' })
    expect(screen.queryByLabelText('back')).not.toBeInTheDocument()
  })

  it('returns the correct information, buttons work as expected when flow is detach', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
    }
    render(props)
    screen.getByText('Reattach z-axis carriage')
    screen.getByText(
      'Push the right pipette mount up to the top of the z-axis. Then tighten the captive screw at the top right of the gantry carriage.'
    )
    screen.getByText(
      'When reattached, the right mount should no longer freely move up and down.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Zaxis_Detach_96.webm'
    )
    screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(screen.getByLabelText('back'))
    expect(props.goBack).toHaveBeenCalled()
  })

  it('clicking on continue button executes the commands correctly', () => {
    render(props)
    const contBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(contBtn)
    expect(props.proceed).toHaveBeenCalled()
  })
})
