import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useCurrentSubsystemUpdateQuery } from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { mockLeftSpecs } from '/app/redux/pipettes/__fixtures__'
import { handlePipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import { AboutPipetteSlideout } from '../AboutPipetteSlideout'
import { FlexPipetteCard } from '../FlexPipetteCard'
import { ChoosePipette } from '/app/organisms/PipetteWizardFlows/ChoosePipette'
import { useDropTipWizardFlows } from '/app/organisms/DropTipWizardFlows'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type { PipetteData } from '@opentrons/api-client'

vi.mock('/app/organisms/PipetteWizardFlows')
vi.mock('/app/organisms/PipetteWizardFlows/ChoosePipette')
vi.mock('../AboutPipetteSlideout')
vi.mock('/app/organisms/DropTipWizardFlows')
vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof FlexPipetteCard>) => {
  return renderWithProviders(<FlexPipetteCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

let mockDTWizToggle: Mock

describe('FlexPipetteCard', () => {
  let props: ComponentProps<typeof FlexPipetteCard>
  mockDTWizToggle = vi.fn()
  beforeEach(() => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      attachedPipette: {
        instrumentType: 'pipette',
        instrumentName: 'pipette',
        subsystem: 'pipette_left',
        mount: 'left',
        instrumentModel: 'p50_single_v3.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          channels: 1,
          min_volume: 5,
          max_volume: 50,
          calibratedOffset: {
            offset: { x: 1, y: 2, z: 3 },
            source: 'default',
            last_modified: '12/2/4',
          },
        },
      } as PipetteData,
      mount: 'left',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    vi.mocked(useCurrentSubsystemUpdateQuery).mockReturnValue({
      data: undefined,
    } as any)
    vi.mocked(useDropTipWizardFlows).mockReturnValue({
      enableDTWiz: mockDTWizToggle,
      showDTWiz: false,
    } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct info when gripper is attached', () => {
    render(props)
    screen.getByText('left Mount')
    screen.getByText('Left Pipette')
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    screen.getByText('Recalibrate pipette')
    screen.getByText('Detach pipette')
    screen.getByText('Drop tips')
    screen.getByText('About pipette')
  })
  it('renders correct info when 96 channel is attached', () => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      attachedPipette: {
        instrumentType: 'pipette',
        instrumentName: 'p1000_96',
        subsystem: 'pipette_left',
        mount: 'left',
        instrumentModel: 'p50_single_v3.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          channels: 1,
          min_volume: 5,
          max_volume: 50,
          calibratedOffset: {
            offset: { x: 1, y: 2, z: 3 },
            source: 'default',
            last_modified: '12/2/4',
          },
        },
      } as PipetteData,
      mount: 'left',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('Both Mounts')
    screen.getByText('Left Pipette')
  })
  it('renders recalibrate banner when no calibration data is present', () => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      attachedPipette: {
        instrumentType: 'pipette',
        instrumentName: 'pipette',
        subsystem: 'pipette_left',
        mount: 'left',
        instrumentModel: 'p50_single_v3.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          channels: 1,
          min_volume: 5,
          max_volume: 50,
        },
      } as PipetteData,
      mount: 'left',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }

    render(props)
    screen.getByText('Calibration needed.')
    screen.getByText('Calibrate now')
  })

  it('renders recalibrate banner without calibrate now when no calibration data is present and e-stop is pressed', () => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      attachedPipette: {
        instrumentType: 'pipette',
        instrumentName: 'pipette',
        subsystem: 'pipette_left',
        mount: 'left',
        instrumentModel: 'p50_single_v3.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          channels: 1,
          min_volume: 5,
          max_volume: 50,
        },
      } as PipetteData,
      mount: 'left',
      isRunActive: false,
      isEstopNotDisengaged: true,
    }

    render(props)
    screen.getByText('Calibration needed.')
  })

  it('opens the about pipette slideout when button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const aboutPipetteButton = screen.getByText('About pipette')
    fireEvent.click(aboutPipetteButton)
    expect(vi.mocked(AboutPipetteSlideout)).toHaveBeenCalled()
  })
  it('renders choose pipette modal when attach button is pressed', () => {
    props = {
      mount: 'left',
      attachedPipette: null,
      pipetteModelSpecs: null,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const attachPipetteButton = screen.getByText('Attach pipette')
    fireEvent.click(attachPipetteButton)
    expect(vi.mocked(ChoosePipette)).toHaveBeenCalled()
  })
  it('renders wizard flow when recalibrate button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const recalibratePipetteButton = screen.getByText('Recalibrate pipette')
    fireEvent.click(recalibratePipetteButton)
    expect(vi.mocked(handlePipetteWizardFlows)).toHaveBeenCalled()
  })
  it('renders wizard flow when detach button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /InstrumentCard_overflowMenu/i,
    })
    fireEvent.click(overflowButton)
    const dropTipButton = screen.getByText('Detach pipette')
    fireEvent.click(dropTipButton)
    expect(vi.mocked(handlePipetteWizardFlows)).toHaveBeenCalled()
  })
  it('renders drop tip wizard when drop tip button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /InstrumentCard_overflowMenu/i,
    })
    fireEvent.click(overflowButton)
    const dropTipButton = screen.getByText('Drop tips')
    fireEvent.click(dropTipButton)
    expect(vi.mocked(mockDTWizToggle)).toHaveBeenCalled()
  })
  it('renders firmware update needed state if pipette is bad', () => {
    props = {
      attachedPipette: {
        ok: false,
      } as any,
      mount: 'left',
      pipetteModelSpecs: null,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('Left mount')
    screen.getByText('Instrument attached')
    screen.getByText(
      `Instrument firmware update needed. Start the update on the robot's touchscreen.`
    )
  })
  it('renders firmware update in progress state if gripper is bad and update in progress', () => {
    vi.mocked(useCurrentSubsystemUpdateQuery).mockReturnValue({
      data: { data: { updateProgress: 50 } as any },
    } as any)
    props = {
      attachedPipette: {
        ok: false,
      } as any,
      mount: 'left',
      pipetteModelSpecs: null,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('Left mount')
    screen.getByText('Instrument attached')
    screen.getByText('Firmware update in progress...')
  })
})
