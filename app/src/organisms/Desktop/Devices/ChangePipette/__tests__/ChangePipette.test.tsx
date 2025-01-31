import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { getPipetteNameSpecs } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getHasCalibrationBlock } from '/app/redux/config'
import { getMovementStatus } from '/app/redux/robot-controls'
import { getCalibrationForPipette } from '/app/redux/calibration'
import { InProgressModal } from '/app/molecules/InProgressModal/InProgressModal'
import {
  getRequestById,
  SUCCESS,
  useDispatchApiRequests,
} from '/app/redux/robot-api'
import { useAttachedPipettes } from '/app/resources/instruments'
import { PipetteSelection } from '../PipetteSelection'
import { ExitModal } from '../ExitModal'
import { ConfirmPipette } from '../ConfirmPipette'
import { ChangePipette } from '..'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { PipetteNameSpecs } from '@opentrons/shared-data'
import type { AttachedPipette } from '/app/redux/pipettes/types'
import type { DispatchApiRequestType } from '/app/redux/robot-api'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getPipetteNameSpecs>()
  return {
    ...actual,
    getPipetteNameSpecs: vi.fn(),
  }
})
vi.mock('/app/redux/config')
vi.mock('/app/redux/robot-controls')
vi.mock('/app/redux/calibration')
vi.mock('/app/redux/robot-api')
vi.mock('../PipetteSelection')
vi.mock('../ExitModal')
vi.mock('/app/molecules/InProgressModal/InProgressModal')
vi.mock('../ConfirmPipette')
vi.mock('/app/resources/instruments')
vi.mock('/app/assets/images')

const render = (props: ComponentProps<typeof ChangePipette>) => {
  return renderWithProviders(<ChangePipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockP300PipetteNameSpecs = {
  name: 'p300_single_gen2',
  displayName: 'P300 Single GEN2',
  channels: 1,
  displayCategory: 'GEN2',
} as PipetteNameSpecs

const mockAttachedPipettes = {
  id: 'abc',
  name: 'p300_single_gen2',
  model: 'p300_single_v2.0',
  tip_length: 42,
  mount_axis: 'c',
  plunger_axis: 'd',
  modelSpecs: mockP300PipetteNameSpecs,
}

describe('ChangePipette', () => {
  let props: ComponentProps<typeof ChangePipette>
  let dispatchApiRequest: DispatchApiRequestType

  beforeEach(() => {
    props = {
      robotName: 'otie',
      mount: 'left',
      closeModal: vi.fn(),
    }
    dispatchApiRequest = vi.fn()
    vi.mocked(useAttachedPipettes).mockReturnValue({ left: null, right: null })
    vi.mocked(getRequestById).mockReturnValue(null)
    vi.mocked(getCalibrationForPipette).mockReturnValue(null)
    vi.mocked(getHasCalibrationBlock).mockReturnValue(false)
    vi.mocked(getMovementStatus).mockReturnValue(null)
    vi.mocked(getPipetteNameSpecs).mockReturnValue(null)
    vi.mocked(useDispatchApiRequests).mockReturnValue([
      dispatchApiRequest,
      ['id'],
    ])
  })

  it('renders the in progress modal when the movement status is moving', () => {
    vi.mocked(getMovementStatus).mockReturnValue('moving')
    vi.mocked(InProgressModal).mockReturnValue(
      <div>mock in progress modal</div>
    )
    render(props)
    screen.getByText('Attach a pipette')
    screen.getByText('mock in progress modal')
  })

  it('renders the wizard pages for attaching a pipette and clicking on the exit button will render the exit modal', () => {
    vi.mocked(PipetteSelection).mockReturnValue(
      <div>mock pipette selection</div>
    )
    vi.mocked(ExitModal).mockReturnValue(<div>mock exit modal</div>)

    render(props)
    //  Clear deck modal page
    let exit = screen.getByLabelText('Exit')
    screen.getByText('Attach a pipette')
    screen.getByText('Before you begin')
    screen.getByText(
      'Before starting, remove all labware from the deck and all tips from pipettes. The gantry will move to the front of the robot.'
    )
    fireEvent.click(exit)
    expect(props.closeModal).toHaveBeenCalled()

    const cont = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(cont)

    //  Instructions page
    screen.getByText('Attach a pipette')
    screen.getByText('mock pipette selection')
    exit = screen.getByLabelText('Exit')
    fireEvent.click(exit)

    //  Exit modal page
    screen.getByText('mock exit modal')
    screen.getByText('Attach a pipette')
  })

  it('the go back button functions as expected', () => {
    vi.mocked(PipetteSelection).mockReturnValue(
      <div>mock pipette selection</div>
    )

    render(props)
    //  Clear deck modal page
    screen.getByText('Before you begin')
    const cont = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(cont)

    //  Instructions page
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    screen.getByText('Before you begin')
  })

  it('renders the wizard pages for attaching a pipette and goes through flow', () => {
    vi.mocked(PipetteSelection).mockReturnValue(
      <div>mock pipette selection</div>
    )
    render(props)
    //  Clear deck modal page
    const cont = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(cont)

    //  Instructions page
    screen.getByText('Attach a pipette')
  })

  it('renders the wizard pages for detaching a single channel pipette and exits on the 2nd page rendering exit modal', () => {
    vi.mocked(ExitModal).mockReturnValue(<div>mock exit modal</div>)
    vi.mocked(getRequestById).mockReturnValue({
      status: SUCCESS,
      response: {
        method: 'POST',
        ok: true,
        path: '/',
        status: 200,
      },
    })
    vi.mocked(useAttachedPipettes).mockReturnValue({
      left: mockAttachedPipettes as AttachedPipette,
      right: null,
    })
    render(props)

    //  Clear deck modal page
    screen.getByLabelText('Exit')
    screen.getByText('Detach P300 Single GEN2 from Left Mount')
    screen.getByText('Before you begin')
    screen.getByText(
      'Before starting, remove all labware from the deck and all tips from pipettes. The gantry will move to the front of the robot.'
    )
    let cont = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(cont)

    //  Instructions page 1
    screen.getByText('Detach P300 Single GEN2 from Left Mount')
    screen.getByText('Step 1 / 3')
    screen.getByText('Loosen the screws')
    screen.getByText(
      'Using a 2.5 mm screwdriver, loosen the three screws on the back of the pipette that is currently attached.'
    )
    cont = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(cont)

    //  Instructions page 2
    screen.getByText('Detach P300 Single GEN2 from Left Mount')
    screen.getByText('Step 2 / 3')
    screen.getByText('Remove the pipette')
    screen.getByText(
      'Hold onto the pipette so it does not fall. Disconnect the pipette from the robot by pulling the white connector tab.'
    )
    screen.getByLabelText('Confirm')
    const exit = screen.getByLabelText('Exit')
    fireEvent.click(exit)

    //  Exit modal page
    screen.getByText('Detach P300 Single GEN2 from Left Mount')
    screen.getByText('Step 2 / 3')
    screen.getByText('mock exit modal')
  })

  it('renders the wizard pages for detaching a single channel pipette and goes through the whole flow', () => {
    vi.mocked(ConfirmPipette).mockReturnValue(<div>mock confirm pipette</div>)
    vi.mocked(useAttachedPipettes).mockReturnValue({
      left: mockAttachedPipettes as AttachedPipette,
      right: null,
    })
    render(props)

    //  Clear deck modal page
    let cont = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(cont)

    //  Instructions page 1
    cont = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(cont)

    //  Instructions page 2
    screen.getByLabelText('Confirm')
  })
})
