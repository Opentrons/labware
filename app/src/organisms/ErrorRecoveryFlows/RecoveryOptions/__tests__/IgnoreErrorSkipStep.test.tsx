import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  IgnoreErrorSkipStep,
  IgnoreErrorStepHome,
  IgnoreOptions,
} from '../IgnoreErrorSkipStep'
import { ERROR_KINDS, RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'
import { clickButtonLabeled } from '../../__tests__/util'
import { SkipStepInfo } from '/app/organisms/ErrorRecoveryFlows/shared'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/organisms/ErrorRecoveryFlows/shared', async () => {
  const actual = await vi.importActual(
    '/app/organisms/ErrorRecoveryFlows/shared'
  )
  return {
    ...actual,
    RecoverySingleColumnContentWrapper: vi.fn(({ children }) => (
      <div>{children}</div>
    )),
    SkipStepInfo: vi.fn(),
  }
})
vi.mock('../SelectRecoveryOption')

const render = (props: ComponentProps<typeof IgnoreErrorSkipStep>) => {
  return renderWithProviders(<IgnoreErrorSkipStep {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const renderIgnoreErrorStepHome = (
  props: ComponentProps<typeof IgnoreErrorStepHome>
) => {
  return renderWithProviders(<IgnoreErrorStepHome {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('IgnoreErrorSkipStep', () => {
  let props: ComponentProps<typeof IgnoreErrorSkipStep>

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      recoveryCommands: { ignoreErrorKindThisRun: vi.fn() } as any,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
    vi.mocked(SkipStepInfo).mockReturnValue(<div>MOCK_SKIP_STEP_INFO</div>)
  })

  it(`renders IgnoreErrorStepHome when step is ${RECOVERY_MAP.IGNORE_AND_SKIP.STEPS.SELECT_IGNORE_KIND}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.IGNORE_AND_SKIP.STEPS.SELECT_IGNORE_KIND,
      },
    }
    render(props)
    screen.getByText('Ignore similar errors later in the run?')
  })

  it(`renders SkipStepInfo when step is ${RECOVERY_MAP.IGNORE_AND_SKIP.STEPS.SKIP_STEP}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.IGNORE_AND_SKIP.STEPS.SKIP_STEP,
      },
    }
    render(props)
    screen.getByText('MOCK_SKIP_STEP_INFO')
  })

  it('renders SelectRecoveryOption as a fallback', () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: 'UNKNOWN_STEP' as any,
      },
    }
    render(props)
    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })
})

describe('IgnoreErrorStepHome', () => {
  let props: ComponentProps<typeof IgnoreErrorStepHome>
  let mockIgnoreErrorKindThisRun: Mock
  let mockProceedToRouteAndStep: Mock
  let mockGoBackPrevStep: Mock
  let mockProceedNextStep: Mock

  beforeEach(() => {
    mockIgnoreErrorKindThisRun = vi.fn(() => Promise.resolve())
    mockProceedToRouteAndStep = vi.fn()
    mockGoBackPrevStep = vi.fn()
    mockProceedNextStep = vi.fn()

    props = {
      ...mockRecoveryContentProps,
      isOnDevice: true,
      errorKind: ERROR_KINDS.NO_LIQUID_DETECTED,
      recoveryCommands: {
        ignoreErrorKindThisRun: mockIgnoreErrorKindThisRun,
      } as any,
      routeUpdateActions: {
        proceedToRouteAndStep: mockProceedToRouteAndStep,
        goBackPrevStep: mockGoBackPrevStep,
        proceedNextStep: mockProceedNextStep,
      } as any,
    }
  })

  it(`ignoreOnce correctly routes "ignore_only_this_error" is clicked and the errorKind is ${ERROR_KINDS.NO_LIQUID_DETECTED}`, async () => {
    renderIgnoreErrorStepHome(props)
    fireEvent.click(screen.queryAllByText('Ignore only this error')[0])
    clickButtonLabeled('Continue')
    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE,
        RECOVERY_MAP.MANUAL_FILL_AND_SKIP.STEPS.SKIP
      )
    })
  })

  it(`ignoreOnce correctly routes "ignore_only_this_error" is clicked and the errorKind not explicitly handled`, async () => {
    renderIgnoreErrorStepHome({
      ...props,
      errorKind: ERROR_KINDS.GENERAL_ERROR,
    })
    fireEvent.click(screen.queryAllByText('Ignore only this error')[0])
    clickButtonLabeled('Continue')
    await waitFor(() => {
      expect(mockProceedNextStep).toHaveBeenCalled()
    })
  })

  it(`ignoreAlways correctly routes when "ignore_all_errors_of_this_type" is clicked and the errorKind is ${ERROR_KINDS.NO_LIQUID_DETECTED}`, async () => {
    renderIgnoreErrorStepHome(props)
    fireEvent.click(screen.queryAllByText('Ignore all errors of this type')[0])
    clickButtonLabeled('Continue')
    await waitFor(() => {
      expect(mockIgnoreErrorKindThisRun).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
        RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE,
        RECOVERY_MAP.MANUAL_FILL_AND_SKIP.STEPS.SKIP
      )
    })
  })

  it(`ignoreAlways correctly routes "ignore_all_errors_of_this_type" is clicked and the errorKind not explicitly handled`, async () => {
    renderIgnoreErrorStepHome({
      ...props,
      errorKind: ERROR_KINDS.GENERAL_ERROR,
    })
    fireEvent.click(screen.queryAllByText('Ignore all errors of this type')[0])
    clickButtonLabeled('Continue')
    await waitFor(() => {
      expect(mockProceedNextStep).toHaveBeenCalled()
    })
  })

  it('calls goBackPrevStep when secondary button is clicked', () => {
    renderIgnoreErrorStepHome(props)
    clickButtonLabeled('Go back')
    expect(mockGoBackPrevStep).toHaveBeenCalled()
  })
})

describe('IgnoreOptions', () => {
  let props: ComponentProps<typeof IgnoreOptions>

  beforeEach(() => {
    props = {
      ignoreOptions: [
        'ignore_only_this_error',
        'ignore_all_errors_of_this_type',
      ],
      setSelectedOption: vi.fn(),
      selectedOption: 'ignore_only_this_error',
    }
  })

  it('renders the ignore options', () => {
    renderWithProviders(<IgnoreOptions {...props} />, {
      i18nInstance: i18n,
    })
    screen.getByText('Ignore only this error')
    screen.getByText('Ignore all errors of this type')
  })

  it('calls setSelectedOption when an option is selected', () => {
    renderWithProviders(<IgnoreOptions {...props} />, {
      i18nInstance: i18n,
    })
    fireEvent.click(screen.getByText('Ignore all errors of this type'))
    expect(props.setSelectedOption).toHaveBeenCalledWith(
      'ignore_all_errors_of_this_type'
    )
  })
})
