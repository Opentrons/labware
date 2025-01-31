import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  LEFT,
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { CheckPipetteButton } from '../CheckPipetteButton'
import { MountPipette } from '../MountPipette'

import type { ComponentProps } from 'react'

vi.mock('../CheckPipetteButton')

const render = (props: ComponentProps<typeof MountPipette>) => {
  return renderWithProviders(<MountPipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('MountPipette', () => {
  let props: ComponentProps<typeof MountPipette>
  beforeEach(() => {
    props = {
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn(),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.ATTACH,
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isRobotMoving: false,
      isFetching: false,
      setFetching: vi.fn(),
      isOnDevice: false,
    }
    vi.mocked(CheckPipetteButton).mockReturnValue(
      <div>mock check pipette button</div>
    )
  })
  it('returns the correct information, buttons work as expected for single mount pipettes', () => {
    render(props)
    screen.getByText('Connect and secure pipette')
    screen.getByText(
      'Attach the pipette to the robot by aligning the connector and pressing to ensure a secure connection. Hold the pipette in place and use the hex screwdriver to tighten the pipette screws. Then test that the pipette is securely attached by gently pulling it side to side.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Attach_1_8_L.webm'
    )
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
    screen.getByText('mock check pipette button')
  })

  it('returns the correct information, buttons work as expected for 96 channel pipettes', () => {
    props = {
      ...props,
      selectedPipette: NINETY_SIX_CHANNEL,
    }
    render(props)
    screen.getByText('Connect and attach 96-channel pipette')
    screen.getByText(
      'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
    )
    screen.getByText(
      'Hold onto the pipette so it does not fall. Connect the pipette by aligning the two protruding rods on the mounting plate. Ensure a secure attachment by screwing in the four front screws with the provided screwdriver.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Attach_96.webm'
    )
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
    screen.getByText('mock check pipette button')
  })
  it('returns skeletons and disabled buttons when isFetching is true', () => {
    props = {
      ...props,
      isFetching: true,
    }
    render(props)
    screen.getAllByTestId('Skeleton')
    const backBtn = screen.getByLabelText('back')
    expect(backBtn).toBeDisabled()
  })
})
