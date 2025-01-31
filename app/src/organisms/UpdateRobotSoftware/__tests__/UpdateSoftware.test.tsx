import { screen } from '@testing-library/react'
import { describe, it, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { UpdateSoftware } from '../UpdateSoftware'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof UpdateSoftware>) => {
  return renderWithProviders(<UpdateSoftware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UpdateSoftware', () => {
  let props: ComponentProps<typeof UpdateSoftware>
  beforeEach(() => {
    props = {
      updateType: 'downloading',
    }
  })
  it('should render text - downloading software', () => {
    render(props)
    screen.getByText('Downloading software...')
  })
  it('should render text - sending software', () => {
    props = {
      ...props,
      updateType: 'sendingFile',
    }
    render(props)
    screen.getByText('Sending software...')
  })
  it('should render text - validating software', () => {
    props = {
      ...props,
      updateType: 'validating',
    }
    render(props)
    screen.getByText('Validating software...')
  })
  it('should render text - installing software', () => {
    props = {
      ...props,
      updateType: 'installing',
    }
    render(props)
    screen.getByText('Installing software...')
  })
})
