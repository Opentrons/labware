import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { getHasUnsavedChanges } from '../../../load-file/selectors'
import { toggleNewProtocolModal } from '../../../navigation/actions'
import { SettingsIcon } from '../../SettingsIcon'
import { Navigation } from '..'

vi.mock('../../SettingsIcon')
vi.mock('../../../navigation/actions')
vi.mock('../../../file-data/selectors')
vi.mock('../../../load-file/selectors')
const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('Navigation', () => {
  beforeEach(() => {
    vi.mocked(getHasUnsavedChanges).mockReturnValue(false)
    vi.mocked(SettingsIcon).mockReturnValue(<div>mock SettingsIcon</div>)
  })
  it('should render text and link button', () => {
    render()
    screen.getByText('Opentrons')
    screen.getByText('Protocol Designer')
    screen.getByText('Version fake_PD_version')
    screen.getByText('Create new')
    screen.getByText('Import')
    screen.getByText('mock SettingsIcon')
  })

  it('when clicking Create new, should call the toggle action', () => {
    render()
    fireEvent.click(screen.getByText('Create new'))
    expect(vi.mocked(toggleNewProtocolModal)).toHaveBeenCalled()
  })

  it.todo('when clicking Import, mock function should be called', () => {})
})
