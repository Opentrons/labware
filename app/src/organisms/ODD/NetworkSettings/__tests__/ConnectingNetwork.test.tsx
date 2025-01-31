import { MemoryRouter } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ConnectingNetwork } from '../ConnectingNetwork'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ConnectingNetwork>) => {
  return renderWithProviders(
    <MemoryRouter>
      <ConnectingNetwork {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ConnectingNetwork', () => {
  let props: ComponentProps<typeof ConnectingNetwork>

  beforeEach(() => {
    props = {
      ssid: 'mockWifiSsid',
    }
  })
  it('should render text', () => {
    render(props)
    screen.getByText('Connecting to mockWifiSsid...')
  })

  it('should render a spinner icon', () => {
    render(props)
    expect(screen.getByLabelText('spinner')).toBeInTheDocument()
  })
})
