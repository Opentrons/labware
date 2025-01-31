import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SIZE_2,
  SPACING,
  StyledText,
  TEXT_ALIGN_RIGHT,
  TYPOGRAPHY,
} from '@opentrons/components'
import { FlowRateEntry } from './FlowRate'
import { PipettePath } from './PipettePath'

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryAction,
  QuickTransferSummaryState,
} from '../types'

interface BaseSettingsProps {
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
}

export function BaseSettings(props: BaseSettingsProps): JSX.Element | null {
  const { state, dispatch } = props
  const { t } = useTranslation(['quick_transfer', 'shared'])
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null)

  let pipettePath: string = ''
  if (state.path === 'single') {
    pipettePath = t('pipette_path_single')
  } else if (state.path === 'multiAspirate') {
    pipettePath = t('pipette_path_multi_aspirate')
  } else if (state.path === 'multiDispense') {
    pipettePath = t('pipette_path_multi_dispense')
  }

  const displayItems = [
    {
      option: t('aspirate_flow_rate'),
      value: t('flow_rate_value', { flow_rate: state.aspirateFlowRate }),
      enabled: true,
      onClick: () => {
        setSelectedSetting('aspirate_flow_rate')
      },
    },
    {
      option: t('dispense_flow_rate'),
      value: t('flow_rate_value', { flow_rate: state.dispenseFlowRate }),
      enabled: true,
      onClick: () => {
        setSelectedSetting('dispense_flow_rate')
      },
    },
    {
      option: t('pipette_path'),
      value: pipettePath,
      enabled: state.transferType !== 'transfer',
      onClick: () => {
        if (state.transferType !== 'transfer')
          setSelectedSetting('pipette_path')
      },
    },
  ]

  return (
    <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
      {selectedSetting == null
        ? displayItems.map(displayItem => (
            <ListItem
              type="noActive"
              key={displayItem.option}
              onClick={displayItem.onClick}
            >
              <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
                <StyledText css={TYPOGRAPHY.level4HeaderSemiBold} width="20rem">
                  {displayItem.option}
                </StyledText>
                <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                  <StyledText
                    css={TYPOGRAPHY.level4HeaderRegular}
                    color={COLORS.grey60}
                    textAlign={TEXT_ALIGN_RIGHT}
                  >
                    {displayItem.value}
                  </StyledText>
                  {displayItem.enabled ? (
                    <Icon name="more" size={SIZE_2} />
                  ) : null}
                </Flex>
              </Flex>
            </ListItem>
          ))
        : null}
      {selectedSetting === 'aspirate_flow_rate' ? (
        <FlowRateEntry
          kind="aspirate"
          state={state}
          dispatch={dispatch}
          onBack={() => {
            setSelectedSetting(null)
          }}
        />
      ) : null}
      {selectedSetting === 'dispense_flow_rate' ? (
        <FlowRateEntry
          kind="dispense"
          state={state}
          dispatch={dispatch}
          onBack={() => {
            setSelectedSetting(null)
          }}
        />
      ) : null}
      {selectedSetting === 'pipette_path' ? (
        <PipettePath
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
