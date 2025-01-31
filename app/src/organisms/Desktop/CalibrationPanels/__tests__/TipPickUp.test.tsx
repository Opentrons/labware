import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockDeckCalTipRack } from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { TipPickUp } from '../TipPickUp'

import type { ComponentProps } from 'react'

describe('TipPickUp', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()
  const render = (props: Partial<ComponentProps<typeof TipPickUp>> = {}) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockDeckCalTipRack,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.DECK_STEP_PREPARING_PIPETTE,
      sessionType = Sessions.SESSION_TYPE_DECK_CALIBRATION,
    } = props
    return renderWithProviders(
      <TipPickUp
        isMulti={isMulti}
        mount={mount}
        tipRack={tipRack}
        sendCommands={sendCommands}
        cleanUpAndExit={cleanUpAndExit}
        currentStep={currentStep}
        sessionType={sessionType}
      />,
      { i18nInstance: i18n }
    )
  }

  it('jogging sends command', () => {
    render()
    const button = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.JOG,
      data: { vector: [0, -0.1, 0] },
    })
  })

  it('clicking pick up tip sends pick up tip command', () => {
    render()
    const button = screen.getByRole('button', { name: 'Pick up tip' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.PICK_UP_TIP,
    })
  })

  it('renders the need help link', () => {
    render()
    screen.getByRole('link', { name: 'Need help?' })
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
})
