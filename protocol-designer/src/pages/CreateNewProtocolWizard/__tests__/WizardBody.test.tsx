import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { WizardBody } from '../WizardBody'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof WizardBody>) => {
  return renderWithProviders(<WizardBody {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('WizardBody', () => {
  let props: ComponentProps<typeof WizardBody>

  beforeEach(() => {
    props = {
      stepNumber: 1,
      header: 'mockHeader',
      children: <div>mock children</div>,
      proceed: vi.fn(),
      disabled: false,
      goBack: vi.fn(),
      subHeader: 'mockSubheader',
      robotType: FLEX_ROBOT_TYPE,
    }
  })

  it('renders all the elements', () => {
    render(props)
    screen.getByText('Step 1')
    screen.getByText('mockHeader')
    screen.getByText('mock children')
    screen.getByText('mockSubheader')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(props.proceed).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()
    screen.getByLabelText('onboarding animation for page 1')
  })
})
