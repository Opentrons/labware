import { useState } from 'react'
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

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
} from '../types'
import type { CutoutConfig } from '@opentrons/shared-data'

interface TipDropLocationProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
}

export function TipDropLocation(props: TipDropLocationProps): JSX.Element {
  const { onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []

  const tipDropLocationOptions = deckConfig.filter(
    cutoutConfig =>
      WASTE_CHUTE_FIXTURES.includes(cutoutConfig.cutoutFixtureId) ||
      TRASH_BIN_ADAPTER_FIXTURE === cutoutConfig.cutoutFixtureId
  )

  // add trash bin in A3 if no trash or waste chute configured
  if (tipDropLocationOptions.length === 0) {
    tipDropLocationOptions.push({
      cutoutId: 'cutoutA3',
      cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
    })
  }

  const [
    selectedTipDropLocation,
    setSelectedTipDropLocation,
  ] = useState<CutoutConfig>(state.dropTipLocation)

  const handleClickSave = (): void => {
    if (selectedTipDropLocation.cutoutId !== state.dropTipLocation.cutoutId) {
      dispatch({
        type: 'SET_DROP_TIP_LOCATION',
        location: selectedTipDropLocation,
      })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          setting: 'TipDropLocation',
        },
      })
    }
    onBack()
  }
  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={t('tip_drop_location')}
        buttonText={t('save')}
        onClickBack={onBack}
        onClickButton={handleClickSave}
        buttonIsDisabled={selectedTipDropLocation == null}
      />
      <Flex
        marginTop={SPACING.spacing120}
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        {tipDropLocationOptions.map(option => (
          <RadioButton
            key={option.cutoutId}
            isSelected={selectedTipDropLocation.cutoutId === option.cutoutId}
            onChange={() => {
              setSelectedTipDropLocation(option)
            }}
            buttonValue={option.cutoutId}
            buttonLabel={t(
              `${
                option.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
                  ? 'trashBin'
                  : 'wasteChute'
              }_location`,
              {
                slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[option.cutoutId],
              }
            )}
          />
        ))}
      </Flex>
    </Flex>,
    getTopPortalEl()
  )
}
