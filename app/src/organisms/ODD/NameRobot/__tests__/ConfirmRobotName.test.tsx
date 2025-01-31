import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ConfirmRobotName } from '../ConfirmRobotName'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof ConfirmRobotName>) => {
  return renderWithProviders(
    <MemoryRouter>
      <ConfirmRobotName {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ConfirmRobotName', () => {
  let props: ComponentProps<typeof ConfirmRobotName>
  beforeEach(() => {
    props = {
      robotName: 'otie',
    }
  })

  it('should render text, an image and a button', () => {
    render(props)
    screen.getByText('otie, love it!')
    screen.getByText('Your robot is ready to go.')
    screen.getByText('Finish setup')
  })

  it('when tapping a button, call a mock function', () => {
    render(props)
    const button = screen.getByText('Finish setup')
    fireEvent.click(button)
    expect(mockNavigate).toBeCalledWith('/dashboard')
  })
})
