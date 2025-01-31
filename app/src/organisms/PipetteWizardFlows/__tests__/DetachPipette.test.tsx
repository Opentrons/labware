import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import {
  LEFT,
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mock96ChannelAttachedPipetteInformation,
  mockAttachedPipetteInformation,
} from '/app/redux/pipettes/__fixtures__'
import { InProgressModal } from '/app/molecules/InProgressModal/InProgressModal'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { FLOWS } from '../constants'
import { DetachPipette } from '../DetachPipette'

import type { ComponentProps } from 'react'

vi.mock('../CheckPipetteButton')
vi.mock('/app/molecules/InProgressModal/InProgressModal')

const render = (props: ComponentProps<typeof DetachPipette>) => {
  return renderWithProviders(<DetachPipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('DetachPipette', () => {
  let props: ComponentProps<typeof DetachPipette>
  beforeEach(() => {
    props = {
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn(),
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      flowType: FLOWS.DETACH,
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      isRobotMoving: false,
      isFetching: false,
      setFetching: vi.fn(),
      isOnDevice: false,
    }
    vi.mocked(InProgressModal).mockReturnValue(<div>mock in progress</div>)
  })
  it('returns the correct information, buttons work as expected for single mount pipettes', () => {
    render(props)
    screen.getByText('Loosen screws and detach Flex 1-Channel 1000 μL')
    screen.getByText(
      'Hold the pipette in place and loosen the pipette screws. (The screws are captive and will not come apart from the pipette.) Then carefully remove the pipette.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_1_L.webm'
    )
    screen.getByText('Continue')
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
  it('returns the correct information, buttons work as expected for 96 channel pipettes', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
      selectedPipette: NINETY_SIX_CHANNEL,
      attachedPipettes: {
        left: mock96ChannelAttachedPipetteInformation,
        right: null,
      },
    }
    render(props)
    screen.getByText('Loosen screws and detach Flex 96-Channel 1000 μL')
    screen.getByText(
      'Hold the pipette in place and loosen the pipette screws. (The screws are captive and will not come apart from the pipette.) Then carefully remove the pipette.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_96.webm'
    )
    screen.getByText('Continue')
    const backBtn = screen.getByLabelText('back')
    fireEvent.click(backBtn)
    expect(props.goBack).toHaveBeenCalled()
  })
  it('returns skeletons and disabled buttons when isFetching is true', () => {
    props = {
      ...props,
      selectedPipette: NINETY_SIX_CHANNEL,
      isFetching: true,
    }
    render(props)
    screen.getAllByTestId('Skeleton')
    const backBtn = screen.getByLabelText('back')
    expect(backBtn).toBeDisabled()
  })
  it('returns the correct information, buttons work as expected for 96 channel pipette flow when single mount is attached', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
      selectedPipette: NINETY_SIX_CHANNEL,
    }
    render(props)
    screen.getByText('Loosen screws and detach Flex 1-Channel 1000 μL')
    screen.getByText(
      'Hold the pipette in place and loosen the pipette screws. (The screws are captive and will not come apart from the pipette.) Then carefully remove the pipette.'
    )
    screen.getByTestId(
      '/app/src/assets/videos/pipette-wizard-flows/Pipette_Detach_1_L.webm'
    )
    screen.getByText('Continue')
    fireEvent.click(screen.getByLabelText('back'))
    expect(props.goBack).toHaveBeenCalled()
  })
})
