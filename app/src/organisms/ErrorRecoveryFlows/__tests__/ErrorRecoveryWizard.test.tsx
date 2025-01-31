import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '../__fixtures__'
import {
  ErrorRecoveryContent,
  useERWizard,
  ErrorRecoveryComponent,
} from '../ErrorRecoveryWizard'
import { RECOVERY_MAP } from '../constants'
import {
  SelectRecoveryOption,
  RetryStep,
  RetryNewTips,
  CancelRun,
  ManageTips,
  RetrySameTips,
  FillWellAndSkip,
  SkipStepNewTips,
  SkipStepSameTips,
  IgnoreErrorSkipStep,
  ManualReplaceLwAndRetry,
  ManualMoveLwAndSkip,
  HomeAndRetry,
} from '../RecoveryOptions'
import { RecoveryInProgress } from '../RecoveryInProgress'
import { RecoveryError } from '../RecoveryError'
import { RecoveryDoorOpen } from '../RecoveryDoorOpen'
import {
  useErrorDetailsModal,
  ErrorDetailsModal,
  RecoveryDoorOpenSpecial,
} from '../shared'

import type { ComponentProps } from 'react'

vi.mock('../RecoveryOptions')
vi.mock('../RecoveryInProgress')
vi.mock('../RecoveryError')
vi.mock('../RecoveryDoorOpen')
vi.mock('../hooks')
vi.mock('../shared', async importOriginal => {
  const actual = await importOriginal<typeof ErrorDetailsModal>()
  return {
    ...actual,
    useErrorDetailsModal: vi.fn(),
    ErrorDetailsModal: vi.fn(),
    RecoveryDoorOpenSpecial: vi.fn(),
  }
})
describe('useERWizard', () => {
  describe('useERWizard', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useERWizard())
      expect(result.current.showERWizard).toBe(false)
      expect(result.current.hasLaunchedRecovery).toBe(false)
    })

    it('correctly toggles showERWizard and updates hasLaunchedRecovery when hasLaunchedER is provided', async () => {
      const { result } = renderHook(() => useERWizard())

      await act(async () => {
        await result.current.toggleERWizard(true, true)
      })

      expect(result.current.showERWizard).toBe(true)
      expect(result.current.hasLaunchedRecovery).toBe(true)

      await act(async () => {
        await result.current.toggleERWizard(false, false)
      })

      expect(result.current.showERWizard).toBe(false)
      expect(result.current.hasLaunchedRecovery).toBe(false)
    })

    it('does not update hasLaunchedRecovery when hasLaunchedER is undefined', async () => {
      const { result } = renderHook(() => useERWizard())

      await act(async () => {
        await result.current.toggleERWizard(true)
      })

      expect(result.current.showERWizard).toBe(true)
      expect(result.current.hasLaunchedRecovery).toBe(false)

      await act(async () => {
        await result.current.toggleERWizard(false)
      })

      expect(result.current.showERWizard).toBe(false)
      expect(result.current.hasLaunchedRecovery).toBe(false)
    })
  })
})

const renderRecoveryComponent = (
  props: ComponentProps<typeof ErrorRecoveryComponent>
) => {
  return renderWithProviders(<ErrorRecoveryComponent {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorRecoveryComponent', () => {
  let props: ComponentProps<typeof ErrorRecoveryComponent>

  beforeEach(() => {
    props = mockRecoveryContentProps

    vi.mocked(RecoveryDoorOpen).mockReturnValue(
      <div>MOCK_RECOVERY_DOOR_OPEN</div>
    )
    vi.mocked(ErrorDetailsModal).mockReturnValue(<div>ERROR_DETAILS_MODAL</div>)
    vi.mocked(useErrorDetailsModal).mockReturnValue({
      toggleModal: vi.fn(),
      showModal: false,
    })
    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
  })

  it('renders appropriate header copy', () => {
    renderRecoveryComponent(props)

    screen.getByText('View error details')
  })

  it('renders the error details modal when there is an error', () => {
    vi.mocked(useErrorDetailsModal).mockReturnValue({
      toggleModal: vi.fn(),
      showModal: true,
    })

    renderRecoveryComponent(props)

    screen.getByText('ERROR_DETAILS_MODAL')
  })

  it('renders the recovery door modal when isDoorOpen is true', () => {
    props = {
      ...props,
      doorStatusUtils: { isProhibitedDoorOpen: true, isDoorOpen: true },
    }

    renderRecoveryComponent(props)

    screen.getByText('MOCK_RECOVERY_DOOR_OPEN')
  })

  it('renders recovery content when isDoorOpen is false', () => {
    renderRecoveryComponent(props)

    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })
})

const renderRecoveryContent = (
  props: ComponentProps<typeof ErrorRecoveryContent>
) => {
  return renderWithProviders(<ErrorRecoveryContent {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorRecoveryContent', () => {
  const {
    OPTION_SELECTION,
    RETRY_STEP,
    ROBOT_CANCELING,
    ROBOT_RESUMING,
    ROBOT_IN_MOTION,
    ROBOT_RETRYING_STEP,
    ROBOT_PICKING_UP_TIPS,
    ROBOT_SKIPPING_STEP,
    RETRY_NEW_TIPS,
    RETRY_SAME_TIPS,
    MANUAL_FILL_AND_SKIP,
    SKIP_STEP_WITH_SAME_TIPS,
    SKIP_STEP_WITH_NEW_TIPS,
    IGNORE_AND_SKIP,
    CANCEL_RUN,
    DROP_TIP_FLOWS,
    ERROR_WHILE_RECOVERING,
    ROBOT_DOOR_OPEN,
    ROBOT_DOOR_OPEN_SPECIAL,
    ROBOT_RELEASING_LABWARE,
    MANUAL_REPLACE_AND_RETRY,
    MANUAL_MOVE_AND_SKIP,
    HOME_AND_RETRY,
  } = RECOVERY_MAP

  let props: ComponentProps<typeof ErrorRecoveryContent>

  beforeEach(() => {
    props = mockRecoveryContentProps

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
    vi.mocked(RetryStep).mockReturnValue(<div>MOCK_RESUME_RUN</div>)
    vi.mocked(RecoveryInProgress).mockReturnValue(<div>MOCK_IN_PROGRESS</div>)
    vi.mocked(CancelRun).mockReturnValue(<div>MOCK_CANCEL_RUN</div>)
    vi.mocked(ManageTips).mockReturnValue(<div>MOCK_DROP_TIP_FLOWS</div>)
    vi.mocked(RetryNewTips).mockReturnValue(<div>MOCK_RETRY_NEW_TIPS</div>)
    vi.mocked(RecoveryError).mockReturnValue(<div>MOCK_RECOVERY_ERROR</div>)
    vi.mocked(RetrySameTips).mockReturnValue(<div>MOCK_RETRY_SAME_TIPS</div>)
    vi.mocked(FillWellAndSkip).mockReturnValue(
      <div>MOCK_FILL_WELL_AND_SKIP</div>
    )
    vi.mocked(SkipStepSameTips).mockReturnValue(
      <div>MOCK_SKIP_STEP_SAME_TIPS</div>
    )
    vi.mocked(SkipStepNewTips).mockReturnValue(<div>MOCK_STEP_NEW_TIPS</div>)
    vi.mocked(ManualReplaceLwAndRetry).mockReturnValue(
      <div>MOCK_REPLACE_LW_AND_RETRY</div>
    )
    vi.mocked(ManualMoveLwAndSkip).mockReturnValue(
      <div>MOCK_MOVE_LW_AND_SKIP</div>
    )
    vi.mocked(IgnoreErrorSkipStep).mockReturnValue(
      <div>MOCK_IGNORE_ERROR_SKIP_STEP</div>
    )
    vi.mocked(RecoveryDoorOpen).mockReturnValue(<div>MOCK_DOOR_OPEN</div>)
    vi.mocked(RecoveryDoorOpenSpecial).mockReturnValue(
      <div>MOCK_DOOR_OPEN_SPECIAL</div>
    )
    vi.mocked(HomeAndRetry).mockReturnValue(<div>MOCK_HOME_AND_RETRY</div>)
  })

  it(`returns SelectRecoveryOption when the route is ${OPTION_SELECTION.ROUTE}`, () => {
    renderRecoveryContent(props)

    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })

  it(`returns ResumeRun when the route is ${RETRY_STEP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: RETRY_STEP.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_RESUME_RUN')
  })

  it(`returns appropriate view when the route is ${DROP_TIP_FLOWS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: DROP_TIP_FLOWS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_DROP_TIP_FLOWS')
  })

  it(`returns appropriate view when the route is ${CANCEL_RUN.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: CANCEL_RUN.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_CANCEL_RUN')
  })

  it(`returns appropriate view when the route is ${RETRY_NEW_TIPS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: RETRY_NEW_TIPS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_RETRY_NEW_TIPS')
  })

  it(`returns appropriate view when the route is ${RETRY_SAME_TIPS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: RETRY_SAME_TIPS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_RETRY_SAME_TIPS')
  })

  it(`returns appropriate view when the route is ${MANUAL_FILL_AND_SKIP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: MANUAL_FILL_AND_SKIP.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_FILL_WELL_AND_SKIP')
  })

  it(`returns appropriate view when the route is ${SKIP_STEP_WITH_SAME_TIPS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: SKIP_STEP_WITH_SAME_TIPS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_SKIP_STEP_SAME_TIPS')
  })

  it(`returns appropriate view when the route is ${SKIP_STEP_WITH_NEW_TIPS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: SKIP_STEP_WITH_NEW_TIPS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_STEP_NEW_TIPS')
  })

  it(`returns appropriate view when the route is ${IGNORE_AND_SKIP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: IGNORE_AND_SKIP.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IGNORE_ERROR_SKIP_STEP')
  })

  it(`returns appropriate view when the route is ${MANUAL_MOVE_AND_SKIP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: MANUAL_MOVE_AND_SKIP.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_MOVE_LW_AND_SKIP')
  })

  it(`returns appropriate view when the route is ${MANUAL_REPLACE_AND_RETRY.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: MANUAL_REPLACE_AND_RETRY.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_REPLACE_LW_AND_RETRY')
  })

  it(`returns RecoveryError when the route is ${ERROR_WHILE_RECOVERING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ERROR_WHILE_RECOVERING.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_RECOVERY_ERROR')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_CANCELING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_CANCELING.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_IN_MOTION.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_RESUMING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_RETRYING_STEP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_PICKING_UP_TIPS.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_PICKING_UP_TIPS.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_SKIPPING_STEP.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_SKIPPING_STEP.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_RELEASING_LABWARE.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_RELEASING_LABWARE.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryDoorOpen when the route is ${ROBOT_DOOR_OPEN.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_DOOR_OPEN.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_DOOR_OPEN')
  })

  it(`returns RecoveryDoorOpenSpecial when the route is ${ROBOT_DOOR_OPEN_SPECIAL.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_DOOR_OPEN_SPECIAL.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_DOOR_OPEN_SPECIAL')
  })

  it(`returns HomeAndRetry when the route is ${HOME_AND_RETRY.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: HOME_AND_RETRY.ROUTE,
      },
    }
    renderRecoveryContent(props)

    screen.getByText('MOCK_HOME_AND_RETRY')
  })
})
