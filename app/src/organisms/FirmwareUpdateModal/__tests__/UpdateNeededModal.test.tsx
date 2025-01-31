import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  useInstrumentsQuery,
  useSubsystemUpdateQuery,
  useUpdateSubsystemMutation,
} from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { UpdateNeededModal } from '../UpdateNeededModal'
import { UpdateInProgressModal } from '../UpdateInProgressModal'
import { UpdateResultsModal } from '../UpdateResultsModal'

import type { ComponentProps } from 'react'
import type {
  BadPipette,
  SubsystemUpdateProgressData,
} from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('../UpdateInProgressModal')
vi.mock('../UpdateResultsModal')

const render = (props: ComponentProps<typeof UpdateNeededModal>) => {
  return renderWithProviders(<UpdateNeededModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UpdateNeededModal', () => {
  let props: ComponentProps<typeof UpdateNeededModal>
  const refetch = vi.fn(() => Promise.resolve())
  const updateSubsystem = vi.fn(() =>
    Promise.resolve({
      data: {
        data: {
          id: 'update id',
          updateStatus: 'updating',
          updateProgress: 20,
        } as any,
      },
    })
  )
  beforeEach(() => {
    props = {
      onClose: vi.fn(),
      subsystem: 'pipette_left',
      shouldExit: true,
      setInitiatedSubsystemUpdate: vi.fn(),
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
          updateStatus: 'updating',
        } as any,
      } as SubsystemUpdateProgressData,
    } as any)
    vi.mocked(useUpdateSubsystemMutation).mockReturnValue({
      updateSubsystem,
    } as any)
    vi.mocked(UpdateInProgressModal).mockReturnValue(
      <>Mock Update In Progress Modal</>
    )
    vi.mocked(UpdateResultsModal).mockReturnValue(
      <>Mock Update Results Modal</>
    )
  })
  it('renders update needed info and calles update firmware when button pressed', () => {
    vi.mocked(useSubsystemUpdateQuery).mockReturnValue({} as any)
    render(props)
    //  TODO(jr, 2/27/24): test uses Portal, fix later
    // screen.getByText('Instrument firmware update needed')
    // fireEvent.click(screen.getByText('Update firmware'))
    // expect(updateSubsystem).toHaveBeenCalled()
  })
  //  TODO(jr, 2/27/24): test uses Portal, fix later
  // it('renders the update in progress modal when update is pending', () => {
  //   render(props)
  //   screen.getByText('Mock Update In Progress Modal')
  // })

  //  TODO(jr, 2/27/24): test uses Portal, fix later
  // it('renders the update results modal when update is done', () => {
  //   vi.mocked(useSubsystemUpdateQuery).mockReturnValue({
  //     data: {
  //       data: {
  //         id: 'update id',
  //         updateStatus: 'done',
  //       } as any,
  //     } as SubsystemUpdateProgressData,
  //   } as any)
  //   render(props)
  //   screen.getByText('Mock Update Results Modal')
  // })
})
