import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { ExitConfirmation } from '../ExitConfirmation'
import { GRIPPER_FLOW_TYPES } from '../constants'

import type { ComponentProps } from 'react'

describe('ExitConfirmation', () => {
  const mockBack = vi.fn()
  const mockExit = vi.fn()

  const render = (
    props: Partial<ComponentProps<typeof ExitConfirmation>> = {}
  ) => {
    return renderWithProviders(
      <ExitConfirmation
        handleExit={mockExit}
        handleGoBack={mockBack}
        flowType={GRIPPER_FLOW_TYPES.ATTACH}
        isRobotMoving={false}
        {...props}
      />,
      { i18nInstance: i18n }
    )
  }

  it('clicking confirm exit calls exit', () => {
    render()
    const button = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(button)
    expect(mockExit).toHaveBeenCalled()
  })

  it('clicking back calls back', () => {
    render()
    const button = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(button)
    expect(mockBack).toHaveBeenCalled()
  })

  it('renders correct text for attach flow', () => {
    render({ flowType: GRIPPER_FLOW_TYPES.ATTACH })
    screen.getByText('Attach Gripper progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Attach Gripper?'
    )
  })

  it('renders correct text for detach flow', () => {
    render({ flowType: GRIPPER_FLOW_TYPES.DETACH })
    screen.getByText('Detach Gripper progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Detach Gripper?'
    )
  })

  it('renders correct text for recalibrate flow', () => {
    render({ flowType: GRIPPER_FLOW_TYPES.RECALIBRATE })
    screen.getByText('Gripper Recalibration progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Gripper Recalibration?'
    )
  })
})
