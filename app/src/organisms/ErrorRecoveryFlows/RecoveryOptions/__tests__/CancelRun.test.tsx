import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '../../__fixtures__'
import { CancelRun } from '../CancelRun'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'
import { clickButtonLabeled } from '../../__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('../SelectRecoveryOption')

const render = (props: ComponentProps<typeof CancelRun>) => {
  return renderWithProviders(<CancelRun {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RecoveryFooterButtons', () => {
  const { CANCEL_RUN, ROBOT_CANCELING, DROP_TIP_FLOWS } = RECOVERY_MAP
  let props: ComponentProps<typeof CancelRun>
  let mockGoBackPrevStep: Mock
  let mockhandleMotionRouting: Mock
  let mockProceedToRouteAndStep: Mock

  beforeEach(() => {
    mockGoBackPrevStep = vi.fn()
    mockhandleMotionRouting = vi.fn(() => Promise.resolve())
    mockProceedToRouteAndStep = vi.fn()
    const mockRouteUpdateActions = {
      goBackPrevStep: mockGoBackPrevStep,
      handleMotionRouting: mockhandleMotionRouting,
      proceedToRouteAndStep: mockProceedToRouteAndStep,
    } as any

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: mockRouteUpdateActions,
      recoveryMap: {
        route: CANCEL_RUN.ROUTE,
        step: CANCEL_RUN.STEPS.CONFIRM_CANCEL,
      },
      tipStatusUtils: {
        isLoadingTipStatus: false,
        areTipsAttached: false,
      } as any,
      recoveryCommands: { cancelRun: vi.fn() } as any,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK SELECT RECOVERY OPTION</div>
    )
  })

  it('renders SelectRecoveryOption when the route is unknown', () => {
    props = {
      ...props,
      recoveryMap: { ...props.recoveryMap, step: 'UNKNOWN' as any },
    }
    render(props)

    screen.getByText('MOCK SELECT RECOVERY OPTION')
  })

  it('renders appropriate copy and click behavior', async () => {
    render(props)

    screen.getByText('Are you sure you want to cancel?')
    screen.queryByText(
      'If tips are attached, you can choose to blowout any aspirated liquid and drop tips before the run is terminated.'
    )

    clickButtonLabeled('Go back')

    expect(mockGoBackPrevStep).toHaveBeenCalled()
  })

  it('should call commands in the correct order for the primaryOnClick callback', async () => {
    const handleMotionRoutingMock = vi.fn(() => Promise.resolve())
    const cancelRunMock = vi.fn(() => Promise.resolve())

    const mockRecoveryCommands = {
      cancelRun: cancelRunMock,
    } as any

    const mockRouteUpdateActions = {
      handleMotionRouting: handleMotionRoutingMock,
    } as any

    render({
      ...props,
      recoveryCommands: mockRecoveryCommands,
      routeUpdateActions: mockRouteUpdateActions,
    })

    clickButtonLabeled('Confirm')

    await waitFor(() => {
      expect(handleMotionRoutingMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(handleMotionRoutingMock).toHaveBeenCalledWith(
        true,
        ROBOT_CANCELING.ROUTE
      )
    })
    await waitFor(() => {
      expect(cancelRunMock).toHaveBeenCalledTimes(1)
    })

    expect(handleMotionRoutingMock.mock.invocationCallOrder[0]).toBeLessThan(
      cancelRunMock.mock.invocationCallOrder[0]
    )
  })

  it('should route the user to ManageTips if tips are attached, tip status is not loading, and the user clicks the appropriate button', () => {
    props = {
      ...props,
      tipStatusUtils: {
        isLoadingTipStatus: false,
        areTipsAttached: true,
      } as any,
    }

    render(props)

    clickButtonLabeled('Confirm')
    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(DROP_TIP_FLOWS.ROUTE)
  })

  it('should not yet route the user if the user clicks the appropriate button, but tip detection is still loading', () => {
    props = {
      ...props,
      tipStatusUtils: {
        isLoadingTipStatus: true,
        areTipsAttached: false,
      } as any,
    }

    render(props)

    clickButtonLabeled('Confirm')
    expect(mockProceedToRouteAndStep).not.toHaveBeenCalled()
    expect(mockhandleMotionRouting).not.toHaveBeenCalled()
  })

  it('should will cancel the run if no tips are detected', () => {
    props = {
      ...props,
      tipStatusUtils: {
        isLoadingTipStatus: false,
        areTipsAttached: false,
      } as any,
    }

    render(props)

    clickButtonLabeled('Confirm')
    expect(mockProceedToRouteAndStep).not.toHaveBeenCalled()
    expect(mockhandleMotionRouting).toHaveBeenCalled()
  })
})
