import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { instrumentsResponseFixture } from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { UnmountGripper } from '../UnmountGripper'
import { GRIPPER_FLOW_TYPES } from '../constants'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')

const mockRunId = 'fakeRunId'
describe('UnmountGripper', () => {
  let mockRefetch: any
  let mockGoBack: any
  let mockProceed: any
  let mockChainRunCommands: any
  let mockSetErrorMessage: any
  const render = (
    props: Partial<ComponentProps<typeof UnmountGripper>> = {}
  ) => {
    return renderWithProviders(
      <UnmountGripper
        maintenanceRunId={mockRunId}
        flowType={GRIPPER_FLOW_TYPES.ATTACH}
        proceed={mockProceed}
        attachedGripper={props?.attachedGripper ?? null}
        chainRunCommands={mockChainRunCommands}
        isRobotMoving={false}
        goBack={mockGoBack}
        errorMessage={null}
        setErrorMessage={mockSetErrorMessage}
        {...props}
      />,
      { i18nInstance: i18n }
    )
  }

  beforeEach(() => {
    mockGoBack = vi.fn()
    mockProceed = vi.fn()
    mockChainRunCommands = vi.fn(() => Promise.resolve())
    mockRefetch = vi.fn(() => Promise.resolve())
  })

  it('clicking confirm proceed calls home and proceed if gripper detached', async () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: null,
    } as any)
    render({ attachedGripper: null })
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(continueButton)
    await waitFor(() => {
      expect(mockChainRunCommands).toHaveBeenCalledWith(
        [{ commandType: 'home', params: {} }],
        true
      )
    })
    expect(mockProceed).toHaveBeenCalled()
  })

  it('clicking go back calls back', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: instrumentsResponseFixture,
    } as any)
    render()
    const back = screen.getByLabelText('back')
    fireEvent.click(back)
    expect(mockGoBack).toHaveBeenCalled()
  })

  it('renders correct text', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: instrumentsResponseFixture,
    } as any)
    render()
    screen.getByText('Loosen screws and detach Flex Gripper')
    screen.getByText(
      'Hold the gripper in place and loosen the top gripper screw first. After that move onto the bottom screw. (The screws are captive and will not come apart from the gripper.) Then carefully remove the gripper.'
    )
  })
})
