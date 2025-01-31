import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  RadioButton,
  POSITION_FIXED,
  SPACING,
} from '@opentrons/components'

import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { getTopPortalEl } from '/app/App/portal'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ACTIONS } from '../constants'

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
  FlowRateKind,
} from '../types'
import { i18n } from '/app/i18n'
import { NumericalKeyboard } from '/app/atoms/SoftwareKeyboard'

interface AirGapProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind
}

export function AirGap(props: AirGapProps): JSX.Element {
  const { kind, onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const keyboardRef = useRef(null)

  const [airGapEnabled, setAirGapEnabled] = useState<boolean>(
    kind === 'aspirate'
      ? state.airGapAspirate != null
      : state.airGapDispense != null
  )
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [volume, setVolume] = useState<number | null>(
    kind === 'aspirate'
      ? state.airGapAspirate ?? null
      : state.airGapDispense ?? null
  )

  const action =
    kind === 'aspirate'
      ? ACTIONS.SET_AIR_GAP_ASPIRATE
      : ACTIONS.SET_AIR_GAP_DISPENSE

  const enableAirGapDisplayItems = [
    {
      option: true,
      description: t('option_enabled'),
      onClick: () => {
        setAirGapEnabled(true)
      },
    },
    {
      option: false,
      description: t('option_disabled'),
      onClick: () => {
        setAirGapEnabled(false)
      },
    },
  ]

  const handleClickBackOrExit = (): void => {
    currentStep > 1 ? setCurrentStep(currentStep - 1) : onBack()
  }

  const handleClickSaveOrContinue = (): void => {
    if (currentStep === 1) {
      if (airGapEnabled) {
        setCurrentStep(currentStep + 1)
      } else {
        dispatch({ type: action, volume: undefined })
        trackEventWithRobotSerial({
          name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
          properties: {
            setting: `AirGap_${kind}`,
          },
        })
        onBack()
      }
    } else if (currentStep === 2) {
      dispatch({ type: action, volume: volume ?? undefined })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          setting: `AirGap_${kind}`,
        },
      })
      onBack()
    }
  }

  const setSaveOrContinueButtonText =
    airGapEnabled && currentStep < 2 ? t('shared:continue') : t('shared:save')

  const maxPipetteVolume = Object.values(state.pipette.liquids)[0].maxVolume
  const tipVolume = Object.values(state.tipRack.wells)[0].totalLiquidVolume

  // dispense air gap is performed whenever a tip is on its way to the trash, so
  // we can have the max be at the max tip capacity
  let maxAvailableCapacity = Math.min(maxPipetteVolume, tipVolume)

  // for aspirate, air gap behaves differently depending on the path
  if (kind === 'aspirate') {
    if (state.path === 'single') {
      // for a single path, air gap capacity is just the difference between the
      // pipette/tip capacity and the volume per well
      maxAvailableCapacity =
        Math.min(maxPipetteVolume, tipVolume) - state.volume
    } else if (state.path === 'multiAspirate') {
      // an aspirate air gap for multi aspirate will aspirate an air gap
      // after each aspirate action, so we need to halve the available capacity for single path
      // to get the amount available, assuming a min of 2 aspirates per dispense
      maxAvailableCapacity =
        (Math.min(maxPipetteVolume, tipVolume) - 2 * state.volume) / 2
    } else {
      // aspirate air gap for multi dispense occurs once per asprirate and
      // available volume is max capacity - volume*3 assuming a min of 2 dispenses
      // per aspirate plus 1x the volume for disposal
      maxAvailableCapacity =
        Math.min(maxPipetteVolume, tipVolume) - state.volume * 3
    }
  }

  const volumeRange = { min: 1, max: Math.floor(maxAvailableCapacity) }
  let volumeError = null
  if (volumeRange.min > volumeRange.max) {
    volumeError = t('air_gap_capacity_error')
  } else if (
    volume !== null &&
    (volume < volumeRange.min || volume > volumeRange.max)
  ) {
    volumeError = t(`value_out_of_range`, {
      min: volumeRange.min,
      max: volumeRange.max,
    })
  }

  let buttonIsDisabled = false
  if (currentStep === 2) {
    buttonIsDisabled = volume == null || volumeError != null
  }

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={
          kind === 'aspirate'
            ? t('air_gap_after_aspirating')
            : t('air_gap_before_dispensing')
        }
        buttonText={i18n.format(setSaveOrContinueButtonText, 'capitalize')}
        onClickBack={handleClickBackOrExit}
        onClickButton={handleClickSaveOrContinue}
        top={SPACING.spacing8}
        buttonIsDisabled={buttonIsDisabled}
      />
      {currentStep === 1 ? (
        <Flex
          marginTop={SPACING.spacing120}
          flexDirection={DIRECTION_COLUMN}
          padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
          gridGap={SPACING.spacing4}
          width="100%"
        >
          {enableAirGapDisplayItems.map(displayItem => (
            <RadioButton
              key={displayItem.description}
              isSelected={airGapEnabled === displayItem.option}
              onChange={displayItem.onClick}
              buttonValue={displayItem.description}
              buttonLabel={displayItem.description}
              radioButtonType="large"
            />
          ))}
        </Flex>
      ) : null}
      {currentStep === 2 ? (
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
              value={volume}
              title={t('air_gap_volume_µL')}
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
              initialValue={String(volume ?? '')}
              onChange={e => {
                setVolume(Number(e))
              }}
            />
          </Flex>
        </Flex>
      ) : null}
    </Flex>,
    getTopPortalEl()
  )
}
