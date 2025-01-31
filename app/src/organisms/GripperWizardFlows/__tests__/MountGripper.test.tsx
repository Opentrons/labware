import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { instrumentsResponseFixture } from '@opentrons/api-client'
import { i18n } from '/app/i18n'

import { MountGripper } from '../MountGripper'
import { GRIPPER_FLOW_TYPES } from '../constants'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')

const mockRunId = 'fakeRunId'

describe('MountGripper', () => {
  let mockRefetch: any
  let mockProceed: any
  let mockChainRunCommands: any
  let mockSetErrorMessage: any

  const render = (props: Partial<ComponentProps<typeof MountGripper>> = {}) => {
    return renderWithProviders(
      <MountGripper
        maintenanceRunId={mockRunId}
        flowType={GRIPPER_FLOW_TYPES.ATTACH}
        proceed={mockProceed}
        attachedGripper={props?.attachedGripper ?? null}
        chainRunCommands={mockChainRunCommands}
        isRobotMoving={false}
        goBack={() => null}
        errorMessage={null}
        setErrorMessage={mockSetErrorMessage}
        {...props}
      />,
      { i18nInstance: i18n }
    )
  }

  beforeEach(() => {
    mockProceed = vi.fn()
    mockChainRunCommands = vi.fn()
    mockRefetch = vi.fn(() => Promise.resolve())
  })

  it('clicking confirm calls proceed if attached gripper', async () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: instrumentsResponseFixture,
    } as any)
    render()
    const button = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(button)
    await waitFor(() => expect(mockProceed).toHaveBeenCalled())
  })

  it('clicking confirm shows unable to detect if no gripper attached', async () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: null,
    } as any)
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockProceed).not.toHaveBeenCalled())
    expect(
      await screen.findByText('Unable to detect Gripper')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(mockProceed).not.toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockProceed).not.toHaveBeenCalled())
  })

  it('renders correct text', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      refetch: mockRefetch,
      data: null,
    } as any)
    render()
    screen.getByText('Connect and secure Flex Gripper')
    screen.getByText(
      'Attach the gripper to the robot by aligning the connector and pressing to ensure a secure connection. Hold the gripper in place. Tighten the top gripper screw first, and the bottom screw second. Then test that the gripper is securely attached by gently pulling it side to side.'
    )
  })
})
