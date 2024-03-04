import * as React from 'react'
import { Route, MemoryRouter } from 'react-router-dom'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'

import { renderWithProviders } from '../../../__testing-utils__'

import { i18n } from '../../../i18n'
import * as Config from '../../../redux/config'
import { GeneralSettings } from '../GeneralSettings'
import { AdvancedSettings } from '../AdvancedSettings'
import { FeatureFlags } from '../../../organisms/AppSettings/FeatureFlags'
import { AppSettings } from '..'

vi.mock('../../../redux/config')
vi.mock('../GeneralSettings')
vi.mock('../PrivacySettings')
vi.mock('../AdvancedSettings')
vi.mock('../../../organisms/AppSettings/FeatureFlags')

const render = (path = '/'): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <Route path="/app-settings/:appSettingsTab">
        <AppSettings />
      </Route>
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}
describe('AppSettingsHeader', () => {
  beforeEach(() => {
    vi.mocked(Config.getDevtoolsEnabled).mockReturnValue(false)
    vi.mocked(GeneralSettings).mockReturnValue(<div>Mock General Settings</div>)
    vi.mocked(AdvancedSettings).mockReturnValue(
      <div>Mock Advanced Settings</div>
    )
    vi.mocked(FeatureFlags).mockReturnValue(<div>Mock Feature Flags</div>)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct title and navigation tabs', () => {
    const [{ getByText }] = render('/app-settings/general')
    getByText('App Settings')
    getByText('General')
    getByText('Advanced')
  })
  it('does not render feature flags link if dev tools disabled', () => {
    const [{ queryByText }] = render('/app-settings/general')
    expect(queryByText('Feature Flags')).toBeFalsy()
  })
  it('renders feature flags link if dev tools enabled', () => {
    vi.mocked(Config.getDevtoolsEnabled).mockReturnValue(true)
    const [{ getByText }] = render('/app-settings/general')
    getByText('Feature Flags')
  })
})
