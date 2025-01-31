import { createStore } from 'redux'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'

import { i18n } from '/app/i18n'
import {
  getRobotUpdateDisplayInfo,
  getRobotUpdateVersion,
} from '/app/redux/robot-update'
import { getDiscoverableRobotByName } from '/app/redux/discovery'
import { UpdateRobotModal, RELEASE_NOTES_URL_BASE } from '../UpdateRobotModal'
import { useIsRobotBusy } from '/app/redux-resources/robots'

import type { ComponentProps } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/discovery')
vi.mock('/app/redux-resources/robots')

const render = (props: ComponentProps<typeof UpdateRobotModal>) => {
  return renderWithProviders(<UpdateRobotModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UpdateRobotModal', () => {
  let props: ComponentProps<typeof UpdateRobotModal>
  let store: Store<State>
  beforeEach(() => {
    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    props = {
      robotName: 'test robot',
      releaseNotes: 'test notes',
      systemType: 'flex',
      closeModal: vi.fn(),
      updateType: 'upgrade',
    }
    vi.mocked(getRobotUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'upgrade',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: 'test',
    })
    vi.mocked(getDiscoverableRobotByName).mockReturnValue(null)
    vi.mocked(getRobotUpdateVersion).mockReturnValue('7.0.0')
    vi.mocked(useIsRobotBusy).mockReturnValue(false)
  })

  it('renders an update available header if the type is not Balena when upgrading', () => {
    render(props)
    screen.getByText('test robot Update Available')
  })

  it('renders a special update  header if the type is Balena', () => {
    props = {
      ...props,
      systemType: 'ot2-balena',
    }
    render(props)
    screen.getByText('Robot Operating System Update Available')
  })

  it('renders release notes and a modal header close icon when upgrading', () => {
    render(props)
    screen.getByText('test notes')

    const exitIcon = screen.getByTestId(
      'ModalHeader_icon_close_test robot Update Available'
    )
    fireEvent.click(exitIcon)
    expect(props.closeModal).toHaveBeenCalled()
  })

  it('renders remind me later and and disabled update robot now buttons when upgrading', () => {
    render(props)
    screen.getByText('test notes')

    const remindMeLater = screen.getByText('Remind me later')
    const updateNow = screen.getByText('Update robot now')
    expect(updateNow).toBeDisabled()
    fireEvent.click(remindMeLater)
    expect(props.closeModal).toHaveBeenCalled()
  })

  it('renders a release notes link pointing to the Github releases page', () => {
    render(props)

    const link = screen.getByText('Release notes')
    expect(link).toHaveAttribute('href', RELEASE_NOTES_URL_BASE + '7.0.0')
  })

  it('renders proper text when reinstalling', () => {
    props = {
      ...props,
      updateType: 'reinstall',
    }

    render(props)
    screen.getByText('Robot is up to date')
    screen.queryByText('It looks like your robot is already up to date')
    screen.getByText('Not now')
    screen.getByText('Update robot now')
  })

  it('renders proper text when downgrading', () => {
    props = {
      ...props,
      updateType: 'downgrade',
    }

    render(props)
    screen.getByText('test robot Update Available')
    screen.getByText('Not now')
    screen.getByText('Update robot now')
  })
})
