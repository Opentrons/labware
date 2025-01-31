import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  POSITION_FIXED,
  SPACING,
} from '@opentrons/components'

import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { getTopPortalEl } from '/app/App/portal'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { NumericalKeyboard } from '/app/atoms/SoftwareKeyboard'
import { ACTIONS } from '../constants'
import { createPortal } from 'react-dom'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
  FlowRateKind,
} from '../types'

interface TipPositionEntryProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind // TODO: rename flowRateKind to be generic
}

export function TipPositionEntry(props: TipPositionEntryProps): JSX.Element {
  const { onBack, state, dispatch, kind } = props
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const keyboardRef = useRef(null)

  const [tipPosition, setTipPosition] = useState<number>(
    kind === 'aspirate' ? state.tipPositionAspirate : state.tipPositionDispense
  )

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

  // the maxiumum allowed position is 2x the height of the well
  const tipPositionRange = { min: 1, max: Math.floor(wellHeight * 2) } // TODO: set this based on range

  const textEntryCopy: string = t('distance_bottom_of_well_mm')
  const tipPositionAction =
    kind === 'aspirate'
      ? ACTIONS.SET_ASPIRATE_TIP_POSITION
      : ACTIONS.SET_DISPENSE_TIP_POSITION

  const handleClickSave = (): void => {
    // the button will be disabled if this values is null
    if (tipPosition != null) {
      dispatch({
        type: tipPositionAction,
        position: tipPosition,
      })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          setting: `TipPosition_${kind}`,
        },
      })
    }
    onBack()
  }

  const error =
    tipPosition != null &&
    (tipPosition < tipPositionRange.min || tipPosition > tipPositionRange.max)
      ? t(`value_out_of_range`, {
          min: Math.floor(tipPositionRange.min),
          max: Math.floor(tipPositionRange.max),
        })
      : null

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={
          kind === 'aspirate'
            ? t('aspirate_tip_position')
            : t('dispense_tip_position')
        }
        buttonText={i18n.format(t('shared:save'), 'capitalize')}
        onClickBack={onBack}
        onClickButton={handleClickSave}
        top={SPACING.spacing8}
        buttonIsDisabled={error != null || tipPosition == null}
      />
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
            type="text"
            value={tipPosition}
            title={textEntryCopy}
            error={error}
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
            initialValue={String(tipPosition ?? '')}
            onChange={e => {
              setTipPosition(Number(e))
            }}
          />
        </Flex>
      </Flex>
    </Flex>,
    getTopPortalEl()
  )
}
