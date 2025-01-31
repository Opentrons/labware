import { expect, describe, it, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import capitalize from 'lodash/capitalize'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '/app/organisms/ErrorRecoveryFlows/__fixtures__'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'
import {
  GripperIsHoldingLabware,
  HOLDING_LABWARE_OPTIONS,
} from '../GripperIsHoldingLabware'
import { RECOVERY_MAP } from '/app/organisms/ErrorRecoveryFlows/constants'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

const render = (props: ComponentProps<typeof GripperIsHoldingLabware>) => {
  return renderWithProviders(<GripperIsHoldingLabware {...props} />, {
    i18nInstance: i18n,
  })[0]
}

let mockProceedToRouteAndStep: Mock
let mockProceedNextStep: Mock
let mockHandleMotionRouting: Mock
let mockHomeExceptPlungers: Mock

describe('GripperIsHoldingLabware', () => {
  let props: ComponentProps<typeof GripperIsHoldingLabware>
  beforeEach(() => {
    mockProceedToRouteAndStep = vi.fn(() => Promise.resolve())
    mockProceedNextStep = vi.fn(() => Promise.resolve())
    mockHandleMotionRouting = vi.fn(() => Promise.resolve())
    mockHomeExceptPlungers = vi.fn(() => Promise.resolve())

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        proceedToRouteAndStep: mockProceedToRouteAndStep,
        proceedNextStep: mockProceedNextStep,
        handleMotionRouting: mockHandleMotionRouting,
      } as any,
      recoveryCommands: { homeExceptPlungers: mockHomeExceptPlungers } as any,
    }
  })

  it('renders appropriate title copy', () => {
    render(props)

    screen.getByText('First, is the gripper holding labware?')
  })

  HOLDING_LABWARE_OPTIONS.forEach(option => {
    it(`renders appropriate copy for the ${option} option`, () => {
      render(props)

      expect(screen.getAllByText(capitalize(option))[0])
    })
  })
  ;[true, false].forEach(isOnDevice => {
    it(`renders options when isOnDevice is ${isOnDevice}`, () => {
      render(props)

      expect(screen.getAllByText(capitalize(HOLDING_LABWARE_OPTIONS[0]))[0])
    })
  })

  it('proceeds to next step when the yes option is clicked', async () => {
    render(props)

    fireEvent.click(screen.getAllByLabelText('Yes')[0])
    clickButtonLabeled('Continue')

    await waitFor(() => {
      expect(mockProceedNextStep).toHaveBeenCalled()
    })
  })

  it(`proceeds to the correct step when the no option is clicked for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE}`, async () => {
    render({
      ...props,
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
      } as any,
    })

    fireEvent.click(screen.getAllByLabelText('No')[0])
    clickButtonLabeled('Continue')

    await waitFor(() => {
      expect(mockHandleMotionRouting).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(mockHomeExceptPlungers).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockHandleMotionRouting).toHaveBeenCalledWith(false)
    })

    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
        RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE
      )
    })
  })

  it(`proceeds to the correct step when the no option is clicked for ${RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE}`, async () => {
    render({
      ...props,
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
      } as any,
    })

    fireEvent.click(screen.getAllByLabelText('No')[0])
    clickButtonLabeled('Continue')

    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
        RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE
      )
    })
  })

  it('proceeds to the a fallback route when an unhandled route is called', async () => {
    render({
      ...props,
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE,
      } as any,
    })

    fireEvent.click(screen.getAllByLabelText('No')[0])
    clickButtonLabeled('Continue')

    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        RECOVERY_MAP.OPTION_SELECTION.ROUTE
      )
    })
  })
})
