import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  POSITION_FIXED,
  RadioButton,
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

interface DelayProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind
}

export function Delay(props: DelayProps): JSX.Element {
  const { kind, onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const keyboardRef = useRef(null)

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [delayIsEnabled, setDelayIsEnabled] = useState<boolean>(
    kind === 'aspirate'
      ? state.delayAspirate != null
      : state.delayDispense != null
  )
  const [delayDuration, setDelayDuration] = useState<number | null>(
    kind === 'aspirate'
      ? state.delayAspirate?.delayDuration ?? null
      : state.delayDispense?.delayDuration ?? null
  )
  const [position, setPosition] = useState<number | null>(
    kind === 'aspirate'
      ? state.delayAspirate?.positionFromBottom ?? null
      : state.delayDispense?.positionFromBottom ?? null
  )

  const action =
    kind === 'aspirate'
      ? ACTIONS.SET_DELAY_ASPIRATE
      : ACTIONS.SET_DELAY_DISPENSE

  const delayEnabledDisplayItems = [
    {
      option: true,
      description: t('option_enabled'),
      onClick: () => {
        setDelayIsEnabled(true)
      },
    },
    {
      option: false,
      description: t('option_disabled'),
      onClick: () => {
        setDelayIsEnabled(false)
      },
    },
  ]

  const handleClickBackOrExit = (): void => {
    currentStep > 1 ? setCurrentStep(currentStep - 1) : onBack()
  }

  const handleClickSaveOrContinue = (): void => {
    if (currentStep === 1) {
      if (!delayIsEnabled) {
        dispatch({
          type: action,
          delaySettings: undefined,
        })
        trackEventWithRobotSerial({
          name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
          properties: {
            settting: `Delay_${kind}`,
          },
        })
        onBack()
      } else {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      setCurrentStep(3)
    } else {
      if (delayDuration != null && position != null) {
        dispatch({
          type: action,
          delaySettings: {
            delayDuration,
            positionFromBottom: position,
          },
        })
        trackEventWithRobotSerial({
          name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
          properties: {
            settting: `Delay_${kind}`,
          },
        })
      }
      onBack()
    }
  }

  const setSaveOrContinueButtonText =
    delayIsEnabled && currentStep < 3 ? t('shared:continue') : t('shared:save')

  let wellHeight = 1
  if (kind === 'aspirate') {
    wellHeight = Math.max(
      ...state.sourceWells.map(well =>
        state.source != null ? state.source.wells[well].depth : 0
      )
    )
  } else if (kind === 'dispense') {
    const destLabwareDefinition =
      state.destination === 'source' ? state.source : state.destination
    wellHeight = Math.max(
      ...state.destinationWells.map(well =>
        destLabwareDefinition != null
          ? destLabwareDefinition.wells[well].depth
          : 0
      )
    )
  }

  // the maxiumum allowed position for delay is 2x the height of the well
  const positionRange = { min: 1, max: Math.floor(wellHeight * 2) }
  const positionError =
    position != null &&
    (position < positionRange.min || position > positionRange.max)
      ? t(`value_out_of_range`, {
          min: positionRange.min,
          max: positionRange.max,
        })
      : null

  // allow a maximum of 10 digits for delay duration
  const durationRange = { min: 1, max: 9999999999 }
  const durationError =
    delayDuration != null &&
    (delayDuration < durationRange.min || delayDuration > durationRange.max)
      ? t(`value_out_of_range`, {
          min: durationRange.min,
          max: durationRange.max,
        })
      : null
  let buttonIsDisabled = false
  if (currentStep === 2) {
    buttonIsDisabled = delayDuration == null || durationError != null
  } else if (currentStep === 3) {
    buttonIsDisabled = positionError != null || position == null
  }

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={
          kind === 'aspirate'
            ? t('delay_after_aspirating')
            : t('delay_before_dispensing')
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
          {delayEnabledDisplayItems.map(displayItem => (
            <RadioButton
              key={displayItem.description}
              isSelected={delayIsEnabled === displayItem.option}
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
              value={delayDuration}
              error={durationError}
              title={t('delay_duration_s')}
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
              initialValue={String(delayDuration ?? '')}
              onChange={e => {
                setDelayDuration(Number(e))
              }}
            />
          </Flex>
        </Flex>
      ) : null}
      {currentStep === 3 ? (
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
              value={position}
              title={t('delay_position_mm')}
              error={positionError}
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
              initialValue={String(position ?? '')}
              onChange={e => {
                setPosition(Number(e))
              }}
            />
          </Flex>
        </Flex>
      ) : null}
    </Flex>,
    getTopPortalEl()
  )
}
