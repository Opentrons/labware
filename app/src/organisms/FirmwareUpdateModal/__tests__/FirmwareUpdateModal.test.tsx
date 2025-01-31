import { act, screen, waitFor } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  useInstrumentsQuery,
  useSubsystemUpdateQuery,
  useUpdateSubsystemMutation,
} from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { FirmwareUpdateModal } from '..'

import type { ComponentProps } from 'react'
import type {
  BadPipette,
  PipetteData,
  SubsystemUpdateProgressData,
} from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof FirmwareUpdateModal>) => {
  return renderWithProviders(<FirmwareUpdateModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('FirmwareUpdateModal', () => {
  let props: ComponentProps<typeof FirmwareUpdateModal>
  const refetch = vi.fn(() => Promise.resolve())
  const updateSubsystem = vi.fn(() => Promise.resolve())
  beforeEach(() => {
    props = {
      proceed: vi.fn(),
      description: 'A firmware update is required, instrument is updating',
      subsystem: 'pipette_left',
      proceedDescription: 'Firmware is up to date.',
      isOnDevice: true,
    }
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            subsystem: 'pipette_left',
            ok: false,
          } as BadPipette,
        ],
      },
      refetch,
    } as any)
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: 'done',
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    vi.mocked(useUpdateSubsystemMutation).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: 'in progress',
          updateProgress: 20,
        } as any,
      } as SubsystemUpdateProgressData,
      updateSubsystem,
    } as any)
  })
  it('initially renders a spinner and text', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            subsystem: 'pipette_left',
            ok: true,
          } as PipetteData,
        ],
      },
      refetch,
    } as any)
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: null,
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    render(props)
    screen.getByLabelText('spinner')
    screen.getByText('Checking for updates...')
  })
  it('calls proceed if no update is needed', async () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            subsystem: 'pipette_left',
            ok: true,
          } as PipetteData,
        ],
      },
      refetch,
    } as any)
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: null,
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    //  TODO(jr, 2/27/24): had to specify shouldAdvanceTime
    //  due to vitest breaking user-events
    //   https://github.com/testing-library/react-testing-library/issues/1197
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(props)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    screen.getByText('Firmware is up to date.')
    screen.getByLabelText('check')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    await waitFor(() => expect(props.proceed).toHaveBeenCalled())
  })
  it('does not render text until instrument update status is known', () => {
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: undefined,
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: undefined,
      refetch,
    } as any)
    render(props)
    expect(
      screen.queryByText(
        'A firmware update is required, instrument is updating'
      )
    ).not.toBeInTheDocument()
  })
  it('calls update subsystem if update is needed', () => {
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
      data: {
        data: {
          id: 'update id',
          updateStatus: 'in progress',
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    vi.useFakeTimers()
    render(props)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    screen.getByText('A firmware update is required, instrument is updating')
    screen.getByLabelText('spinner')
    expect(updateSubsystem).toHaveBeenCalled()
  })
  it('calls refetch instruments and then proceed once update is complete', async () => {
    //  TODO(jr, 2/27/24): had to specify shouldAdvanceTime
    //  due to vitest breaking user-events
    //   https://github.com/testing-library/react-testing-library/issues/1197
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(props)
    screen.getByText('A firmware update is required, instrument is updating')
    await waitFor(() => expect(refetch).toHaveBeenCalled())
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    await waitFor(() => expect(props.proceed).toHaveBeenCalled())
  })
})
