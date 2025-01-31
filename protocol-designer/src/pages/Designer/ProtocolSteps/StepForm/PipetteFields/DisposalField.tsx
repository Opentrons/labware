import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Flex, DIRECTION_COLUMN, SPACING } from '@opentrons/components'
import { getMaxDisposalVolumeForMultidispense } from '../../../../../steplist/formLevel/handleFormChange/utils'
import { selectors as stepFormSelectors } from '../../../../../step-forms'
import { selectors as uiLabwareSelectors } from '../../../../../ui/labware'
import {
  CheckboxExpandStepFormField,
  DropdownStepFormField,
  InputStepFormField,
} from '../../../../../molecules'
import { getBlowoutLocationOptionsForForm } from '../utils'
import { FlowRateField } from './FlowRateField'
import { BlowoutOffsetField } from './BlowoutOffsetField'

import type { PathOption, StepType } from '../../../../../form-types'
import type { FieldPropsByName } from '../types'

interface DisposalFieldProps {
  path: PathOption
  pipette: string | null
  propsForFields: FieldPropsByName
  stepType: StepType
  volume: string | null
  aspirate_airGap_checkbox?: boolean | null
  aspirate_airGap_volume?: string | null
  tipRack?: string | null
}

export function DisposalField(props: DisposalFieldProps): JSX.Element {
  const {
    path,
    stepType,
    volume,
    pipette,
    propsForFields,
    aspirate_airGap_checkbox,
    aspirate_airGap_volume,
    tipRack,
  } = props
  const { t } = useTranslation(['application', 'form'])

  const disposalOptions = useSelector(uiLabwareSelectors.getDisposalOptions)
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)
  const blowoutLocationOptions = getBlowoutLocationOptionsForForm({
    path,
    stepType,
  })
  const maxDisposalVolume = getMaxDisposalVolumeForMultidispense(
    {
      aspirate_airGap_checkbox,
      aspirate_airGap_volume,
      path,
      pipette,
      volume,
      tipRack,
    },
    pipetteEntities
  )
  const disposalDestinationOptions = [
    ...disposalOptions,
    ...blowoutLocationOptions,
  ]

  const volumeBoundsCaption =
    maxDisposalVolume != null
      ? t('protocol_steps:max_disposal_volume', {
          vol: maxDisposalVolume,
          unit: t('units.microliter'),
        })
      : ''

  const { value, updateValue } = propsForFields.disposalVolume_checkbox
  return (
    <CheckboxExpandStepFormField
      title={t('protocol_steps:multi_dispense_options')}
      checkboxValue={value}
      isChecked={value === true}
      checkboxUpdateValue={updateValue}
    >
      {value ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing6}>
          <InputStepFormField
            {...propsForFields.disposalVolume_volume}
            title={t('protocol_steps:disposal_volume')}
            units={t('units.microliter')}
            padding="0"
            showTooltip={false}
            caption={volumeBoundsCaption}
          />
          <DropdownStepFormField
            {...propsForFields.blowout_location}
            options={disposalDestinationOptions}
            title={t('protocol_steps:blowout_location')}
            padding="0"
            width="16.5rem"
          />
          <FlowRateField
            {...propsForFields.blowout_flowRate}
            pipetteId={pipette}
            flowRateType="blowout"
            volume={propsForFields.volume?.value ?? 0}
            padding="0"
            tiprack={propsForFields.tipRack.value}
          />
          <BlowoutOffsetField
            {...propsForFields.blowout_z_offset}
            sourceLabwareId={propsForFields.aspirate_labware.value}
            destLabwareId={propsForFields.dispense_labware.value}
            blowoutLabwareId={propsForFields.blowout_location.value}
          />
        </Flex>
      ) : null}
    </CheckboxExpandStepFormField>
  )
}
