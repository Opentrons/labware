import { useState, useEffect } from 'react'
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
  TEXT_ALIGN_LEFT,
  TEXT_ALIGN_RIGHT,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_FIXTURES,
} from '@opentrons/shared-data'

import { ANALYTICS_QUICK_TRANSFER_ADVANCED_SETTINGS_TAB } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ACTIONS } from '../constants'
import { useToaster } from '/app/organisms/ToasterOven'
import { FlowRateEntry } from './FlowRate'
import { PipettePath } from './PipettePath'
import { TipPositionEntry } from './TipPosition'
import { Mix } from './Mix'
import { Delay } from './Delay'
import { TouchTip } from './TouchTip'
import { AirGap } from './AirGap'
import { BlowOut } from './BlowOut'

import type { Dispatch } from 'react'
import type {
  QuickTransferSummaryAction,
  QuickTransferSummaryState,
} from '../types'
interface QuickTransferAdvancedSettingsProps {
  state: QuickTransferSummaryState
  dispatch: Dispatch<QuickTransferSummaryAction>
}

export function QuickTransferAdvancedSettings(
  props: QuickTransferAdvancedSettingsProps
): JSX.Element | null {
  const { state, dispatch } = props
  const { t, i18n } = useTranslation(['quick_transfer', 'shared'])
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null)
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const { makeSnackbar } = useToaster()

  useEffect(() => {
    trackEventWithRobotSerial({
      name: ANALYTICS_QUICK_TRANSFER_ADVANCED_SETTINGS_TAB,
      properties: {},
    })
  }, [])

  function getBlowoutValueCopy(): string | undefined {
    if (state.blowOut === 'dest_well') {
      return t('blow_out_into_destination_well')
    } else if (state.blowOut === 'source_well') {
      return t('blow_out_into_source_well')
    } else if (
      state.blowOut != null &&
      state.blowOut.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
    ) {
      return t('blow_out_into_trash_bin')
    } else if (
      state.blowOut != null &&
      WASTE_CHUTE_FIXTURES.includes(state.blowOut.cutoutFixtureId)
    ) {
      return t('blow_out_into_waste_chute')
    }
  }

  let pipettePathValue: string = ''
  if (state.path === 'single') {
    pipettePathValue = t('pipette_path_single')
  } else if (state.path === 'multiAspirate') {
    pipettePathValue = t('pipette_path_multi_aspirate')
  } else if (state.path === 'multiDispense') {
    pipettePathValue = t('pipette_path_multi_dispense_volume_blowout', {
      volume: state.disposalVolume,
      blowOutLocation: getBlowoutValueCopy(),
    })
  }

  const destinationLabwareDef =
    state.destination === 'source' ? state.source : state.destination
  const sourceIsReservoir =
    state.source.metadata.displayCategory === 'reservoir'
  const destIsReservoir =
    destinationLabwareDef.metadata.displayCategory === 'reservoir'

  const baseSettingsItems = [
    {
      option: 'aspirate_flow_rate',
      copy: t('aspirate_flow_rate'),
      value: t('flow_rate_value', { flow_rate: state.aspirateFlowRate }),
      enabled: true,
      onClick: () => {
        setSelectedSetting('aspirate_flow_rate')
      },
    },
    {
      option: 'dispense_flow_rate',
      copy: t('dispense_flow_rate'),
      value: t('flow_rate_value', { flow_rate: state.dispenseFlowRate }),
      enabled: true,
      onClick: () => {
        setSelectedSetting('dispense_flow_rate')
      },
    },
    {
      option: 'pipette_path',
      copy: t('pipette_path'),
      value: pipettePathValue,
      enabled: state.transferType !== 'transfer',
      onClick: () => {
        if (state.transferType !== 'transfer') {
          setSelectedSetting('pipette_path')
        } else {
          makeSnackbar(t('advanced_setting_disabled') as string)
        }
      },
    },
  ]

  const aspirateSettingsItems = [
    {
      option: 'tip_position',
      copy: t('tip_position'),
      value:
        state.tipPositionAspirate !== null
          ? t('tip_position_value', { position: state.tipPositionAspirate })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('aspirate_tip_position')
      },
    },
    {
      option: 'pre_wet_tip',
      copy: t('pre_wet_tip'),
      value: state.preWetTip ? t('option_enabled') : '',
      enabled: true,
      onClick: () => {
        dispatch({
          type: ACTIONS.SET_PRE_WET_TIP,
          preWetTip: !state.preWetTip,
        })
      },
    },
    {
      option: 'aspirate_mix',
      copy: t('mix'),
      value:
        state.mixOnAspirate !== undefined
          ? t('mix_value', {
              volume: state.mixOnAspirate?.mixVolume,
              reps: state.mixOnAspirate?.repititions,
            })
          : '',
      enabled:
        state.transferType === 'transfer' ||
        state.transferType === 'distribute',
      onClick: () => {
        if (
          state.transferType === 'transfer' ||
          state.transferType === 'distribute'
        ) {
          setSelectedSetting('aspirate_mix')
        } else {
          makeSnackbar(t('advanced_setting_disabled') as string)
        }
      },
    },
    {
      option: 'aspirate_delay',
      copy: t('delay'),
      value:
        state.delayAspirate !== undefined
          ? t('delay_value', {
              delay: state.delayAspirate.delayDuration,
              position: state.delayAspirate.positionFromBottom,
            })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('aspirate_delay')
      },
    },
    {
      option: 'aspirate_touch_tip',
      copy: t('touch_tip'),
      value:
        state.touchTipAspirate !== undefined
          ? t('touch_tip_value', { position: state.touchTipAspirate })
          : '',
      enabled: !sourceIsReservoir,
      onClick: () => {
        // disable for reservoir
        if (!sourceIsReservoir) {
          setSelectedSetting('aspirate_touch_tip')
        } else {
          makeSnackbar(t('advanced_setting_disabled') as string)
        }
      },
    },
    {
      option: 'aspirate_air_gap',
      copy: t('air_gap'),
      value:
        state.airGapAspirate !== undefined
          ? t('air_gap_value', { volume: state.airGapAspirate })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('aspirate_air_gap')
      },
    },
  ]

  const dispenseSettingsItems = [
    {
      option: 'dispense_tip_position',
      copy: t('tip_position'),
      value:
        state.tipPositionDispense !== undefined
          ? t('tip_position_value', { position: state.tipPositionDispense })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('dispense_tip_position')
      },
    },
    {
      option: 'dispense_mix',
      copy: t('mix'),
      value:
        state.mixOnDispense !== undefined
          ? t('mix_value', {
              volume: state.mixOnDispense?.mixVolume,
              reps: state.mixOnDispense?.repititions,
            })
          : '',
      enabled:
        state.transferType === 'transfer' ||
        state.transferType === 'consolidate',
      onClick: () => {
        if (
          state.transferType === 'transfer' ||
          state.transferType === 'consolidate'
        ) {
          setSelectedSetting('dispense_mix')
        } else {
          makeSnackbar(t('advanced_setting_disabled') as string)
        }
      },
    },
    {
      option: 'dispense_delay',
      copy: t('delay'),
      value:
        state.delayDispense !== undefined
          ? t('delay_value', {
              delay: state.delayDispense.delayDuration,
              position: state.delayDispense.positionFromBottom,
            })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('dispense_delay')
      },
    },
    {
      option: 'dispense_touch_tip',
      copy: t('touch_tip'),
      value:
        state.touchTipDispense !== undefined
          ? t('touch_tip_value', { position: state.touchTipDispense })
          : '',
      enabled: !destIsReservoir,
      onClick: () => {
        if (!destIsReservoir) {
          setSelectedSetting('dispense_touch_tip')
        } else {
          makeSnackbar(t('advanced_setting_disabled') as string)
        }
      },
    },
    {
      option: 'dispense_air_gap',
      copy: t('air_gap'),
      value:
        state.airGapDispense !== undefined
          ? t('air_gap_value', { volume: state.airGapDispense })
          : '',
      enabled: true,
      onClick: () => {
        setSelectedSetting('dispense_air_gap')
      },
    },
    {
      option: 'dispense_blow_out',
      copy: t('blow_out'),
      value:
        state.transferType === 'distribute'
          ? t('disabled')
          : i18n.format(getBlowoutValueCopy(), 'capitalize'),
      enabled: state.transferType !== 'distribute',
      onClick: () => {
        if (state.transferType === 'distribute') {
          makeSnackbar(t('advanced_setting_disabled') as string)
        } else {
          setSelectedSetting('dispense_blow_out')
        }
      },
    },
  ]

  return (
    <Flex
      gridGap={SPACING.spacing40}
      flexDirection={DIRECTION_COLUMN}
      marginTop="12rem"
    >
      {/* Base Settings */}
      <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
        {selectedSetting == null
          ? baseSettingsItems.map(displayItem => (
              <ListItem
                type="noActive"
                key={displayItem.option}
                onClick={displayItem.onClick}
              >
                <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
                  <StyledText
                    css={TYPOGRAPHY.level4HeaderSemiBold}
                    width="20rem"
                    color={displayItem.enabled ? COLORS.black90 : COLORS.grey50}
                  >
                    {displayItem.copy}
                  </StyledText>
                  <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                    <StyledText
                      css={TYPOGRAPHY.level4HeaderRegular}
                      color={
                        displayItem.enabled ? COLORS.grey60 : COLORS.grey50
                      }
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

      {/* Aspirate Settings */}
      <Flex gridGap={SPACING.spacing16} flexDirection={DIRECTION_COLUMN}>
        {selectedSetting === null ? (
          <StyledText
            css={TYPOGRAPHY.level4HeaderSemiBold}
            color={COLORS.grey60}
            textAlign={TEXT_ALIGN_LEFT}
          >
            {t('aspirate_settings')}
          </StyledText>
        ) : null}
        <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
          {selectedSetting === null
            ? aspirateSettingsItems.map(displayItem => (
                <ListItem
                  type="noActive"
                  key={displayItem.option}
                  onClick={displayItem.onClick}
                >
                  <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
                    <StyledText
                      css={TYPOGRAPHY.level4HeaderSemiBold}
                      width="20rem"
                      color={
                        displayItem.enabled ? COLORS.black90 : COLORS.grey50
                      }
                    >
                      {displayItem.copy}
                    </StyledText>
                    <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                      <StyledText
                        css={TYPOGRAPHY.level4HeaderRegular}
                        color={
                          displayItem.enabled ? COLORS.grey60 : COLORS.grey50
                        }
                        textAlign={TEXT_ALIGN_RIGHT}
                      >
                        {displayItem.value !== ''
                          ? displayItem.value
                          : t('option_disabled')}
                      </StyledText>

                      {displayItem.option !== 'pre_wet_tip' ? (
                        <Icon
                          name="more"
                          size={SIZE_2}
                          color={
                            displayItem.enabled ? COLORS.black90 : COLORS.grey50
                          }
                        />
                      ) : null}
                    </Flex>
                  </Flex>
                </ListItem>
              ))
            : null}
          {selectedSetting === 'aspirate_tip_position' ? (
            <TipPositionEntry
              kind={'aspirate'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'aspirate_mix' ? (
            <Mix
              kind={'aspirate'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'aspirate_delay' ? (
            <Delay
              kind={'aspirate'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'aspirate_touch_tip' ? (
            <TouchTip
              kind={'aspirate'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'aspirate_air_gap' ? (
            <AirGap
              kind={'aspirate'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
        </Flex>
      </Flex>

      {/* Dispense Settings */}
      <Flex gridGap={SPACING.spacing16} flexDirection={DIRECTION_COLUMN}>
        {selectedSetting === null ? (
          <StyledText
            css={TYPOGRAPHY.level4HeaderSemiBold}
            color={COLORS.grey60}
            textAlign={TEXT_ALIGN_LEFT}
          >
            {t('dispense_settings')}
          </StyledText>
        ) : null}
        <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
          {selectedSetting === null
            ? dispenseSettingsItems.map(displayItem => (
                <ListItem
                  type="noActive"
                  key={displayItem.option}
                  onClick={displayItem.onClick}
                >
                  <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
                    <StyledText
                      css={TYPOGRAPHY.level4HeaderSemiBold}
                      width="20rem"
                      color={
                        displayItem.enabled ? COLORS.black90 : COLORS.grey50
                      }
                    >
                      {displayItem.copy}
                    </StyledText>
                    <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                      <StyledText
                        css={TYPOGRAPHY.level4HeaderRegular}
                        color={
                          displayItem.enabled ? COLORS.grey60 : COLORS.grey50
                        }
                        textAlign={TEXT_ALIGN_RIGHT}
                      >
                        {displayItem.value !== ''
                          ? displayItem.value
                          : t('option_disabled')}
                      </StyledText>
                      <Icon
                        name="more"
                        size={SIZE_2}
                        color={
                          displayItem.enabled ? COLORS.black90 : COLORS.grey50
                        }
                      />
                    </Flex>
                  </Flex>
                </ListItem>
              ))
            : null}
          {selectedSetting === 'dispense_tip_position' ? (
            <TipPositionEntry
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'dispense_mix' ? (
            <Mix
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'dispense_delay' ? (
            <Delay
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'dispense_touch_tip' ? (
            <TouchTip
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'dispense_air_gap' ? (
            <AirGap
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
          {selectedSetting === 'dispense_blow_out' ? (
            <BlowOut
              kind={'dispense'}
              state={state}
              dispatch={dispatch}
              onBack={() => {
                setSelectedSetting(null)
              }}
            />
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}
