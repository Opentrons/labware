import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LEFT } from '@opentrons/shared-data'
import { mockPipetteInfo } from '/app/redux/pipettes/__fixtures__'
import { CheckPipettesButton } from '../CheckPipettesButton'
import { ConfirmPipette } from '../ConfirmPipette'

import type { ComponentProps } from 'react'
import type {
  PipetteModelSpecs,
  PipetteNameSpecs,
} from '@opentrons/shared-data'
import type { PipetteOffsetCalibration } from '/app/redux/calibration/types'
import type { LevelingVideo } from '../LevelPipette'

vi.mock('../CheckPipettesButton')
vi.mock('../LevelPipette', async importOriginal => {
  const actual = await importOriginal<typeof LevelingVideo>()
  return {
    ...actual,
    LevelingVideo: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof ConfirmPipette>) => {
  return renderWithProviders(<ConfirmPipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_ACTUAL_PIPETTE = {
  ...mockPipetteInfo.pipetteSpecs,
  model: 'model',
  tipLength: {
    value: 20,
  },
} as PipetteModelSpecs

const MOCK_ACTUAL_PIPETTE_EIGHT_CHANNEL = {
  channels: 8,
  name: 'p10_multi',
} as PipetteModelSpecs

const MOCK_WANTED_PIPETTE = {
  displayName: 'P300 8-Channel GEN2',
  displayCategory: 'GEN2',
  defaultAspirateFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  defaultDispenseFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  defaultBlowOutFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  channels: 8,
  minVolume: 20,
  maxVolume: 300,
  smoothieConfigs: {
    stepsPerMM: 3200,
    homePosition: 155.75,
    travelDistance: 60,
  },
  defaultTipracks: [
    'opentrons/opentrons_96_tiprack_300ul/1',
    'opentrons/opentrons_96_filtertiprack_200ul/1',
  ],
  name: 'p300_multi_gen2',
} as PipetteNameSpecs

describe('ConfirmPipette', () => {
  let props: ComponentProps<typeof ConfirmPipette>

  it('Should detach a pipette successfully', () => {
    props = {
      robotName: 'otie',
      success: true,
      attachedWrong: false,
      wantedPipette: null,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: 'P10',
      displayCategory: 'GEN1',
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Successfully detached pipette!')
    const btn = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(btn)
    expect(props.exit).toHaveBeenCalled()
  })

  it('Should detect a pipette if still attached when detaching', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: false,
      wantedPipette: null,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: 'P10',
      displayCategory: 'GEN1',
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Pipette still detected')
    screen.getByText(
      'Check again to ensure that pipette is unplugged and entirely detached from the robot.'
    )

    const leaveAttachedBtn = screen.getByRole('button', {
      name: 'Leave attached',
    })
    fireEvent.click(leaveAttachedBtn)
    expect(props.exit).toBeCalled()

    const tryAgainBtn = screen.getByRole('button', { name: 'try again' })
    fireEvent.click(tryAgainBtn)
    expect(props.tryAgain).toBeCalled()
  })

  it('Should show incorrect pipette attached for single channel when the actual pipette is different', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: true,
      wantedPipette: MOCK_WANTED_PIPETTE,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Incorrect pipette attached')
    screen.getByText(
      'The attached does not match the P300 8-Channel GEN2 you had originally selected.'
    )
    const detachTryAgainBtn = screen.getByRole('button', {
      name: 'Detach and try again',
    })
    fireEvent.click(detachTryAgainBtn)
    expect(props.tryAgain).toBeCalled()
    const useAttachedBtn = screen.getByRole('button', {
      name: 'Use attached pipette',
    })
    fireEvent.click(useAttachedBtn)
    expect(props.setWrongWantedPipette).toHaveBeenCalled()
  })

  it('Should show success modal when incorrect pipette attached but user accepts it', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: true,
      wantedPipette: MOCK_ACTUAL_PIPETTE,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: MOCK_ACTUAL_PIPETTE,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Pipette attached!')
    screen.getByText('P10 Single-Channel is now ready to use.')
    const btn = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(btn)
    expect(props.exit).toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Calibrate pipette offset' })
    ).not.toBeInTheDocument()
  })

  it('renders incorrect pipette attached for eight channel when the actual pipette is different', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: true,
      wantedPipette: MOCK_WANTED_PIPETTE,
      actualPipette: MOCK_ACTUAL_PIPETTE_EIGHT_CHANNEL,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Incorrect pipette attached')
    screen.getByText(
      'The attached does not match the P300 8-Channel GEN2 you had originally selected.'
    )
    const detachTryAgainBtn = screen.getByRole('button', {
      name: 'Detach and try again',
    })
    fireEvent.click(detachTryAgainBtn)
    expect(props.tryAgain).toBeCalled()
    const useAttachedBtn = screen.getByRole('button', {
      name: 'Use attached pipette',
    })
    fireEvent.click(useAttachedBtn)
    expect(props.setWrongWantedPipette).toHaveBeenCalled()
  })

  it('Should show pipette leveling modal when incorrect pipette attached for 8 channel but user accepts it', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: true,
      wantedPipette: MOCK_WANTED_PIPETTE,
      actualPipette: MOCK_WANTED_PIPETTE as PipetteModelSpecs,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: MOCK_WANTED_PIPETTE,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Level the pipette')
    const continueBtn = screen.getByRole('button', { name: 'Confirm level' })
    fireEvent.click(continueBtn)
    expect(props.setConfirmPipetteLevel).toHaveBeenCalled()
  })

  it('renders the success modal when the confirmPipetteLevel is true when attaching an incorrect 8 channel pipette with no pipetteoffset data', () => {
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: true,
      wantedPipette: MOCK_WANTED_PIPETTE,
      actualPipette: MOCK_WANTED_PIPETTE as PipetteModelSpecs,
      actualPipetteOffset: null,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: MOCK_WANTED_PIPETTE,
      confirmPipetteLevel: true,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Pipette attached!')
    screen.getByText('P300 8-Channel GEN2 is now ready to use.')
    const btn = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(btn)
    expect(props.exit).toHaveBeenCalled()
    const pocBtn = screen.getByRole('button', {
      name: 'Calibrate pipette offset',
    })
    fireEvent.click(pocBtn)
    expect(props.toCalibrationDashboard).toBeCalled()
  })

  it('Should show unable to detect pipette when a pipette is not connected', () => {
    vi.mocked(CheckPipettesButton).mockReturnValue(
      <div>mock re-check connection</div>
    )
    props = {
      robotName: 'otie',
      success: false,
      attachedWrong: false,
      wantedPipette: MOCK_WANTED_PIPETTE,
      actualPipette: null,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Unable to detect P300 8-Channel GEN2')
    screen.getByText(
      'Make sure to press the white connector tab in as far as you can, and that you feel it connect with the pipette.'
    )

    const cancelAttachmentBtn = screen.getByRole('button', {
      name: 'Cancel attachment',
    })
    fireEvent.click(cancelAttachmentBtn)
    expect(props.exit).toBeCalled()

    screen.getByText('mock re-check connection')
  })

  it('Should attach a pipette successfully', () => {
    props = {
      robotName: 'otie',
      success: true,
      attachedWrong: false,
      wantedPipette: MOCK_ACTUAL_PIPETTE,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: {} as PipetteOffsetCalibration,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Pipette attached!')
    screen.getByText('P10 Single-Channel is now ready to use.')
    const btn = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(btn)
    expect(props.exit).toHaveBeenCalled()
  })

  it('Should attach a pipette successfully when there is no POC data', () => {
    props = {
      robotName: 'otie',
      success: true,
      attachedWrong: false,
      wantedPipette: MOCK_ACTUAL_PIPETTE,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      actualPipetteOffset: null,
      displayName: '',
      displayCategory: null,
      tryAgain: vi.fn(),
      exit: vi.fn(),
      toCalibrationDashboard: vi.fn(),
      mount: LEFT,
      setWrongWantedPipette: vi.fn(),
      wrongWantedPipette: null,
      confirmPipetteLevel: false,
      nextStep: vi.fn(),
      setConfirmPipetteLevel: vi.fn(),
      isDisabled: false,
    }

    render(props)
    screen.getByText('Pipette attached!')
    screen.getByText('P10 Single-Channel is now ready to use.')
    const btn = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(btn)
    expect(props.exit).toHaveBeenCalled()

    const pocBtn = screen.getByRole('button', {
      name: 'Calibrate pipette offset',
    })
    fireEvent.click(pocBtn)
    expect(props.toCalibrationDashboard).toBeCalled()
  })
  it('should render buttons as disabled on success when robot is in motion/isDisabled is true', () => {
    props = {
      ...props,
      success: true,
      isDisabled: true,
    }
    render(props)
    expect(screen.getByRole('button', { name: 'exit' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Calibrate pipette offset' })
    ).toBeDisabled()
  })
  it('should render buttons as disabled on failure when robot is in motion/isDisabled is true', () => {
    props = {
      ...props,
      success: false,
      isDisabled: true,
    }
    render(props)
    expect(
      screen.getByRole('button', { name: 'Leave attached' })
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'try again' })).toBeDisabled()
  })
})
