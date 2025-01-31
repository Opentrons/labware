import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { LEFT, SINGLE_MOUNT_PIPETTES } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { InProgressModal } from '/app/molecules/InProgressModal/InProgressModal'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { DetachProbe } from '../DetachProbe'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/InProgressModal/InProgressModal')

const render = (props: ComponentProps<typeof DetachProbe>) => {
  return renderWithProviders(<DetachProbe {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('DetachProbe', () => {
  let props: ComponentProps<typeof DetachProbe>
  beforeEach(() => {
    props = {
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn(),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.CALIBRATE,
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isRobotMoving: false,
      isOnDevice: false,
    }
    vi.mocked(InProgressModal).mockReturnValue(<div>mock in progress</div>)
  })
  it('returns the correct information, buttons work as expected', () => {
    render(props)
    screen.getByText('Remove calibration probe')
    screen.getByText(
      'Unlock the calibration probe, remove it from the nozzle, and return it to its storage location.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_1.webm'
    )
    const proceedBtn = screen.getByRole('button', {
      name: 'Complete calibration',
    })
    fireEvent.click(proceedBtn)
    expect(props.proceed).toHaveBeenCalled()
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
  })
  it('returns the correct information for in progress modal when robot is moving', () => {
    props = {
      ...props,
      isRobotMoving: true,
    }
    render(props)
    screen.getByText('mock in progress')
  })
  it('returns the correct information when there is an error message', () => {
    props = {
      ...props,
      errorMessage: 'error shmerror',
    }
    render(props)
    screen.getByText('Remove calibration probe')
    screen.getByText(
      'Unlock the calibration probe, remove it from the nozzle, and return it to its storage location.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_1.webm'
    )
    const proceedBtn = screen.getByRole('button', { name: 'Exit calibration' })
    fireEvent.click(proceedBtn)
    expect(props.proceed).toHaveBeenCalled()
    expect(screen.queryByLabelText('back')).not.toBeInTheDocument()
  })
})
