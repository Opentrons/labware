import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import {
  getModuleDisplayName,
  CELSIUS,
  HS_TEMP_MIN,
  HS_TEMP_MAX,
} from '@opentrons/shared-data'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { Slideout } from '/app/atoms/Slideout'
import { SubmitPrimaryButton } from '/app/atoms/buttons'

import type { MouseEventHandler } from 'react'
import type { HeaterShakerModule } from '/app/redux/modules/types'
import type { HeaterShakerSetTargetTemperatureCreateCommand } from '@opentrons/shared-data'

interface HeaterShakerSlideoutProps {
  module: HeaterShakerModule
  onCloseClick: () => unknown
  isExpanded: boolean
}

export const HeaterShakerSlideout = (
  props: HeaterShakerSlideoutProps
): JSX.Element | null => {
  const { module, onCloseClick, isExpanded } = props
  const { t } = useTranslation('device_details')
  const [hsValue, setHsValue] = useState<number | null>(null)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const moduleName = getModuleDisplayName(module.moduleModel)
  const modulePart = t('temperature')

  const sendSetTemperatureCommand: MouseEventHandler<HTMLInputElement> = e => {
    e.preventDefault()
    e.stopPropagation()

    if (hsValue != null) {
      const setTempCommand: HeaterShakerSetTargetTemperatureCreateCommand = {
        commandType: 'heaterShaker/setTargetTemperature',
        params: {
          moduleId: module.id,
          celsius: hsValue,
        },
      }
      createLiveCommand({
        command: setTempCommand,
      }).catch((e: Error) => {
        console.error(
          `error setting module status with command type ${setTempCommand.commandType}: ${e.message}`
        )
      })
    }
    setHsValue(null)
    onCloseClick()
  }

  const errorMessage =
    hsValue != null && (hsValue < HS_TEMP_MIN || hsValue > HS_TEMP_MAX)
      ? t('input_out_of_range')
      : null

  const inputMax = HS_TEMP_MAX
  const inputMin = HS_TEMP_MIN
  const unit = CELSIUS

  const handleCloseSlideout = (): void => {
    setHsValue(null)
    onCloseClick()
  }

  return (
    <Slideout
      title={t('set_status_heater_shaker', {
        part: modulePart,
        name: moduleName,
      })}
      onCloseClick={handleCloseSlideout}
      isExpanded={isExpanded}
      footer={
        <SubmitPrimaryButton
          form="HeaterShakerSlideout_submitValue"
          value={t('confirm')}
          onClick={sendSetTemperatureCommand}
          disabled={hsValue === null || errorMessage !== null}
          data-testid={`HeaterShakerSlideout_btn_${module.serialNumber}`}
        />
      }
    >
      <LegacyStyledText
        fontWeight={TYPOGRAPHY.fontWeightRegular}
        fontSize={TYPOGRAPHY.fontSizeP}
        paddingTop={SPACING.spacing4}
        data-testid={`HeaterShakerSlideout_title_${module.serialNumber}`}
      >
        {t('set_target_temp_of_hs')}
      </LegacyStyledText>
      <Flex
        marginTop={SPACING.spacing16}
        flexDirection={DIRECTION_COLUMN}
        data-testid={`HeaterShakerSlideout_input_field_${module.serialNumber}`}
      >
        <LegacyStyledText
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          fontSize={TYPOGRAPHY.fontSizeH6}
          color={COLORS.grey50}
          marginBottom={SPACING.spacing8}
        >
          {t('set_block_temp')}
        </LegacyStyledText>
        <form id="HeaterShakerSlideout_submitValue">
          <InputField
            data-testid={`${String(module.moduleModel)}_setTemp`}
            id={`${String(module.moduleModel)}_setTemp`}
            units={unit}
            autoFocus
            value={hsValue != null ? Math.round(hsValue) : null}
            onChange={e => {
              setHsValue(e.target.valueAsNumber)
            }}
            type="number"
            caption={t('module_status_range', {
              min: inputMin,
              max: inputMax,
              unit: unit,
            })}
            error={errorMessage}
          />
        </form>
      </Flex>
    </Slideout>
  )
}
