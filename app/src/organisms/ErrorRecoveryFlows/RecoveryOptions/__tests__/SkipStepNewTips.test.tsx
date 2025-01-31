import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SkipStepNewTips } from '../SkipStepNewTips'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/molecules/Command')
vi.mock('../SelectRecoveryOption')
vi.mock('../../shared', async () => {
  const actual = await vi.importActual('../../shared')
  return {
    ...actual,
    SelectTips: vi.fn(() => <div>MOCK_SELECT_TIPS</div>),
    TwoColLwInfoAndDeck: vi.fn(() => <div>MOCK_REPLACE_TIPS</div>),
    SkipStepInfo: vi.fn(() => <div>MOCK_SKIP_STEP_INFO</div>),
  }
})

const render = (props: ComponentProps<typeof SkipStepNewTips>) => {
  return renderWithProviders(<SkipStepNewTips {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SkipStepNewTips', () => {
  let props: ComponentProps<typeof SkipStepNewTips>
  let mockProceedToRouteAndStep: Mock

  beforeEach(() => {
    mockProceedToRouteAndStep = vi.fn()

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        proceedToRouteAndStep: mockProceedToRouteAndStep,
      } as any,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
  })

  it(`renders ReplaceTips when step is ${RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.REPLACE_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.REPLACE_TIPS,
      },
    }
    render(props)
    screen.getByText('MOCK_REPLACE_TIPS')
  })

  it(`renders SelectTips when step is ${RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.SELECT_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.SELECT_TIPS,
      },
    }
    render(props)
    screen.getByText('MOCK_SELECT_TIPS')
  })

  it(`renders SkipStepWithNewTips when step is ${RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.SKIP}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.SKIP,
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

  it(`proceeds to ${RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE} route and ${RECOVERY_MAP.DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING} step when step is ${RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.DROP_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.STEPS.DROP_TIPS,
      },
    }
    render(props)
    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE,
      RECOVERY_MAP.DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING
    )
  })
})
