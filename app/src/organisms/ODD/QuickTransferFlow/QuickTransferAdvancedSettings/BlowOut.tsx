import { useState } from 'react'
import isEqual from 'lodash/isEqual'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  POSITION_FIXED,
  RadioButton,
  COLORS,
} from '@opentrons/components'
import {
  WASTE_CHUTE_FIXTURES,
  FLEX_SINGLE_SLOT_BY_CUTOUT_ID,
  TRASH_BIN_ADAPTER_FIXTURE,
} from '@opentrons/shared-data'
import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { getTopPortalEl } from '/app/App/portal'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { ACTIONS } from '../constants'

import type { Dispatch } from 'react'
import type { DeckConfiguration } from '@opentrons/shared-data'
import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
  FlowRateKind,
  BlowOutLocation,
  TransferType,
} from '../types'
import { i18n } from '/app/i18n'

interface BlowOutProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind
}

export const useBlowOutLocationOptions = (
  deckConfig: DeckConfiguration,
  transferType: TransferType
): Array<{ location: BlowOutLocation; description: string }> => {
  const { t } = useTranslation('quick_transfer')

  const trashLocations = deckConfig.filter(
    cutoutConfig =>
      WASTE_CHUTE_FIXTURES.includes(cutoutConfig.cutoutFixtureId) ||
      TRASH_BIN_ADAPTER_FIXTURE === cutoutConfig.cutoutFixtureId
  )

  // add trash bin in A3 if no trash or waste chute configured
  if (trashLocations.length === 0) {
    trashLocations.push({
      cutoutId: 'cutoutA3',
      cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
    })
  }
  const blowOutLocationItems: Array<{
    location: BlowOutLocation
    description: string
  }> = []
  if (transferType !== 'distribute') {
    blowOutLocationItems.push({
      location: 'dest_well',
      description: t('blow_out_destination_well'),
    })
  }
  if (transferType !== 'consolidate') {
    blowOutLocationItems.push({
      location: 'source_well',
      description: t('blow_out_source_well'),
    })
  }
  trashLocations.forEach(location => {
    blowOutLocationItems.push({
      location,
      description:
        location.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
          ? t('trashBin_location', {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[location.cutoutId],
            })
          : t('wasteChute_location', {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[location.cutoutId],
            }),
    })
  })
  return blowOutLocationItems
}

export function BlowOut(props: BlowOutProps): JSX.Element {
  const { onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []

  const [isBlowOutEnabled, setisBlowOutEnabled] = useState<boolean>(
    state.blowOut != null
  )
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [blowOutLocation, setBlowOutLocation] = useState<
    BlowOutLocation | undefined
  >(state.blowOut)

  const enableBlowOutDisplayItems = [
    {
      option: true,
      description: t('option_enabled'),
      onClick: () => {
        setisBlowOutEnabled(true)
      },
    },
    {
      option: false,
      description: t('option_disabled'),
      onClick: () => {
        setisBlowOutEnabled(false)
      },
    },
  ]

  const blowOutLocationItems = useBlowOutLocationOptions(
    deckConfig,
    state.transferType
  )

  const handleClickBackOrExit = (): void => {
    currentStep > 1 ? setCurrentStep(currentStep - 1) : onBack()
  }

  const handleClickSaveOrContinue = (): void => {
    if (currentStep === 1) {
      if (!isBlowOutEnabled) {
        dispatch({
          type: ACTIONS.SET_BLOW_OUT,
          location: undefined,
        })
        trackEventWithRobotSerial({
          name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
          properties: {
            settting: `BlowOut`,
          },
        })
        onBack()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      dispatch({
        type: ACTIONS.SET_BLOW_OUT,
        location: blowOutLocation,
      })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          settting: `BlowOut`,
        },
      })
      onBack()
    }
  }

  const saveOrContinueButtonText =
    isBlowOutEnabled && currentStep < 2
      ? t('shared:continue')
      : t('shared:save')

  let buttonIsDisabled = false
  if (currentStep === 2) {
    buttonIsDisabled = blowOutLocation == null
  }

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={t('blow_out_after_dispensing')}
        buttonText={i18n.format(saveOrContinueButtonText, 'capitalize')}
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
          {enableBlowOutDisplayItems.map(displayItem => (
            <RadioButton
              key={displayItem.description}
              isSelected={isBlowOutEnabled === displayItem.option}
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
          marginTop={SPACING.spacing120}
          flexDirection={DIRECTION_COLUMN}
          padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
          gridGap={SPACING.spacing4}
          width="100%"
        >
          {blowOutLocationItems.map(blowOutLocationItem => (
            <RadioButton
              key={blowOutLocationItem.description}
              isSelected={
                isEqual(blowOutLocation, blowOutLocationItem.location) ||
                blowOutLocation === blowOutLocationItem.location
              }
              onChange={() => {
                setBlowOutLocation(
                  blowOutLocationItem.location as BlowOutLocation
                )
              }}
              buttonValue={blowOutLocationItem.description}
              buttonLabel={blowOutLocationItem.description}
              radioButtonType="large"
            />
          ))}
        </Flex>
      ) : null}
    </Flex>,
    getTopPortalEl()
  )
}
