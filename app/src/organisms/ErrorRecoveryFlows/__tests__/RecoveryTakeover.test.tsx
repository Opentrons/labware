import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
} from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RecoveryTakeover, RecoveryTakeoverDesktop } from '../RecoveryTakeover'
import { useUpdateClientDataRecovery } from '/app/resources/client_data'
import { clickButtonLabeled } from './util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/resources/client_data')

const render = (props: ComponentProps<typeof RecoveryTakeover>) => {
  return renderWithProviders(<RecoveryTakeover {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RecoveryTakeover', () => {
  let props: ComponentProps<typeof RecoveryTakeover>
  let mockClearClientData: Mock

  beforeEach(() => {
    mockClearClientData = vi.fn()
    vi.mocked(useUpdateClientDataRecovery).mockReturnValue({
      clearClientData: mockClearClientData,
    } as any)

    props = {
      intent: 'recovering',
      runStatus: RUN_STATUS_AWAITING_RECOVERY,
      robotName: 'TestRobot',
      isOnDevice: false,
    }
  })

  it('renders RecoveryTakeoverComponent with correct props for recovering intent on desktop', () => {
    render(props)
    screen.getByText('Error on TestRobot')
    screen.getByText('Robot is in recovery mode')
    screen.getByText(
      'The robot’s touchscreen or another computer with the app is currently controlling this robot.'
    )
  })

  it('renders RecoveryTakeoverComponent with correct props for canceling intent on desktop', () => {
    render({ ...props, intent: 'canceling' })
    screen.getByText('Error on TestRobot')
    screen.getByText('Robot is canceling the run')
    screen.getByText(
      'The robot’s touchscreen or another computer with the app is currently controlling this robot.'
    )
  })
  ;[
    RUN_STATUS_AWAITING_RECOVERY,
    RUN_STATUS_AWAITING_RECOVERY_PAUSED,
    RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  ].forEach(runStatus => {
    it(`renders the terminate button as enabled when run status is ${runStatus}`, () => {
      render({ ...props, runStatus })

      expect(screen.getByText('Terminate remote activity')).toBeEnabled()
    })
  })

  it('renders RecoveryTakeoverComponent with correct props for recovering intent on ODD', () => {
    render({ ...props, isOnDevice: true })
    screen.getByText('Robot is in recovery mode')
    screen.getByText(
      'A computer with the Opentrons App is currently controlling this robot.'
    )
    screen.getByText('Terminate remote activity')
  })

  it('renders RecoveryTakeoverComponent with correct props for canceling intent on ODD', () => {
    render({ ...props, isOnDevice: true, intent: 'canceling' })
    screen.getByText('Robot is canceling the run')
    screen.getByText(
      'A computer with the Opentrons App is currently controlling this robot.'
    )
    screen.getByText('Terminate remote activity')
  })
})

describe('RecoveryTakeoverDesktop', () => {
  let props: ComponentProps<typeof RecoveryTakeoverDesktop>

  beforeEach(() => {
    props = {
      title: 'Test Title',
      isRunStatusAwaitingRecovery: false,
      robotName: 'TestRobot',
      isOnDevice: false,
      clearClientData: vi.fn(),
    }
  })

  it('calls clearClientData when terminate button is clicked', () => {
    renderWithProviders(<RecoveryTakeoverDesktop {...props} />, {
      i18nInstance: i18n,
    })
    clickButtonLabeled('Terminate remote activity')

    expect(props.clearClientData).toHaveBeenCalled()
  })

  it('disables terminate button when isRunStatusAwaitingRecovery is true', () => {
    props.isRunStatusAwaitingRecovery = true
    renderWithProviders(<RecoveryTakeoverDesktop {...props} />, {
      i18nInstance: i18n,
    })
    expect(screen.getByText('Terminate remote activity')).toBeDisabled()
  })
})
