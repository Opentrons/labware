import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

import {
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  POSITION_FIXED,
  COLORS,
  RadioButton,
} from '@opentrons/components'

import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { getTopPortalEl } from '/app/App/portal'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'

import type { Dispatch } from 'react'
import type {
  ChangeTipOptions,
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
} from '../types'

interface ChangeTipProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
}

export function ChangeTip(props: ChangeTipProps): JSX.Element {
  const { onBack, state, dispatch } = props
  const { t } = useTranslation('quick_transfer')
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()

  const allowedChangeTipOptions: ChangeTipOptions[] = ['once']
  if (
    state.sourceWells.length * state.pipette.channels <= 96 &&
    state.destinationWells.length * state.pipette.channels <= 96
  ) {
    allowedChangeTipOptions.push('always')
  }
  if (
    state.path === 'single' &&
    state.transferType === 'distribute' &&
    state.destinationWells.length <= 96
  ) {
    allowedChangeTipOptions.push('perDest')
  } else if (state.path === 'single' && state.sourceWells.length <= 96) {
    allowedChangeTipOptions.push('perSource')
  }

  const [
    selectedChangeTipOption,
    setSelectedChangeTipOption,
  ] = useState<ChangeTipOptions>(state.changeTip)

  const handleClickSave = (): void => {
    if (selectedChangeTipOption !== state.changeTip) {
      dispatch({
        type: 'SET_CHANGE_TIP',
        changeTip: selectedChangeTipOption,
      })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          setting: 'ChangeTip',
        },
      })
    }
    onBack()
  }
  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={t('change_tip')}
        buttonText={t('save')}
        onClickBack={onBack}
        onClickButton={handleClickSave}
        buttonIsDisabled={selectedChangeTipOption == null}
      />
      <Flex
        marginTop={SPACING.spacing120}
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        {allowedChangeTipOptions.map(option => (
          <RadioButton
            key={option}
            isSelected={selectedChangeTipOption === option}
            onChange={() => {
              setSelectedChangeTipOption(option)
            }}
            buttonValue={option}
            buttonLabel={t(`${option}`)}
          />
        ))}
      </Flex>
    </Flex>,
    getTopPortalEl()
  )
}
