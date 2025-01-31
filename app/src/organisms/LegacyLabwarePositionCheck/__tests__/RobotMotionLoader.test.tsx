import { screen } from '@testing-library/react'
import { describe, it } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RobotMotionLoader } from '../RobotMotionLoader'

const mockHeader = 'Stand back, robot needs some space right now'

const render = () => {
  return renderWithProviders(<RobotMotionLoader header={mockHeader} />, {
    i18nInstance: i18n,
  })[0]
}

describe('Robot in Motion Modal', () => {
  it('should render robot in motion loader with header', () => {
    render()
    screen.getByRole('heading', { name: mockHeader })
  })
})
