import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { CompleteUpdateSoftware } from '../CompleteUpdateSoftware'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/robot-admin')

const render = (props: ComponentProps<typeof CompleteUpdateSoftware>) => {
  return renderWithProviders(<CompleteUpdateSoftware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('CompleteUpdateSoftware', () => {
  let props: ComponentProps<typeof CompleteUpdateSoftware>

  beforeEach(() => {
    props = {
      robotName: 'otie',
    }
  })

  it('should render text, progress bar and button', () => {
    render(props)
    screen.getByText('Update complete!')
    screen.getByText('Install complete, robot restarting...')
    const bar = screen.getByTestId('ProgressBar_Bar')
    expect(bar).toHaveStyle('width: 100%')
  })
})
