import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import {
  mockDeckCalTipRack,
  mockTipLengthCalBlock,
} from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { SaveZPoint } from '../SaveZPoint'

import type { ComponentProps } from 'react'

describe('SaveZPoint', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()

  const render = (props: Partial<ComponentProps<typeof SaveZPoint>> = {}) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockDeckCalTipRack,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.DECK_STEP_JOGGING_TO_DECK,
      sessionType = Sessions.SESSION_TYPE_DECK_CALIBRATION,
      calBlock,
    } = props
    return renderWithProviders(
      <SaveZPoint
        isMulti={isMulti}
        mount={mount}
        tipRack={tipRack}
        sendCommands={sendCommands}
        cleanUpAndExit={cleanUpAndExit}
        currentStep={currentStep}
        sessionType={sessionType}
        calBlock={calBlock}
      />,
      { i18nInstance: i18n }
    )
  }

  it('displays proper asset for left multi', () => {
    render({ mount: 'left', isMulti: true })
    screen.getByLabelText('left multi channel pipette moving to slot 5')
  })
  it('displays proper asset for right multi', () => {
    render({ mount: 'right', isMulti: true })
    screen.getByLabelText('right multi channel pipette moving to slot 5')
  })
  it('displays proper asset for left single', () => {
    render({ mount: 'left', isMulti: false })
    screen.getByLabelText('left single channel pipette moving to slot 5')
  })
  it('displays proper asset for right single', () => {
    render({ mount: 'right', isMulti: false })
    screen.getByLabelText('right single channel pipette moving to slot 5')
  })

  it('jogging sends command', () => {
    render()
    const button = screen.getByRole('button', { name: 'up' })
    fireEvent.click(button)

    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.JOG,
      data: { vector: [0, 0, 0.1] },
    })
  })

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

  it('clicking proceed sends save offset and move to point one commands for deck cal', () => {
    render({ sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith(
      {
        command: Sessions.sharedCalCommands.SAVE_OFFSET,
      },
      {
        command: Sessions.sharedCalCommands.MOVE_TO_POINT_ONE,
      }
    )
  })

  it('clicking proceed sends save offset and move to point one commands for pipette offset cal', () => {
    render({ sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith(
      {
        command: Sessions.sharedCalCommands.SAVE_OFFSET,
      },
      {
        command: Sessions.sharedCalCommands.MOVE_TO_POINT_ONE,
      }
    )
  })

  it('clicking proceed sends compare point and move to point one commands for health check', () => {
    render({ sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith(
      {
        command: Sessions.checkCommands.COMPARE_POINT,
      },
      {
        command: Sessions.sharedCalCommands.MOVE_TO_POINT_ONE,
      }
    )
  })

  it('pip offset cal session type shows correct text', () => {
    render({ sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION })

    screen.getByRole('heading', { name: 'Calibrate z-axis in slot 5' })
    screen.getByText(
      'Jog the pipette until the tip is barely touching (less than 0.1 mm) the deck in slot 5.'
    )
    screen.getByText(
      'If the pipette is over the embossed 5, on the ridge of the slot, or hard to see, switch to the x- and y-axis controls to move the pipette across the deck.'
    )
  })

  it('deck cal session type shows correct text', () => {
    render({ sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION })

    screen.getByRole('heading', { name: 'Calibrate z-axis in slot 5' })
    screen.getByText(
      'Jog the pipette until the tip is barely touching (less than 0.1 mm) the deck in slot 5.'
    )
    screen.getByText(
      'If the pipette is over the embossed 5, on the ridge of the slot, or hard to see, switch to the x- and y-axis controls to move the pipette across the deck.'
    )
  })

  it('health check session type shows correct text with block', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK,
      calBlock: mockTipLengthCalBlock,
    })
    screen.getByRole('heading', { name: 'Check z-axis on slot 5' })
    screen.getByText(
      'Jog the pipette until the tip is barely touching (less than 0.1 mm) the deck in slot 5.'
    )
  })

  it('health check session type shows correct text without block', () => {
    render({ sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK })
    screen.getByRole('heading', { name: 'Check z-axis on slot 5' })
    screen.getByText(
      'Jog the pipette until the tip is barely touching (less than 0.1 mm) the deck in slot 5.'
    )
  })
})
