import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  POSITION_FIXED,
  COLORS,
  ALIGN_CENTER,
} from '@opentrons/components'
import { getTopPortalEl } from '../../../App/portal'
import { LargeButton } from '../../../atoms/buttons'
import { ChildNavigation } from '../../ChildNavigation'
import { InputField } from '../../../atoms/InputField'
import { ACTIONS } from '../constants'

import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
  FlowRateKind,
} from '../types'
import { i18n } from '../../../i18n'
import { NumericalKeyboard } from '../../../atoms/SoftwareKeyboard'

interface MixProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: React.Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind
}

export function Mix(props: MixProps): JSX.Element {
  const { kind, onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const keyboardRef = React.useRef(null)

  const [selectedOption, setSelectedOption] = React.useState<string>('')
  const [currentStep, setCurrentStep] = React.useState<number>(0)
  const [mixVolume, setMixVolume] = React.useState<number | null>(
    kind === 'aspirate'
      ? state.mixOnAspirate?.mixVolume ?? null
      : kind === 'dispense'
      ? state.mixOnDispense?.mixVolume ?? null
      : null
  )
  const [mixReps, setMixReps] = React.useState<number | null>(
    kind === 'aspirate'
      ? state.mixOnAspirate?.repititions ?? null
      : kind === 'dispense'
      ? state.mixOnDispense?.repititions ?? null
      : null
  )

  let headerCopy: string = ''
  let MixAction:
    | typeof ACTIONS.SET_MIX_ON_ASPIRATE
    | typeof ACTIONS.SET_MIX_ON_DISPENSE
    | null = null

  if (kind === 'aspirate') {
    headerCopy = t('mix_before_aspirating')
    MixAction = ACTIONS.SET_MIX_ON_ASPIRATE
  } else if (kind === 'dispense') {
    headerCopy = t('mix_before_dispensing')
    MixAction = ACTIONS.SET_MIX_ON_DISPENSE
  }

  const displayItems = [
    {
      option: 'Enabled',
      value: t('option_enabled'),
      onClick: () => {
        setSelectedOption('option_enabled')
      },
    },
    {
      option: 'Disabled',
      value: t('option_disabled'),
      onClick: () => {
        setSelectedOption('option_disabled')
      },
    },
  ]

  const flowSteps: string[] = ['enable_mix', 'select_volume', 'select_reps']

  const handleClickBackOrExit = (): void => {
    currentStep > 0 ? setCurrentStep(currentStep - 1) : onBack()
  }

  const handleClickSaveOrContinue = (): void => {
    if (selectedOption === 'Enabled') {
      if (currentStep < flowSteps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        if (MixAction != null && mixVolume != null && mixReps != null) {
          dispatch({
            type: MixAction,
            mixSettings: { mixVolume, repititions: mixReps },
          })
        }
        onBack()
      }
    } else {
      if (MixAction != null) {
        dispatch({
          type: MixAction,
          mixSettings: undefined,
        })
      }
      onBack()
    }
  }

  const setSaveOrContinueButtonText = (): string => {
    return t(
      selectedOption === 'Enabled' && currentStep < flowSteps.length - 1
        ? 'shared:continue'
        : 'shared:save'
    )
  }

  const maxPipetteVolume = Object.values(state.pipette.liquids)[0].maxVolume
  const tipVolume = Object.values(state.tipRack.wells)[0].totalLiquidVolume

  const volumeRange = { min: 1, max: Math.min(maxPipetteVolume, tipVolume) }
  const volumeError =
    mixVolume !== null &&
    (mixVolume < volumeRange.min || mixVolume > volumeRange.max)
      ? t(`value_out_of_range`, {
          min: volumeRange.min,
          max: volumeRange.max,
        })
      : null

  let buttonIsDisabled = selectedOption === ''
  if (flowSteps[currentStep] === 'select_volume') {
    buttonIsDisabled = mixVolume == null || volumeError != null
  } else if (flowSteps[currentStep] === 'select_reps') {
    buttonIsDisabled = mixReps == null
  }

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={headerCopy}
        buttonText={i18n.format(setSaveOrContinueButtonText(), 'capitalize')}
        onClickBack={handleClickBackOrExit}
        onClickButton={handleClickSaveOrContinue}
        top={SPACING.spacing8}
        buttonIsDisabled={volumeError !== null || selectedOption === ''}
      />
      {flowSteps[currentStep] === 'enable_mix' ? (
        <Flex
          marginTop={SPACING.spacing120}
          flexDirection={DIRECTION_COLUMN}
          padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
          gridGap={SPACING.spacing4}
          width="100%"
        >
          {displayItems.map(option => (
            <LargeButton
              key={option.option}
              buttonType={
                selectedOption === option.option ? 'primary' : 'secondary'
              }
              onClick={() => {
                setSelectedOption(option.option)
              }}
              buttonText={option.value}
            />
          ))}
        </Flex>
      ) : null}
      {flowSteps[currentStep] === 'select_volume' ? (
        <Flex
          alignSelf={ALIGN_CENTER}
          gridGap={SPACING.spacing48}
          paddingX={SPACING.spacing40}
          padding={`${SPACING.spacing16} ${SPACING.spacing40} ${SPACING.spacing40}`}
          marginTop="7.75rem" // using margin rather than justify due to content moving with error message
          alignItems={ALIGN_CENTER}
          height="22rem"
        >
          <Flex
            width="30.5rem"
            height="100%"
            gridGap={SPACING.spacing24}
            flexDirection={DIRECTION_COLUMN}
            marginTop={SPACING.spacing68}
          >
            <InputField
              type="number"
              value={mixVolume}
              title={t('mix_volume_µL')}
              error={volumeError}
              readOnly
            />
          </Flex>
          <Flex
            paddingX={SPACING.spacing24}
            height="21.25rem"
            marginTop="7.75rem"
            borderRadius="0"
          >
            <NumericalKeyboard
              keyboardRef={keyboardRef}
              onChange={e => {
                setMixVolume(Number(e))
              }}
            />
          </Flex>
        </Flex>
      ) : null}
      {flowSteps[currentStep] === 'select_reps' ? (
        <Flex
          alignSelf={ALIGN_CENTER}
          gridGap={SPACING.spacing48}
          paddingX={SPACING.spacing40}
          padding={`${SPACING.spacing16} ${SPACING.spacing40} ${SPACING.spacing40}`}
          marginTop="7.75rem" // using margin rather than justify due to content moving with error message
          alignItems={ALIGN_CENTER}
          height="22rem"
        >
          <Flex
            width="30.5rem"
            height="100%"
            gridGap={SPACING.spacing24}
            flexDirection={DIRECTION_COLUMN}
            marginTop={SPACING.spacing68}
          >
            <InputField
              type="number"
              value={mixReps}
              title={t('mix_repetitions')}
              readOnly
            />
          </Flex>
          <Flex
            paddingX={SPACING.spacing24}
            height="21.25rem"
            marginTop="7.75rem"
            borderRadius="0"
          >
            <NumericalKeyboard
              keyboardRef={keyboardRef}
              onChange={e => {
                setMixReps(Number(e))
              }}
            />
          </Flex>
        </Flex>
      ) : null}
    </Flex>,
    getTopPortalEl()
  )
}
