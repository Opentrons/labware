import { fireEvent, waitFor, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect, afterEach } from 'vitest'

import {
  LEFT,
  NINETY_SIX_CHANNEL,
  RIGHT,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { InProgressModal } from '/app/molecules/InProgressModal/InProgressModal'
// import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { BeforeBeginning } from '../BeforeBeginning'
import { FLOWS } from '../constants'
import { getIsGantryEmpty } from '../utils'

import type { ComponentProps } from 'react'

//  TODO(jr, 11/3/22): uncomment out the get help link when we have
//  the correct URL to link it to
vi.mock('/app/molecules/InProgressModal/InProgressModal')
vi.mock('../utils')

const render = (props: ComponentProps<typeof BeforeBeginning>) => {
  return renderWithProviders(<BeforeBeginning {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('BeforeBeginning', () => {
  let props: ComponentProps<typeof BeforeBeginning>
  beforeEach(() => {
    props = {
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.CALIBRATE,
      createMaintenanceRun: vi.fn(),
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isCreateLoading: false,
      isRobotMoving: false,
      isOnDevice: false,
      requiredPipette: undefined,
      createdMaintenanceRunId: null,
    }
    // mockNeedHelpLink.mockReturnValue(<div>mock need help link</div>)
    vi.mocked(InProgressModal).mockReturnValue(<div>mock in progress</div>)
    vi.mocked(getIsGantryEmpty).mockReturnValue(false)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  describe('calibrate flow single mount', () => {
    it('returns the correct information for calibrate flow', async () => {
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByText('You will need:')
      // getByText('mock need help link')
      screen.getByAltText('Calibration Probe')
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
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

    it('continue button is disabled when isCreateLoading is true', () => {
      props = {
        ...props,
        isCreateLoading: true,
      }
      render(props)
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      expect(proceedBtn).toBeDisabled()
    })

    it('renders the error modal screen when errorMessage is true', () => {
      props = {
        ...props,
        errorMessage: 'error shmerror',
      }
      render(props)
      screen.getByText('Error encountered')
      screen.getByText('error shmerror')
    })
  })

  describe('attach flow single mount', () => {
    it('renders the modal with all correct text. clicking on proceed button sends commands', async () => {
      props = {
        ...props,
        attachedPipettes: { left: null, right: null },
        flowType: FLOWS.ATTACH,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByAltText('1- or 8-Channel Pipette')
      screen.getByText('You will need:')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })

    it('renders the attach flow when swapping pipettes is needed', async () => {
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.DETACH,
        requiredPipette: {
          mount: LEFT,
          id: 'abc',
          pipetteName: 'p1000_single_flex',
        },
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByAltText('Flex 1-Channel 1000 μL')
      screen.getByText('You will need:')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })
  })

  describe('detach flow single mount', () => {
    it('renders the modal with all correct text. clicking on proceed button sends commands for detach flow', async () => {
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.DETACH,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make detachment easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })
  })

  describe('attach flow 96 channel', () => {
    it('renders the modal with all the correct text, clicking on proceed button sends commands for attach flow with an empty gantry', async () => {
      vi.mocked(getIsGantryEmpty).mockReturnValue(true)
      props = {
        ...props,
        attachedPipettes: { left: null, right: null },
        flowType: FLOWS.ATTACH,
        selectedPipette: NINETY_SIX_CHANNEL,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('96-Channel Pipette')
      screen.getByAltText('96-Channel Mounting Plate')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { maintenancePosition: 'attachPlate', mount: RIGHT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })

    it('renders the 96 channel flow when there is a pipette on the gantry on the right mount', async () => {
      vi.mocked(getIsGantryEmpty).mockReturnValue(false)
      props = {
        ...props,
        mount: RIGHT,
        attachedPipettes: { left: null, right: mockAttachedPipetteInformation },
        flowType: FLOWS.ATTACH,
        selectedPipette: NINETY_SIX_CHANNEL,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('96-Channel Pipette')
      screen.getByAltText('96-Channel Mounting Plate')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: RIGHT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: RIGHT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })

    it('renders the 96 channel flow when there is a pipette on the gantry on the left mount', async () => {
      vi.mocked(getIsGantryEmpty).mockReturnValue(false)
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.ATTACH,
        selectedPipette: NINETY_SIX_CHANNEL,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('96-Channel Pipette')
      screen.getByAltText('96-Channel Mounting Plate')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })

    it('renders the detach and attach 96 channel flow when there is a required 96-channel', async () => {
      vi.mocked(getIsGantryEmpty).mockReturnValue(false)
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.ATTACH,
        selectedPipette: NINETY_SIX_CHANNEL,
        requiredPipette: {
          id: '123',
          pipetteName: 'p1000_96',
          mount: 'left',
        },
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make attachment and calibration easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByText(
        'The calibration probe is included with the robot and should be stored on the front pillar of the robot.'
      )
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      screen.getByAltText('Calibration Probe')
      screen.getByAltText('Flex 96-Channel 1000 μL')
      screen.getByAltText('96-Channel Mounting Plate')
      screen.getByText(
        'Provided with the robot. Using another size can strip the instruments’s screws.'
      )
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })
  })

  describe('detach flow 96 channel', () => {
    it('renders the banner for 96 channel with correct info for on device display', () => {
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.DETACH,
        selectedPipette: NINETY_SIX_CHANNEL,
        isOnDevice: true,
      }
      render(props)
      screen.getByLabelText('icon_warning')
      screen.getByText('Before you begin')
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make detachment easier. Also gather the needed equipment shown to the right.'
      )
    })

    it('renders the modal with all correct text. clicking on proceed button sends commands for detach flow', async () => {
      props = {
        ...props,
        attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
        flowType: FLOWS.DETACH,
        selectedPipette: NINETY_SIX_CHANNEL,
      }
      render(props)
      screen.getByText('Before you begin')
      screen.getByText(
        'The 96-Channel Pipette is heavy (~10kg). Ask a labmate for help, if needed.'
      )
      screen.getByText(
        'To get started, remove labware from the deck and clean up the working area to make detachment easier. Also gather the needed equipment shown to the right.'
      )
      screen.getByAltText('2.5 mm Hex Screwdriver')
      const proceedBtn = screen.getByRole('button', {
        name: 'Move gantry to front',
      })
      fireEvent.click(proceedBtn)
      expect(props.chainRunCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'loadPipette',
            params: {
              mount: LEFT,
              pipetteId: 'abc',
              pipetteName: 'p1000_single_flex',
            },
          },
          { commandType: 'home' as const, params: {} },
          {
            commandType: 'calibration/moveToMaintenancePosition',
            params: { mount: LEFT },
          },
        ],
        false
      )
      await waitFor(() => {
        expect(props.proceed).toHaveBeenCalled()
      })
    })
  })
})
