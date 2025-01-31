import { screen } from '@testing-library/react'
import { describe, it, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { EstopBanner } from '../EstopBanner'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof EstopBanner>) =>
  renderWithProviders(<EstopBanner {...props} />, { i18nInstance: i18n })

describe('EstopBanner', () => {
  let props: ComponentProps<typeof EstopBanner>
  beforeEach(() => {
    props = {
      status: 'physicallyEngaged',
    }
  })

  it('should render text and call a mock function when tapping text button - estop physicallyEngaged', () => {
    render(props)
    screen.getByText('E-stop pressed. Robot movement is halted.')
    screen.getByText('Reset E-stop')
  })
  it('should render text and call a mock function when tapping text button - estop logicallyEngaged', () => {
    props.status = 'logicallyEngaged'
    render(props)
    screen.getByText('E-stop disengaged, but robot operation still halted.')
    screen.getByText('Resume operation')
  })
  it('should render text and call a mock function when tapping text button - estop notPresent', () => {
    props.status = 'notPresent'
    render(props)
    screen.getByText('E-stop disconnected. Robot movement is halted.')
    screen.getByText('Resume operation')
  })
})
