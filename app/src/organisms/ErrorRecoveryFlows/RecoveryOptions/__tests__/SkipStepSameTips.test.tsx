import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SkipStepSameTips } from '../SkipStepSameTips'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'
import { SkipStepInfo } from '/app/organisms/ErrorRecoveryFlows/shared'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/Command')
vi.mock('/app/organisms/ErrorRecoveryFlows/shared')
vi.mock('../SelectRecoveryOption')

const render = (props: ComponentProps<typeof SkipStepSameTips>) => {
  return renderWithProviders(<SkipStepSameTips {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SkipStepSameTips', () => {
  let props: ComponentProps<typeof SkipStepSameTips>

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
    }

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
    vi.mocked(SkipStepInfo).mockReturnValue(<div>MOCK_SKIP_STEP_INFO</div>)
  })

  it(`renders SkipStepSameTipsInfo when step is ${RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.STEPS.SKIP}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.STEPS.SKIP,
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
