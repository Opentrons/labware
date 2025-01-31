import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockTipLengthCalBlock,
  mockTipLengthTipRack,
} from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { MeasureNozzle } from '../MeasureNozzle'

import type { ComponentProps } from 'react'

describe('MeasureNozzle', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()
  const render = (
    props: Partial<ComponentProps<typeof MeasureNozzle>> = {}
  ) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockTipLengthTipRack,
      calBlock = mockTipLengthCalBlock,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.TIP_LENGTH_STEP_MEASURING_NOZZLE_OFFSET,
      sessionType = Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
    } = props
    return renderWithProviders(
      <MeasureNozzle
        isMulti={isMulti}
        mount={mount}
        tipRack={tipRack}
        calBlock={calBlock}
        sendCommands={sendCommands}
        cleanUpAndExit={cleanUpAndExit}
        currentStep={currentStep}
        sessionType={sessionType}
      />,
      { i18nInstance: i18n }
    )
  }

  it('renders the confirm crash modal when invoked', () => {
    render()
    expect(
      screen.queryByText('Starting over will cancel your calibration progress.')
    ).toBeNull()
    const crashLink = screen.getByText('Start over')
    fireEvent.click(crashLink)
    screen.getByText('Starting over will cancel your calibration progress.')
  })

  it('renders the need help link', () => {
    render()
    screen.getByRole('link', { name: 'Need help?' })
  })

  it('jogging sends command', () => {
    render()
    const button = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(button)

    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.JOG,
      data: { vector: [0, -0.1, 0] },
    })
  })

  it('clicking proceed sends save offset and move to tip rack commands for tip length cal', () => {
    render({ sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith(
      {
        command: Sessions.sharedCalCommands.SAVE_OFFSET,
      },
      {
        command: Sessions.sharedCalCommands.MOVE_TO_TIP_RACK,
      }
    )
  })

  it('clicking proceed sends only move to tip rack commands for cal health check', () => {
    render({ sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_TIP_RACK,
    })
  })
})
