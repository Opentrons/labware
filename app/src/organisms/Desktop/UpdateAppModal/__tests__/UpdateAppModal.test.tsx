import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import * as Shell from '/app/redux/shell'
import { renderWithProviders } from '/app/__testing-utils__'
import { useRemoveActiveAppUpdateToast } from '../../Alerts'
import { UpdateAppModal, RELEASE_NOTES_URL_BASE } from '..'

import type { ComponentProps } from 'react'
import type * as Dom from 'react-router-dom'
import type { State } from '/app/redux/types'
import type { ShellUpdateState } from '/app/redux/shell/types'
import type * as ShellState from '/app/redux/shell'
import type { UpdateAppModalProps } from '..'

vi.mock('/app/redux/shell/update', async importOriginal => {
  const actual = await importOriginal<typeof ShellState>()
  return {
    ...actual,
    getShellUpdateState: vi.fn(),
  }
})

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof Dom>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('../../Alerts')

const getShellUpdateState = Shell.getShellUpdateState

const render = (props: ComponentProps<typeof UpdateAppModal>) => {
  return renderWithProviders(<UpdateAppModal {...props} />, {
    i18nInstance: i18n,
    initialState: {
      shell: { update: { info: { version: '7.0.0' }, available: true } },
    },
  })
}

describe('UpdateAppModal', () => {
  let props: ComponentProps<typeof UpdateAppModal>

  beforeEach(() => {
    props = {
      closeModal: vi.fn(),
    } as UpdateAppModalProps
    vi.mocked(getShellUpdateState).mockImplementation((state: State) => {
      return {
        downloading: false,
        available: true,
        downloaded: false,
        downloadPercentage: 0,
        error: null,
        info: {
          version: '1.2.3',
          releaseNotes: 'this is a release',
        },
      } as ShellUpdateState
    })
    vi.mocked(useRemoveActiveAppUpdateToast).mockReturnValue({
      removeActiveAppUpdateToast: vi.fn(),
    })
  })

  it('renders update available title and release notes when update is available', () => {
    render(props)
    expect(
      screen.getByText('Opentrons App Update Available')
    ).toBeInTheDocument()
    expect(screen.getByText('this is a release')).toBeInTheDocument()
  })
  it('closes modal when "remind me later" button is clicked', () => {
    const closeModal = vi.fn()
    render({ ...props, closeModal })
    fireEvent.click(screen.getByText('Remind me later'))
    expect(closeModal).toHaveBeenCalled()
  })

  it('renders a release notes link pointing to the Github releases page', () => {
    render(props)

    const link = screen.getByText('Release notes')
    expect(link).toHaveAttribute('href', RELEASE_NOTES_URL_BASE + '7.0.0')
  })

  it('shows error modal on error', () => {
    vi.mocked(getShellUpdateState).mockReturnValue({
      error: {
        message: 'Could not get code signature for running application',
        name: 'Error',
      },
    } as ShellUpdateState)
    render(props)
    expect(screen.getByText('Update Error')).toBeInTheDocument()
  })
  it('shows a download progress bar when downloading', () => {
    vi.mocked(getShellUpdateState).mockReturnValue({
      downloading: true,
      downloadPercentage: 50,
    } as ShellUpdateState)
    render(props)
    expect(screen.getByText('Downloading update...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
  it('renders download complete text when download is finished', () => {
    vi.mocked(getShellUpdateState).mockReturnValue({
      downloading: false,
      downloaded: true,
    } as ShellUpdateState)
    render(props)
    expect(
      screen.getByText('Download complete, restarting the app...')
    ).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(getComputedStyle(screen.getByTestId('ProgressBar_Bar')).width).toBe(
      '100%'
    )
  })
  it('renders an error message when an error occurs', () => {
    vi.mocked(getShellUpdateState).mockReturnValue({
      error: { name: 'Update Error' },
    } as ShellUpdateState)
    render(props)
    expect(
      screen.getByRole('heading', { name: 'Update Error' })
    ).toBeInTheDocument()
  })
  it('uses a custom width and left margin to properly center the modal', () => {
    render(props)
    expect(screen.getByLabelText('ModalShell_ModalArea')).toHaveStyle(
      'width: 40rem'
    )
    expect(screen.getByLabelText('ModalShell_ModalArea')).toHaveStyle(
      'margin-left: 5.336rem'
    )
  })
})
