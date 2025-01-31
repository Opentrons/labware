import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { when } from 'vitest-when'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '../../__fixtures__'
import {
  SelectRecoveryOption,
  RecoveryOptions,
  getRecoveryOptions,
  GENERAL_ERROR_OPTIONS,
  OVERPRESSURE_WHILE_ASPIRATING_OPTIONS,
  OVERPRESSURE_PREPARE_TO_ASPIRATE,
  OVERPRESSURE_WHILE_DISPENSING_OPTIONS,
  NO_LIQUID_DETECTED_OPTIONS,
  TIP_NOT_DETECTED_OPTIONS,
  TIP_DROP_FAILED_OPTIONS,
  GRIPPER_ERROR_OPTIONS,
  STALL_OR_COLLISION_OPTIONS,
} from '../SelectRecoveryOption'
import { RECOVERY_MAP, ERROR_KINDS } from '../../constants'
import { clickButtonLabeled } from '../../__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

const renderSelectRecoveryOption = (
  props: ComponentProps<typeof SelectRecoveryOption>
) => {
  return renderWithProviders(
    <SelectRecoveryOption {...{ ...mockRecoveryContentProps, ...props }} />,
    {
      i18nInstance: i18n,
    }
  )[0]
}

const renderRecoveryOptions = (
  props: ComponentProps<typeof RecoveryOptions>
) => {
  return renderWithProviders(<RecoveryOptions {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('SelectRecoveryOption', () => {
  const { RETRY_STEP, RETRY_NEW_TIPS } = RECOVERY_MAP
  let props: ComponentProps<typeof SelectRecoveryOption>
  let mockProceedToRouteAndStep: Mock
  let mockSetSelectedRecoveryOption: Mock
  let mockGetRecoveryOptionCopy: Mock

  beforeEach(() => {
    mockProceedToRouteAndStep = vi.fn()
    mockSetSelectedRecoveryOption = vi.fn(() => Promise.resolve())
    mockGetRecoveryOptionCopy = vi.fn()
    const mockRouteUpdateActions = {
      proceedToRouteAndStep: mockProceedToRouteAndStep,
    } as any

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: mockRouteUpdateActions,
      recoveryMap: {
        route: RETRY_STEP.ROUTE,
        step: RETRY_STEP.STEPS.CONFIRM_RETRY,
      },
      tipStatusUtils: { determineTipStatus: vi.fn() } as any,
      currentRecoveryOptionUtils: {
        setSelectedRecoveryOption: mockSetSelectedRecoveryOption,
      } as any,
      getRecoveryOptionCopy: mockGetRecoveryOptionCopy,
    }

    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_STEP.ROUTE, expect.any(String))
      .thenReturn('Retry step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_STEP.ROUTE, ERROR_KINDS.TIP_DROP_FAILED)
      .thenReturn('Retry dropping tip')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.CANCEL_RUN.ROUTE, expect.any(String))
      .thenReturn('Cancel run')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE, expect.any(String))
      .thenReturn('Retry with new tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE, expect.any(String))
      .thenReturn('Manually fill well and skip to next step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE, expect.any(String))
      .thenReturn('Retry with same tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(
        RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE,
        expect.any(String)
      )
      .thenReturn('Skip to next step with same tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.HOME_AND_RETRY.ROUTE, expect.any(String))
      .thenReturn('Home gantry and retry')
  })

  it('sets the selected recovery option when clicking continue', () => {
    renderSelectRecoveryOption(props)

    clickButtonLabeled('Continue')

    expect(mockSetSelectedRecoveryOption).toHaveBeenCalledWith(RETRY_STEP.ROUTE)
  })

  it('renders appropriate "General Error" copy and click behavior', () => {
    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const retryStepOption = screen.getAllByRole('label', { name: 'Retry step' })
    clickButtonLabeled('Continue')
    expect(
      screen.queryByRole('button', { name: 'Go back' })
    ).not.toBeInTheDocument()

    fireEvent.click(retryStepOption[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(RETRY_STEP.ROUTE)
  })

  it('renders appropriate "Overpressure while aspirating" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING,
    }
    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const retryNewTips = screen.getAllByRole('label', {
      name: 'Retry with new tips',
    })
    expect(
      screen.queryByRole('button', { name: 'Go back' })
    ).not.toBeInTheDocument()

    fireEvent.click(retryNewTips[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(RETRY_NEW_TIPS.ROUTE)
  })

  it('renders appropriate "No liquid detected" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.NO_LIQUID_DETECTED,
    }

    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const fillManuallyAndSkip = screen.getAllByRole('label', {
      name: 'Manually fill well and skip to next step',
    })

    fireEvent.click(fillManuallyAndSkip[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE
    )
  })

  it('renders appropriate "Overpressure prepare to aspirate" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE,
    }

    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const retrySameTips = screen.getAllByRole('label', {
      name: 'Retry with same tips',
    })

    fireEvent.click(retrySameTips[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE
    )
  })

  it('renders appropriate "Overpressure while dispensing" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING,
    }

    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const skipStepWithSameTips = screen.getAllByRole('label', {
      name: 'Skip to next step with same tips',
    })

    fireEvent.click(skipStepWithSameTips[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE
    )
  })

  it('renders appropriate "Tip drop failed" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.TIP_DROP_FAILED,
    }

    renderSelectRecoveryOption(props)

    screen.getByText('Choose a recovery action')

    const retryDroppingTip = screen.getAllByRole('label', {
      name: 'Retry dropping tip',
    })

    fireEvent.click(retryDroppingTip[0])
    clickButtonLabeled('Continue')

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.RETRY_STEP.ROUTE
    )
  })
  it('renders appropriate "Stall or collision" copy and click behavior', () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.STALL_OR_COLLISION,
    }
    renderSelectRecoveryOption(props)
    screen.getByText('Choose a recovery action')
    const homeGantryAndRetry = screen.getAllByRole('label', {
      name: 'Home gantry and retry',
    })
    fireEvent.click(homeGantryAndRetry[0])
    clickButtonLabeled('Continue')
    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.HOME_AND_RETRY.ROUTE
    )
  })
})
describe('RecoveryOptions', () => {
  let props: ComponentProps<typeof RecoveryOptions>
  let mockSetSelectedRoute: Mock
  let mockGetRecoveryOptionCopy: Mock

  beforeEach(() => {
    mockSetSelectedRoute = vi.fn()
    mockGetRecoveryOptionCopy = vi.fn()
    const generalRecoveryOptions = getRecoveryOptions(ERROR_KINDS.GENERAL_ERROR)

    props = {
      errorKind: ERROR_KINDS.GENERAL_ERROR,
      validRecoveryOptions: generalRecoveryOptions,
      setSelectedRoute: mockSetSelectedRoute,
      getRecoveryOptionCopy: mockGetRecoveryOptionCopy,
      isOnDevice: true,
    }

    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_STEP.ROUTE, expect.any(String))
      .thenReturn('Retry step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_STEP.ROUTE, ERROR_KINDS.TIP_DROP_FAILED)
      .thenReturn('Retry dropping tip')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.CANCEL_RUN.ROUTE, expect.any(String))
      .thenReturn('Cancel run')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE, expect.any(String))
      .thenReturn('Retry with new tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE, expect.any(String))
      .thenReturn('Manually fill well and skip to next step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE, expect.any(String))
      .thenReturn('Retry with same tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(
        RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE,
        expect.any(String)
      )
      .thenReturn('Skip to next step with same tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(
        RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE,
        expect.any(String)
      )
      .thenReturn('Skip to next step with new tips')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE, expect.any(String))
      .thenReturn('Ignore error and skip to next step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE, expect.any(String))
      .thenReturn('Manually move labware and skip to next step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(
        RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE,
        expect.any(String)
      )
      .thenReturn('Manually replace labware on deck and retry step')
    when(mockGetRecoveryOptionCopy)
      .calledWith(RECOVERY_MAP.HOME_AND_RETRY.ROUTE, expect.any(String))
      .thenReturn('Home gantry and retry')
  })

  it('renders valid recovery options for a general error errorKind', () => {
    renderRecoveryOptions(props)

    screen.getByRole('label', { name: 'Retry step' })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: OVERPRESSURE_WHILE_ASPIRATING_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', { name: 'Retry with new tips' })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it('updates the selectedRoute when a new option is selected', () => {
    renderRecoveryOptions(props)

    fireEvent.click(screen.getByRole('label', { name: 'Cancel run' }))

    expect(mockSetSelectedRoute).toHaveBeenCalledWith(
      RECOVERY_MAP.CANCEL_RUN.ROUTE
    )
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.NO_LIQUID_DETECTED} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: NO_LIQUID_DETECTED_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', {
      name: 'Manually fill well and skip to next step',
    })
    screen.getByRole('label', { name: 'Ignore error and skip to next step' })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: OVERPRESSURE_PREPARE_TO_ASPIRATE,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', { name: 'Retry with new tips' })
    screen.getByRole('label', { name: 'Retry with same tips' })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: OVERPRESSURE_WHILE_DISPENSING_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', { name: 'Skip to next step with same tips' })
    screen.getByRole('label', { name: 'Skip to next step with new tips' })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.TIP_NOT_DETECTED} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: TIP_NOT_DETECTED_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', {
      name: 'Retry step',
    })
    screen.getByRole('label', {
      name: 'Ignore error and skip to next step',
    })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.TIP_DROP_FAILED} errorKind`, () => {
    props = {
      ...props,
      errorKind: ERROR_KINDS.TIP_DROP_FAILED,
      validRecoveryOptions: TIP_DROP_FAILED_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', {
      name: 'Retry dropping tip',
    })
    screen.getByRole('label', {
      name: 'Ignore error and skip to next step',
    })
    screen.getByRole('label', { name: 'Cancel run' })
  })

  it(`renders valid recovery options for a ${ERROR_KINDS.GRIPPER_ERROR} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: GRIPPER_ERROR_OPTIONS,
    }

    renderRecoveryOptions(props)

    screen.getByRole('label', {
      name: 'Manually move labware and skip to next step',
    })
    screen.getByRole('label', {
      name: 'Manually replace labware on deck and retry step',
    })
    screen.getByRole('label', { name: 'Cancel run' })
  })
  it(`renders valid recovery options for a ${ERROR_KINDS.STALL_OR_COLLISION} errorKind`, () => {
    props = {
      ...props,
      validRecoveryOptions: STALL_OR_COLLISION_OPTIONS,
    }
    renderRecoveryOptions(props)
    screen.getByRole('label', {
      name: 'Home gantry and retry',
    })
    screen.getByRole('label', { name: 'Cancel run' })
  })
})

describe('getRecoveryOptions', () => {
  it(`returns valid options when the errorKind is ${ERROR_KINDS.GENERAL_ERROR}`, () => {
    const generalErrorOptions = getRecoveryOptions(ERROR_KINDS.GENERAL_ERROR)
    expect(generalErrorOptions).toBe(GENERAL_ERROR_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING}`, () => {
    const generalErrorOptions = getRecoveryOptions(
      ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING
    )
    expect(generalErrorOptions).toBe(OVERPRESSURE_WHILE_ASPIRATING_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.NO_LIQUID_DETECTED}`, () => {
    const noLiquidDetectedOptions = getRecoveryOptions(
      ERROR_KINDS.NO_LIQUID_DETECTED
    )
    expect(noLiquidDetectedOptions).toBe(NO_LIQUID_DETECTED_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE}`, () => {
    const overpressurePrepareToAspirateOptions = getRecoveryOptions(
      ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE
    )
    expect(overpressurePrepareToAspirateOptions).toBe(
      OVERPRESSURE_PREPARE_TO_ASPIRATE
    )
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING}`, () => {
    const overpressureWhileDispensingOptions = getRecoveryOptions(
      ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING
    )
    expect(overpressureWhileDispensingOptions).toBe(
      OVERPRESSURE_WHILE_DISPENSING_OPTIONS
    )
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.TIP_NOT_DETECTED}`, () => {
    const overpressureWhileDispensingOptions = getRecoveryOptions(
      ERROR_KINDS.TIP_NOT_DETECTED
    )
    expect(overpressureWhileDispensingOptions).toBe(TIP_NOT_DETECTED_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.TIP_DROP_FAILED}`, () => {
    const overpressureWhileDispensingOptions = getRecoveryOptions(
      ERROR_KINDS.TIP_DROP_FAILED
    )
    expect(overpressureWhileDispensingOptions).toBe(TIP_DROP_FAILED_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.GRIPPER_ERROR}`, () => {
    const overpressureWhileDispensingOptions = getRecoveryOptions(
      ERROR_KINDS.GRIPPER_ERROR
    )
    expect(overpressureWhileDispensingOptions).toBe(GRIPPER_ERROR_OPTIONS)
  })

  it(`returns valid options when the errorKind is ${ERROR_KINDS.STALL_OR_COLLISION}`, () => {
    const stallOrCollisionOptions = getRecoveryOptions(
      ERROR_KINDS.STALL_OR_COLLISION
    )
    expect(stallOrCollisionOptions).toBe(STALL_OR_COLLISION_OPTIONS)
  })
})
