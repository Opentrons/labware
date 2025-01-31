import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SelectTips } from '../SelectTips'
import { RECOVERY_MAP } from '../../constants'
import { TipSelectionModal } from '../TipSelectionModal'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('../TipSelectionModal')
vi.mock('../TipSelection')

const render = (props: ComponentProps<typeof SelectTips>) => {
  return renderWithProviders(<SelectTips {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SelectTips', () => {
  let props: ComponentProps<typeof SelectTips>
  let mockGoBackPrevStep: Mock
  let mockhandleMotionRouting: Mock
  let mockProceedNextStep: Mock
  let mockPickUpTips: Mock

  beforeEach(() => {
    mockGoBackPrevStep = vi.fn()
    mockhandleMotionRouting = vi.fn(() => Promise.resolve())
    mockProceedNextStep = vi.fn()
    mockPickUpTips = vi.fn(() => Promise.resolve())

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        goBackPrevStep: mockGoBackPrevStep,
        handleMotionRouting: mockhandleMotionRouting,
        proceedNextStep: mockProceedNextStep,
      } as any,
      recoveryCommands: {
        pickUpTips: mockPickUpTips,
      } as any,
      failedPipetteUtils: {
        failedPipetteInfo: {
          data: {
            channels: 8,
          },
        } as any,
      } as any,
      failedLabwareUtils: {
        selectedTipLocations: { A1: null },
        areTipsSelected: true,
        failedLabwareLocations: {
          displayNameNewLoc: null,
          displayNameCurrentLoc: 'A1',
        },
      } as any,
    }

    vi.mocked(TipSelectionModal).mockReturnValue(
      <div>MOCK TIP SELECTION MODAL</div>
    )
  })

  it('renders the TipSelectionModal when showTipSelectModal is true', () => {
    render(props)

    fireEvent.click(screen.getAllByText('Change location')[0])

    expect(screen.getByText('MOCK TIP SELECTION MODAL')).toBeInTheDocument()
  })

  it('calls the correct routeUpdateActions and recoveryCommands in the correct order when the primary button is clicked', async () => {
    const handleMotionRoutingMock = vi.fn(() => Promise.resolve())
    const pickUpTipsMock = vi.fn(() => Promise.resolve())
    const proceedNextStepMock = vi.fn()

    const mockRecoveryCommands = {
      pickUpTips: pickUpTipsMock,
    } as any

    const mockRouteUpdateActions = {
      handleMotionRouting: handleMotionRoutingMock,
      proceedNextStep: proceedNextStepMock,
    } as any

    render({
      ...props,
      recoveryCommands: mockRecoveryCommands,
      routeUpdateActions: mockRouteUpdateActions,
    })

    const primaryBtn = screen.getAllByText('Pick up tips')[0]
    fireEvent.click(primaryBtn)

    await waitFor(() => {
      expect(handleMotionRoutingMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(handleMotionRoutingMock).toHaveBeenCalledWith(
        true,
        RECOVERY_MAP.ROBOT_PICKING_UP_TIPS.ROUTE
      )
    })
    await waitFor(() => {
      expect(pickUpTipsMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(proceedNextStepMock).toHaveBeenCalledTimes(1)
    })

    expect(handleMotionRoutingMock.mock.invocationCallOrder[0]).toBeLessThan(
      pickUpTipsMock.mock.invocationCallOrder[0]
    )

    await waitFor(() => {
      expect(pickUpTipsMock.mock.invocationCallOrder[0]).toBeLessThan(
        proceedNextStepMock.mock.invocationCallOrder[0]
      )
    })
  })

  it('calls goBackPrevStep when the secondary button is clicked', () => {
    render(props)

    fireEvent.click(screen.getAllByText('Go back')[0])

    expect(mockGoBackPrevStep).toHaveBeenCalled()
  })

  it('renders expected banner text', () => {
    render(props)

    screen.getByText(
      "It's best to replace tips and select the last location used for tip pickup."
    )
  })

  it('disables the tertiary button when the pipette has 96 channels', () => {
    props = {
      ...props,
      failedPipetteUtils: {
        failedPipetteInfo: {
          data: {
            channels: 96,
          },
        } as any,
      } as any,
    }
    render(props)

    const tertiaryBtn = screen.getAllByRole('button', {
      name: 'Change location',
    })
    expect(tertiaryBtn[0]).toBeDisabled()
  })

  it('disables the primary button if tips are not selected', () => {
    props = {
      ...props,
      failedLabwareUtils: {
        selectedTipLocations: null,
        areTipsSelected: false,
        failedLabwareLocations: {
          displayNameNewLoc: null,
          displayNameCurrentLoc: '',
        },
      } as any,
    }

    render(props)

    const primaryBtn = screen.getAllByRole('button', {
      name: 'Pick up tips',
    })

    expect(primaryBtn[0]).toBeDisabled()
  })

  it('does not render the tertiary button if a partial tip config is used', () => {
    const mockFailedPipetteUtils = {
      failedPipetteInfo: {
        data: {
          channels: 8,
        },
      } as any,
      isPartialTipConfigValid: true,
      relevantActiveNozzleLayout: {
        activeNozzles: ['H1', 'G1'],
        startingNozzle: 'A1',
        config: 'column',
      },
    } as any

    render({ ...props, failedPipetteUtils: mockFailedPipetteUtils })

    const tertiaryBtn = screen.queryByRole('button', {
      name: 'Change location',
    })
    expect(tertiaryBtn).not.toBeInTheDocument()
  })

  it('renders alternative banner text if partial tip config is used', () => {
    const mockFailedPipetteUtils = {
      failedPipetteInfo: {
        data: {
          channels: 8,
        },
      } as any,
      isPartialTipConfigValid: true,
      relevantActiveNozzleLayout: {
        activeNozzles: ['H1', 'G1'],
        startingNozzle: 'A1',
        config: 'column',
      },
    } as any

    render({ ...props, failedPipetteUtils: mockFailedPipetteUtils })

    screen.getByText(
      'Replace tips and select the last location used for partial tip pickup.'
    )
  })
})
