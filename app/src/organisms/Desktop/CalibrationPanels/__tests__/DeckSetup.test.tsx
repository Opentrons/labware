import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockDeckCalTipRack,
  mockRobotCalibrationCheckSessionDetails,
  mockTipLengthCalBlock,
} from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { DeckSetup } from '../DeckSetup'

import type { ComponentProps } from 'react'
import type { getDeckDefinitions } from '@opentrons/shared-data'

vi.mock('/app/assets/labware/getLabware')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getDeckDefinitions>()
  return {
    ...actual,
    getDeckDefinitions: () => vi.fn(),
  }
})
vi.mock('@opentrons/components/src/hardware-sim/Deck/RobotWorkSpace')

describe('DeckSetup', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()

  const render = (props: Partial<ComponentProps<typeof DeckSetup>> = {}) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockDeckCalTipRack,
      calBlock = null,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.DECK_STEP_LABWARE_LOADED,
      sessionType = Sessions.SESSION_TYPE_DECK_CALIBRATION,
      activePipette,
    } = props
    return renderWithProviders(
      <DeckSetup
        isMulti={isMulti}
        mount={mount}
        tipRack={tipRack}
        calBlock={calBlock}
        sendCommands={sendCommands}
        cleanUpAndExit={cleanUpAndExit}
        currentStep={currentStep}
        sessionType={sessionType}
        activePipette={activePipette}
      />,
      { i18nInstance: i18n }
    )
  }

  it('clicking continue proceeds to next step', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))

    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_TIP_RACK,
    })
  })

  it('copy is correct if cal block present for tlc', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
      calBlock: mockTipLengthCalBlock,
    })

    screen.getByRole('heading', { name: 'Prepare the space' })
    screen.getByText('Place a full 300ul Tiprack FIXTURE into slot 8')
    screen.getByText('Place the Calibration Block into its designated slot')
    expect(screen.queryByText('To check the left pipette:')).toBeNull()
    expect(screen.queryByText('Clear all other deck slots')).toBeNull()
  })

  it('copy is correct if cal block not present for tlc', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
      calBlock: null,
    })

    screen.getByRole('heading', { name: 'Prepare the space' })
    screen.getByText('Place a full 300ul Tiprack FIXTURE into slot 8')
    expect(
      screen.queryByText('Place the Calibration Block into its designated slot')
    ).toBeNull()
    expect(screen.queryByText('To check the left pipette:')).toBeNull()
    expect(screen.queryByText('Clear all other deck slots')).toBeNull()
  })

  it('copy is correct if cal block present for health check', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK,
      calBlock: mockTipLengthCalBlock,
      activePipette: mockRobotCalibrationCheckSessionDetails.activePipette,
    })

    screen.getByRole('heading', { name: 'Prepare the space' })
    screen.getByText('Place a full fake tiprack display name into slot 8')
    screen.getByText('Place the Calibration Block into its designated slot')
    screen.getByText('To check the left pipette:')
    screen.getByText('Clear all other deck slots')
  })

  it('copy is correct if cal block not present for health check', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK,
      calBlock: null,
      activePipette: mockRobotCalibrationCheckSessionDetails.activePipette,
    })

    screen.getByRole('heading', { name: 'Prepare the space' })
    screen.getByText('Place a full fake tiprack display name into slot 8')
    screen.getByText('To check the left pipette:')
    screen.getByText('Clear all other deck slots')
    expect(
      screen.queryByText('Place the Calibration Block into its designated slot')
    ).toBeNull()
  })
})
