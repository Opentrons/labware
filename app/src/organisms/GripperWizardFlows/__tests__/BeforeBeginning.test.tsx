import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { InProgressModal } from '/app/molecules/InProgressModal/InProgressModal'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { BeforeBeginning } from '../BeforeBeginning'
import { GRIPPER_FLOW_TYPES } from '../constants'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/InProgressModal/InProgressModal')

const render = (props: ComponentProps<typeof BeforeBeginning>) => {
  return renderWithProviders(<BeforeBeginning {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('BeforeBeginning', () => {
  let props: ComponentProps<typeof BeforeBeginning>
  beforeEach(() => {
    props = {
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      maintenanceRunId: RUN_ID_1,
      attachedGripper: {},
      flowType: GRIPPER_FLOW_TYPES.ATTACH,
      createMaintenanceRun: vi.fn(),
      isCreateLoading: false,
      isRobotMoving: false,
      setErrorMessage: vi.fn(),
      errorMessage: null,
      createdMaintenanceRunId: null,
    }
    vi.mocked(InProgressModal).mockReturnValue(<div>mock in progress</div>)
  })
  it('returns the correct information for attach flow', async () => {
    render(props)
    screen.getByText('Before you begin')
    screen.getByText(
      'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
    )
    screen.getByText(
      'The calibration pin is included with the gripper and should be stored on its right side above the jaws.'
    )
    screen.getByText('You will need:')
    screen.getByText('Calibration Pin')
    screen.getByText('2.5 mm Hex Screwdriver')
    screen.getByText(
      'Provided with robot. Using another size can strip the instrument’s screws.'
    )
    screen.getByText('Flex Gripper')

    fireEvent.click(
      screen.getByRole('button', { name: 'Move gantry to front' })
    )
    expect(props.chainRunCommands).toHaveBeenCalledWith(
      [
        {
          commandType: 'home',
          params: {},
        },
        {
          commandType: 'calibration/moveToMaintenancePosition',
          params: { mount: 'extension' },
        },
      ],
      false
    )
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })
  })
  it('returns the correct information for detach flow', async () => {
    props = { ...props, flowType: GRIPPER_FLOW_TYPES.DETACH }
    render(props)
    screen.getByText('Before you begin')
    screen.getByText(
      'To get started, remove labware from the deck and clean up the working area to make detachment easier. Also gather the needed equipment shown to the right.'
    )
    screen.getByText('You will need:')
    screen.getByText('2.5 mm Hex Screwdriver')
    screen.getByText(
      'Provided with robot. Using another size can strip the instrument’s screws.'
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Move gantry to front' })
    )
    expect(props.chainRunCommands).toHaveBeenCalledWith(
      [
        { commandType: 'home', params: {} },
        {
          commandType: 'calibration/moveToMaintenancePosition',
          params: { mount: 'extension' },
        },
      ],
      false
    )
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })
  })
  it('returns the correct information for recalibrate flow', async () => {
    props = { ...props, flowType: GRIPPER_FLOW_TYPES.RECALIBRATE }
    render(props)
    screen.getByText('Before you begin')
    screen.getByText(
      'To get started, remove labware from the deck and clean up the working area to make calibration easier. Also gather the needed equipment shown to the right.'
    )
    screen.getByText(
      'The calibration pin is included with the gripper and should be stored on its right side above the jaws.'
    )
    screen.getByText('You will need:')
    screen.getByText('Calibration Pin')
    screen.getByText('Flex Gripper')

    fireEvent.click(
      screen.getByRole('button', { name: 'Move gantry to front' })
    )
    expect(props.chainRunCommands).toHaveBeenCalledWith(
      [
        {
          commandType: 'home',
          params: {},
        },
        {
          commandType: 'calibration/moveToMaintenancePosition',
          params: { mount: 'extension' },
        },
      ],
      false
    )
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })
  })
  it('returns the correct information for in progress modal when robot is moving', () => {
    props = {
      ...props,
      isRobotMoving: true,
    }
    render(props)
    screen.getByText('mock in progress')
  })
})
