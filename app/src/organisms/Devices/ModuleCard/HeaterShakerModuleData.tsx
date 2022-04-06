import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  Text,
  JUSTIFY_SPACE_BETWEEN,
  TEXT_TRANSFORM_UPPERCASE,
  COLORS,
  DIRECTION_COLUMN,
  SPACING,
  ALIGN_FLEX_START,
  Icon,
  DIRECTION_ROW,
  TYPOGRAPHY,
  C_SKY_BLUE,
  TEXT_TRANSFORM_CAPITALIZE,
  SIZE_1,
  WRAP,
  DISPLAY_INLINE,
} from '@opentrons/components'
import { StatusLabel } from '../../../atoms/StatusLabel'
import { css } from 'styled-components'

import type {
  LatchStatus,
  SpeedStatus,
  TemperatureStatus,
} from '../../../redux/modules/api-types'

interface HeaterShakerModuleDataProps {
  heaterStatus: TemperatureStatus
  shakerStatus: SpeedStatus
  latchStatus: LatchStatus
  targetTemp: number | null
  currentTemp: number | null
  targetSpeed: number | null
  currentSpeed: number | null
  showTemperatureData?: boolean
}

export const HeaterShakerModuleData = (
  props: HeaterShakerModuleDataProps
): JSX.Element | null => {
  const {
    heaterStatus,
    shakerStatus,
    latchStatus,
    targetTemp,
    currentTemp,
    targetSpeed,
    currentSpeed,
    showTemperatureData,
  } = props
  const { t } = useTranslation(['device_details', 'heater_shaker', 'shared'])
  const isShaking = shakerStatus !== 'idle'

  const getStatusLabelProps = (
    status: string | null
  ): { backgroundColor: string; iconColor: string; textColor: string } => {
    const StatusLabelProps = {
      backgroundColor: COLORS.medGrey,
      iconColor: COLORS.darkGrey,
      textColor: COLORS.bluePressed,
      pulse: false,
    }

    switch (status) {
      case 'idle': {
        StatusLabelProps.backgroundColor = COLORS.medGrey
        StatusLabelProps.iconColor = COLORS.darkGrey
        StatusLabelProps.textColor = COLORS.darkBlack
        break
      }
      case 'holding at target': {
        StatusLabelProps.backgroundColor = C_SKY_BLUE
        StatusLabelProps.iconColor = COLORS.blue

        break
      }
      case 'heating':
      case 'shaking': {
        StatusLabelProps.backgroundColor = COLORS.blue + '1A'
        StatusLabelProps.pulse = true
        break
      }
    }
    return StatusLabelProps
  }

  const getLatchStatus = (latchStatus: LatchStatus): JSX.Element | string => {
    switch (latchStatus) {
      case 'opening':
      case 'idle_open':
      case 'idle_unknown': {
        return (
          <Text textTransform={TEXT_TRANSFORM_CAPITALIZE}>
            {t('open', { ns: 'shared' })}
          </Text>
        )
      }
      case 'closing':
      case 'idle_closed': {
        if (isShaking) {
          return (
            <Text textTransform={TEXT_TRANSFORM_CAPITALIZE}>
              {t('closed_and_locked', { ns: 'heater_shaker' })}
            </Text>
          )
        } else {
          return (
            <Text textTransform={TEXT_TRANSFORM_CAPITALIZE}>
              {t('closed', { ns: 'heater_shaker' })}
            </Text>
          )
        }
      }
      default:
        return latchStatus
    }
  }

  const test = css`
    @media all and (min-width: 50px') {
      grid-template-columns: repeat(3, 1fr);
    }
  `
  return (
    <>
      <Flex display="grid" gridTemplateColumns={'repeat(auto-fill, [col] 1fr'}>
        {/* <Flex
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          flexWrap={WRAP}
          flexDirection={DIRECTION_COLUMN}
        > */}
        {showTemperatureData && (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing6}
            data-testid={`heater_shaker_module_data_temp`}
          >
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              color={COLORS.darkGreyEnabled}
              fontWeight={TYPOGRAPHY.fontWeightRegular}
              fontSize={TYPOGRAPHY.fontSizeH6}
              marginTop={SPACING.spacing3}
            >
              {t('heater')}
            </Text>
            <StatusLabel
              status={heaterStatus}
              {...getStatusLabelProps(heaterStatus)}
            />
            <Text
              title="heater_target_temp"
              fontSize={TYPOGRAPHY.fontSizeH6}
              marginBottom={SPACING.spacing1}
            >
              {t(targetTemp === null ? 'na_temp' : 'target_temp', {
                temp: targetTemp,
              })}
            </Text>
            <Text title="heater_temp" fontSize={TYPOGRAPHY.fontSizeH6}>
              {t('current_temp', { temp: currentTemp })}
            </Text>
          </Flex>
        )}
        <Flex
          flexDirection={DIRECTION_COLUMN}
          data-testid={`heater_shaker_module_data_shaker`}
        >
          <Text
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            fontSize={TYPOGRAPHY.fontSizeH6}
            marginTop={SPACING.spacing3}
          >
            {t('shaker')}
          </Text>
          <StatusLabel
            status={shakerStatus}
            {...getStatusLabelProps(shakerStatus)}
          />
          <Text
            title="shaker_target_speed"
            fontSize={TYPOGRAPHY.fontSizeH6}
            marginBottom={SPACING.spacing1}
          >
            {t(targetSpeed === null ? 'na_speed' : 'target_speed', {
              speed: targetSpeed,
            })}
          </Text>
          <Text title="shaker_current_speed" fontSize={TYPOGRAPHY.fontSizeH6}>
            {t('current_speed', { speed: currentSpeed })}
          </Text>
        </Flex>
        {/* </Flex> */}
        <Flex
          flexDirection={DIRECTION_ROW}
          data-testid={`heater_shaker_module_data_latch`}
        >
          <Text
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            fontSize={TYPOGRAPHY.fontSizeH6}
            marginTop={SPACING.spacing3}
          >
            {t('shaker')}
          </Text>
          <StatusLabel
            status={shakerStatus}
            {...getStatusLabelProps(shakerStatus)}
          />
          <Text
            title="shaker_target_speed"
            fontSize={TYPOGRAPHY.fontSizeH6}
            marginBottom={SPACING.spacing1}
          >
            {t(targetSpeed === null ? 'na_speed' : 'target_speed', {
              speed: targetSpeed,
            })}
          </Text>
          <Text title="shaker_current_speed" fontSize={TYPOGRAPHY.fontSizeH6}>
            {t('current_speed', { speed: currentSpeed })}
          </Text>
        </Flex>
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        data-testid={`heater_shaker_module_data_latch`}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Text
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            fontSize={TYPOGRAPHY.fontSizeH6}
            marginTop={SPACING.spacing3}
            title="latch_status"
          >
            {t('labware_latch', { ns: 'heater_shaker' })}
          </Text>
          <Flex flexDirection={DIRECTION_ROW} marginTop={SPACING.spacing2}>
            {isShaking && (
              <Icon
                name="closed-locked"
                data-testid="HeaterShakerModuleData_latch_lock"
                size={SIZE_1}
              />
            )}
            {getLatchStatus(latchStatus)}
            <Flex flexDirection={DIRECTION_COLUMN}>
              <Text
                textTransform={TEXT_TRANSFORM_UPPERCASE}
                color={COLORS.darkGreyEnabled}
                fontWeight={TYPOGRAPHY.fontWeightRegular}
                fontSize={TYPOGRAPHY.fontSizeH6}
                marginTop={SPACING.spacing3}
              >
                {t('labware_latch', { ns: 'heater_shaker' })}
              </Text>
              <Flex
                title="latch_status"
                fontSize={TYPOGRAPHY.fontSizeH6}
                alignItems={ALIGN_FLEX_START}
                flexDirection={DIRECTION_ROW}
                marginTop={SPACING.spacing2}
              >
                {/* {TODO(sh, 2022-02-22): Conditionally render icon based on latch status} */}
                <Icon
                  paddingBottom="2px"
                  name="closed-locked"
                  size={'1rem'}
                  color={COLORS.darkGreyEnabled}
                />
                {latchStatus}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
