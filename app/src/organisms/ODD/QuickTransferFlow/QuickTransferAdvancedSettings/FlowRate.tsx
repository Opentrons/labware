import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import {
  LOW_VOLUME_PIPETTES,
  getTipTypeFromTipRackDefinition,
} from '@opentrons/shared-data'
import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'

import { getTopPortalEl } from '/app/App/portal'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { NumericalKeyboard } from '/app/atoms/SoftwareKeyboard'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'

import { ACTIONS } from '../constants'

import type { Dispatch } from 'react'
import type { SupportedTip } from '@opentrons/shared-data'
import type {
  QuickTransferSummaryState,
  QuickTransferSummaryAction,
  FlowRateKind,
} from '../types'

interface FlowRateEntryProps {
  onBack: () => void
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
  kind: FlowRateKind
}

export function FlowRateEntry(props: FlowRateEntryProps): JSX.Element {
  const { onBack, state, dispatch, kind } = props
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const keyboardRef = useRef(null)

  const [flowRate, setFlowRate] = useState<number>(
    kind === 'aspirate' ? state.aspirateFlowRate : state.dispenseFlowRate
  )

  // TODO (ba, 2024-07-02): use the pipette name once we add it to the v2 spec
  let pipetteName = state.pipette.model
  if (state.pipette.channels === 1) {
    pipetteName = pipetteName + `_single_flex`
  } else if (state.pipette.channels === 8) {
    pipetteName = pipetteName + `_multi_flex`
  } else {
    pipetteName = pipetteName + `_96`
  }

  // use lowVolume for volumes lower than 5ml
  const liquidSpecs = state.pipette.liquids
  const tipType = getTipTypeFromTipRackDefinition(state.tipRack)
  const flowRatesForSupportedTip: SupportedTip | undefined =
    state.volume < 5 &&
    `lowVolumeDefault` in liquidSpecs &&
    LOW_VOLUME_PIPETTES.includes(pipetteName)
      ? liquidSpecs.lowVolumeDefault.supportedTips[tipType]
      : liquidSpecs.default.supportedTips[tipType]
  const minFlowRate = 1
  const maxFlowRate = Math.floor(flowRatesForSupportedTip?.uiMaxFlowRate ?? 0)

  const flowRateAction =
    kind === 'aspirate'
      ? ACTIONS.SET_ASPIRATE_FLOW_RATE
      : ACTIONS.SET_DISPENSE_FLOW_RATE

  let headerCopy: string = ''
  let textEntryCopy: string = ''
  if (kind === 'aspirate') {
    headerCopy = t('aspirate_flow_rate')
    textEntryCopy = t('aspirate_flow_rate_µL')
  } else if (kind === 'dispense') {
    headerCopy = t('dispense_flow_rate')
    textEntryCopy = t('dispense_flow_rate_µL')
  }

  const handleClickSave = (): void => {
    // the button will be disabled if this values is null
    if (flowRate != null) {
      dispatch({
        type: flowRateAction,
        rate: flowRate,
      })
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
        properties: {
          setting: `FlowRate_${kind}`,
        },
      })
    }
    onBack()
  }

  const error =
    flowRate != null && (flowRate < minFlowRate || flowRate > maxFlowRate)
      ? t(`value_out_of_range`, {
          min: minFlowRate,
          max: maxFlowRate,
        })
      : null

  return createPortal(
    <Flex position={POSITION_FIXED} backgroundColor={COLORS.white} width="100%">
      <ChildNavigation
        header={headerCopy}
        buttonText={i18n.format(t('shared:save'), 'capitalize')}
        onClickBack={onBack}
        onClickButton={handleClickSave}
        top={SPACING.spacing8}
        buttonIsDisabled={error != null || flowRate == null}
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
            type="number"
            value={flowRate}
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
            initialValue={String(flowRate ?? '')}
            onChange={e => {
              setFlowRate(Number(e))
            }}
          />
        </Flex>
      </Flex>
    </Flex>,
    getTopPortalEl()
  )
}
