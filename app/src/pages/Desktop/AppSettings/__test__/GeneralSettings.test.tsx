import { MemoryRouter } from 'react-router-dom'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'

import {
  i18n,
  SIMPLIFIED_CHINESE,
  SIMPLIFIED_CHINESE_DISPLAY_NAME,
  US_ENGLISH,
  US_ENGLISH_DISPLAY_NAME,
} from '/app/i18n'
import { getAlertIsPermanentlyIgnored } from '/app/redux/alerts'
import {
  ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_SETTINGS,
  useTrackEvent,
} from '/app/redux/analytics'
import { getAppLanguage, updateConfigValue } from '/app/redux/config'
import * as Shell from '/app/redux/shell'
import { GeneralSettings } from '../GeneralSettings'

vi.mock('/app/redux/config')
vi.mock('/app/redux/shell')
vi.mock('/app/redux/analytics')
vi.mock('/app/redux/alerts')

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(
    <MemoryRouter>
      <GeneralSettings />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockTrackEvent = vi.fn()

describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.mocked(Shell.getAvailableShellUpdate).mockReturnValue(null)
    vi.mocked(getAlertIsPermanentlyIgnored).mockReturnValue(false)
    vi.mocked(getAppLanguage).mockReturnValue(US_ENGLISH)
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct titles', () => {
    render()
    screen.getByText('App Software Version')
    screen.getByText('Software Update Alerts')
    screen.getByText('Connect to a Robot via IP Address')
  })

  it('renders software version section with no update available', () => {
    render()
    screen.getByText('Up to date')
    screen.getByText('View latest release notes on')
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Opentrons/opentrons/blob/edge/app-shell/build/release-notes.md'
    )
    screen.getByRole('button', {
      name: 'See how to restore a previous software version',
    })
    expect(
      'It is very important for the robot and app software to be on the same version. Manage the robot software versions via Robot Settings &gt; Advanced.'
    ).toBeTruthy()
    expect(
      screen.getByRole('link', {
        name:
          'Learn more about keeping the Opentrons App and robot software in sync',
      })
    ).toHaveAttribute('href', 'https://support.opentrons.com/s/')
  })

  it('renders correct info if there is update available', () => {
    vi.mocked(Shell.getAvailableShellUpdate).mockReturnValue('5.0.0-beta.8')
    render()
    screen.getByRole('button', { name: 'View software update' })
  })

  it('renders correct info if there is no update available', () => {
    expect(screen.queryByText('View software update')).toBeNull()
  })

  it('renders correct info if there is update available but alert ignored enabled', () => {
    vi.mocked(Shell.getAvailableShellUpdate).mockReturnValue('5.0.0-beta.8')
    vi.mocked(getAlertIsPermanentlyIgnored).mockReturnValue(true)
    expect(screen.queryByText('View software update')).toBeNull()
  })

  it('renders the text and toggle for update alert section', () => {
    render()
    screen.getByText(
      'Receive an alert when an Opentrons software update is available.'
    )
    screen.getByRole('switch', {
      name: 'Enable app update notifications',
    })
  })

  it('renders the ip address button', () => {
    render()
    screen.getByRole('button', { name: 'Set up connection' })
  })

  it('renders the text and dropdown for the app language preferences section', () => {
    render()
    screen.getByText('App Language Preferences')
    screen.getByText(
      'All app features use this language. Protocols and other user content will not change language.'
    )
    fireEvent.click(screen.getByText(US_ENGLISH_DISPLAY_NAME))
    fireEvent.click(
      screen.getByRole('button', {
        name: SIMPLIFIED_CHINESE_DISPLAY_NAME,
      })
    )
    expect(updateConfigValue).toBeCalledWith(
      'language.appLanguage',
      SIMPLIFIED_CHINESE
    )
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_SETTINGS,
      properties: {
        language: SIMPLIFIED_CHINESE,
        transactionId: expect.anything(),
      },
    })
  })
})
