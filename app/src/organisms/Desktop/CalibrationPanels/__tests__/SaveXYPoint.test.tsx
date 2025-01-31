import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { mockDeckCalTipRack } from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { SaveXYPoint } from '../SaveXYPoint'

import type { ComponentProps } from 'react'

describe('SaveXYPoint', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()
  const render = (props: Partial<ComponentProps<typeof SaveXYPoint>> = {}) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockDeckCalTipRack,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.DECK_STEP_SAVING_POINT_ONE,
      sessionType = Sessions.SESSION_TYPE_DECK_CALIBRATION,
    } = props
    return renderWithProviders(
      <SaveXYPoint
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

  it('displays proper assets for slot 1 left multi', () => {
    render({
      mount: 'left',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_ONE,
    })
    screen.getByLabelText('left multi channel pipette moving to slot 1')
  })
  it('displays proper asset for slot 1 right multi', () => {
    render({
      mount: 'right',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_ONE,
    })
    screen.getByLabelText('right multi channel pipette moving to slot 1')
  })
  it('displays proper asset for slot 1 left single', () => {
    render({
      mount: 'left',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_ONE,
    })
    screen.getByLabelText('left single channel pipette moving to slot 1')
  })
  it('displays proper asset for slot 1 right single', () => {
    render({
      mount: 'right',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_ONE,
    })
    screen.getByLabelText('right single channel pipette moving to slot 1')
  })

  it('displays proper asset for slot 3 left multi', () => {
    render({
      mount: 'left',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_TWO,
    })
    screen.getByLabelText('left multi channel pipette moving to slot 3')
  })
  it('displays proper asset for slot 3 right multi', () => {
    render({
      mount: 'right',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_TWO,
    })
    screen.getByLabelText('right multi channel pipette moving to slot 3')
  })
  it('displays proper asset for slot 3 left single', () => {
    render({
      mount: 'left',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_TWO,
    })
    screen.getByLabelText('left single channel pipette moving to slot 3')
  })
  it('displays proper asset for slot 3 right single', () => {
    render({
      mount: 'right',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_TWO,
    })
    screen.getByLabelText('right single channel pipette moving to slot 3')
  })

  it('displays proper asset for slot 7 left multi', () => {
    render({
      mount: 'left',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_THREE,
    })
    screen.getByLabelText('left multi channel pipette moving to slot 7')
  })
  it('displays proper asset for slot 7 right multi', () => {
    render({
      mount: 'right',
      isMulti: true,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_THREE,
    })
    screen.getByLabelText('right multi channel pipette moving to slot 7')
  })
  it('displays proper asset for slot 7 left single', () => {
    render({
      mount: 'left',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_THREE,
    })
    screen.getByLabelText('left single channel pipette moving to slot 7')
  })
  it('displays proper asset for slot 7 right single', () => {
    render({
      mount: 'right',
      isMulti: false,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_THREE,
    })
    screen.getByLabelText('right single channel pipette moving to slot 7')
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

  it('proceeding in deck cal session sends save offset and move to point two commands when current step is savingPointOne', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
      currentStep: Sessions.DECK_STEP_SAVING_POINT_ONE,
    })
    const button = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith(
      {
        command: Sessions.sharedCalCommands.SAVE_OFFSET,
      },
      {
        command: Sessions.deckCalCommands.MOVE_TO_POINT_TWO,
      }
    )
  })
})
