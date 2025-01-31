import { describe, it, beforeEach } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { InfoMessage } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof InfoMessage>) => {
  return renderWithProviders(<InfoMessage {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('InfoMessage', () => {
  let props: ComponentProps<typeof InfoMessage>

  beforeEach(() => {
    props = {
      title: 'a message from otie',
    }
  })
  it('renders info message', () => {
    render(props)
    screen.getByLabelText('icon_information')
    screen.getByText('a message from otie')
  })
  it('renders info message body', () => {
    props = {
      title: 'a message from otie',
      body: 'the run has started',
    }
    render(props)
    screen.getByText('the run has started')
  })
})
