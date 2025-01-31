import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  LEFT,
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'
import { COLORS } from '@opentrons/components'
import { useInstrumentsQuery } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { useIsOEMMode } from '/app/resources/robot-settings/hooks'
import { i18n } from '/app/i18n'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { Results } from '../Results'
import { FLOWS } from '../constants'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/robot-settings/hooks')

const render = (props: ComponentProps<typeof Results>) => {
  return renderWithProviders(<Results {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('Results', () => {
  let props: ComponentProps<typeof Results>
  let pipettePromise: Promise<void>
  let mockRefetchInstruments: Mock
  beforeEach(() => {
    props = {
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
      goBack: vi.fn(),
      proceed: vi.fn(),
      chainRunCommands: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      isRobotMoving: false,
      maintenanceRunId: RUN_ID_1,
      attachedPipettes: { left: mockAttachedPipetteInformation, right: null },
      errorMessage: null,
      setShowErrorMessage: vi.fn(),
      flowType: FLOWS.CALIBRATE,
      handleCleanUpAndClose: vi.fn(),
      currentStepIndex: 2,
      totalStepCount: 6,
      isOnDevice: false,
      isFetching: false,
      setFetching: vi.fn(),
      hasCalData: false,
    }
    pipettePromise = Promise.resolve()
    mockRefetchInstruments = vi.fn(() => pipettePromise)
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetchInstruments,
    } as any)
    vi.mocked(useIsOEMMode).mockReturnValue(false)
  })
  it('renders the correct information when pipette cal is a success for calibrate flow', () => {
    props = {
      ...props,
      currentStepIndex: 6,
      totalStepCount: 6,
      hasCalData: true,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully recalibrated')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )

    screen.getByText('Exit')
    const exit = screen.getByRole('button', { name: 'Results_exit' })
    fireEvent.click(exit)
    expect(props.handleCleanUpAndClose).toHaveBeenCalled()
  })

  it('renders the correct information when pipette wizard is a success for attach flow', async () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully attached')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    screen.getByRole('button', { name: 'Results_exit' })
    fireEvent.click(screen.getByText('Calibrate pipette'))
    expect(props.chainRunCommands).toHaveBeenCalledWith(
      [
        {
          commandType: 'loadPipette' as const,
          params: {
            pipetteName: 'p1000_single_flex',
            pipetteId: 'abc',
            mount: 'left',
          },
        },
        {
          commandType: 'home' as const,
          params: {
            axes: ['leftPlunger'],
          },
        },
      ],
      false
    )
    await waitFor(() => expect(props.proceed).toHaveBeenCalled())
  })
  it('calls setShowErrorMessage when chainRunCommands fails', async () => {
    props = {
      ...props,
      chainRunCommands: vi
        .fn()
        .mockImplementationOnce(() => Promise.reject(new Error('error'))),
      flowType: FLOWS.ATTACH,
    }
    render(props)
    const exit = screen.getByRole('button', { name: 'Results_exit' })
    fireEvent.click(exit)
    expect(props.chainRunCommands).toHaveBeenCalledWith(
      [
        {
          commandType: 'loadPipette' as const,
          params: {
            pipetteName: 'p1000_single_flex',
            pipetteId: 'abc',
            mount: 'left',
          },
        },
        {
          commandType: 'home' as const,
          params: {
            axes: ['leftPlunger'],
          },
        },
      ],
      false
    )
    await waitFor(() => expect(props.setShowErrorMessage).toHaveBeenCalled())
  })
  it('renders the correct information when pipette wizard is a fail for attach flow', async () => {
    props = {
      ...props,
      attachedPipettes: { left: null, right: null },
      flowType: FLOWS.ATTACH,
    }
    render(props)
    screen.getByText('Unable to detect pipette')
    expect(screen.getByLabelText('ot-alert')).toHaveStyle(
      `color: ${String(COLORS.red50)}`
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await act(() => pipettePromise)
    expect(mockRefetchInstruments).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard is a success for detach flow', () => {
    props = {
      ...props,
      attachedPipettes: { left: null, right: null },
      currentStepIndex: 6,
      flowType: FLOWS.DETACH,
    }
    render(props)
    screen.getByText('Pipette successfully detached')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    const exit = screen.getByRole('button', { name: 'Results_exit' })
    fireEvent.click(exit)
    expect(props.handleCleanUpAndClose).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard is a fail for detach flow', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL still attached')
    expect(screen.getByLabelText('ot-alert')).toHaveStyle(
      `color: ${String(COLORS.red50)}`
    )
    screen.getByRole('button', { name: 'Try again' })
  })
  it('renders the error exit as disabled when is Fetching is true', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
      isFetching: true,
    }
    render(props)
    expect(
      screen.getByRole('button', { name: 'Results_errorExit' })
    ).toBeDisabled()
  })
  it('does not render error exit when is on device', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
      isOnDevice: true,
      isFetching: true,
    }
    expect(
      screen.queryByRole('button', { name: 'Results_errorExit' })
    ).not.toBeInTheDocument()
  })
  it('renders the correct information when pipette wizard is a failing to detach before 96 channel attach flow', async () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
      selectedPipette: NINETY_SIX_CHANNEL,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL still attached')
    expect(screen.getByLabelText('ot-alert')).toHaveStyle(
      `color: ${String(COLORS.red50)}`
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await act(() => pipettePromise)
  })
  it('renders the correct information when pipette wizard is a success for detaching before 96 channel attach flow', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
      attachedPipettes: { left: null, right: null },
      selectedPipette: NINETY_SIX_CHANNEL,
    }
    render(props)
    screen.getByText('All pipettes successfully detached')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    screen.getByText('attach pipette')
    const exit = screen.getByRole('button', { name: 'Results_exit' })
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard succeeds to calibrate in attach flow 96-channel', () => {
    props = {
      ...props,
      flowType: FLOWS.CALIBRATE,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully calibrated')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    fireEvent.click(screen.getByRole('button', { name: 'Results_exit' }))
    expect(props.proceed).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard succeeds to calibrate in attach flow 96-channel with pipette attached initially ', () => {
    props = {
      ...props,
      flowType: FLOWS.CALIBRATE,
      currentStepIndex: 9,
      totalStepCount: 9,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully calibrated')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    fireEvent.click(screen.getByRole('button', { name: 'Results_exit' }))
    expect(props.handleCleanUpAndClose).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard succeeds to calibrate in attach flow single mount', () => {
    props = {
      ...props,
      flowType: FLOWS.CALIBRATE,
      currentStepIndex: 5,
      totalStepCount: 5,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully calibrated')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    fireEvent.click(screen.getByRole('button', { name: 'Results_exit' }))
    expect(props.handleCleanUpAndClose).toHaveBeenCalled()
  })
  it('renders the correct information for success pipette cal on ODD', () => {
    props = {
      ...props,
      isOnDevice: true,
      hasCalData: true,
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully recalibrated')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
    fireEvent.click(screen.getByRole('button'))
    expect(props.proceed).toHaveBeenCalled()
  })
  it('renders the correct information when pipette wizard is a fail for attach flow on ODD', async () => {
    props = {
      ...props,
      attachedPipettes: { left: null, right: null },
      flowType: FLOWS.ATTACH,
      isOnDevice: true,
    }
    render(props)
    screen.getByText('Unable to detect pipette')
    expect(screen.getByLabelText('ot-alert')).toHaveStyle(
      `color: ${String(COLORS.red50)}`
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await act(() => pipettePromise)
    expect(mockRefetchInstruments).toHaveBeenCalled()
  })
  it('renders the correct information when pipette succceeds to attach during run setup', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
      requiredPipette: {
        id: 'mockId',
        pipetteName: 'p1000_single_flex',
        mount: LEFT,
      },
    }
    render(props)
    screen.getByText('Flex 1-Channel 1000 μL successfully attached')
    const image = screen.getByRole('img', { name: 'Success Icon' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/icon_success.png'
    )
    screen.getByRole('img', { name: 'Success Icon' })
  })
  it('renders the correct information when attaching wrong pipette for run setup', async () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
      requiredPipette: {
        id: 'mockId',
        pipetteName: 'p50_multi_flex',
        mount: LEFT,
      },
    }
    render(props)
    screen.getByText('Wrong instrument installed')
    screen.getByText('Install Flex 8-Channel 50 μL instead')
    fireEvent.click(screen.getByRole('button', { name: 'Detach and retry' }))
    await act(() => pipettePromise)
    expect(mockRefetchInstruments).toHaveBeenCalled()
  })
})
