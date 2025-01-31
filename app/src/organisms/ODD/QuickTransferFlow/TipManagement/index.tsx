import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  ListItem,
  SIZE_2,
  SPACING,
  TEXT_ALIGN_RIGHT,
  TYPOGRAPHY,
} from '@opentrons/components'
import { TRASH_BIN_ADAPTER_FIXTURE } from '@opentrons/shared-data'

import { ANALYTICS_QUICK_TRANSFER_TIP_MANAGEMENT_TAB } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ChangeTip } from './ChangeTip'
import { TipDropLocation } from './TipDropLocation'

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryAction,
  QuickTransferSummaryState,
} from '../types'

interface TipManagementProps {
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
}

export function TipManagement(props: TipManagementProps): JSX.Element | null {
  const { state, dispatch } = props
  const { t } = useTranslation(['quick_transfer', 'shared'])
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null)

  useEffect(() => {
    trackEventWithRobotSerial({
      name: ANALYTICS_QUICK_TRANSFER_TIP_MANAGEMENT_TAB,
      properties: {},
    })
  }, [])

  const displayItems = [
    {
      option: t('change_tip'),
      value: t(`${state.changeTip}`),
      onClick: () => {
        setSelectedSetting('change_tip')
      },
    },
    {
      option: t('tip_drop_location'),
      value: t(
        `${
          state.dropTipLocation.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
            ? 'trashBin'
            : 'wasteChute'
        }`
      ),
      onClick: () => {
        setSelectedSetting('tip_drop_location')
      },
    },
  ]

  return (
    <Flex
      gridGap={SPACING.spacing8}
      flexDirection={DIRECTION_COLUMN}
      marginTop="192px"
    >
      {selectedSetting == null
        ? displayItems.map(displayItem => (
            <ListItem
              type="noActive"
              key={displayItem.option}
              onClick={displayItem.onClick}
            >
              <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
                <LegacyStyledText
                  css={TYPOGRAPHY.level4HeaderSemiBold}
                  width="20rem"
                >
                  {displayItem.option}
                </LegacyStyledText>
                <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                  <LegacyStyledText
                    css={TYPOGRAPHY.level4HeaderRegular}
                    color={COLORS.grey60}
                    textAlign={TEXT_ALIGN_RIGHT}
                  >
                    {displayItem.value}
                  </LegacyStyledText>
                  <Icon name="more" size={SIZE_2} />
                </Flex>
              </Flex>
            </ListItem>
          ))
        : null}
      {selectedSetting === 'change_tip' ? (
        <ChangeTip
          state={state}
          dispatch={dispatch}
          onBack={() => {
            setSelectedSetting(null)
          }}
        />
      ) : null}
      {selectedSetting === 'tip_drop_location' ? (
        <TipDropLocation
          state={state}
          dispatch={dispatch}
          onBack={() => {
            setSelectedSetting(null)
          }}
        />
      ) : null}
    </Flex>
  )
}
