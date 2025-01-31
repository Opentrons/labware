import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RetryStep } from '../RetryStep'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/Command')
vi.mock('../SelectRecoveryOption')

const render = (props: ComponentProps<typeof RetryStep>) => {
  return renderWithProviders(<RetryStep {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RetryStep', () => {
  let props: ComponentProps<typeof RetryStep>

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it(`renders RetryStepInfo when step is ${RECOVERY_MAP.RETRY_STEP.STEPS.CONFIRM_RETRY}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.RETRY_STEP.STEPS.CONFIRM_RETRY,
      },
    }
    render(props)
    screen.getByText('Retry step')
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
