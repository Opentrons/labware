import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { DIRECTION_COLUMN, Divider, Flex, SPACING } from '@opentrons/components'
import { MAGNETIC_MODULE_V1 } from '@opentrons/shared-data'
import {
  MAX_ENGAGE_HEIGHT_V1,
  MAX_ENGAGE_HEIGHT_V2,
  MIN_ENGAGE_HEIGHT_V1,
  MIN_ENGAGE_HEIGHT_V2,
} from '../../../../../../constants'
import {
  getMagnetLabwareEngageHeight,
  getMagneticLabwareOptions,
} from '../../../../../../ui/modules/selectors'
import {
  DropdownStepFormField,
  ToggleExpandStepFormField,
} from '../../../../../../molecules'
import { getModuleEntities } from '../../../../../../step-forms/selectors'
import { getFormErrorsMappedToField, getFormLevelError } from '../../utils'

import type { StepFormProps } from '../../types'

export function MagnetTools(props: StepFormProps): JSX.Element {
  const { propsForFields, formData, visibleFormErrors } = props
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const moduleLabwareOptions = useSelector(getMagneticLabwareOptions)
  const moduleEntities = useSelector(getModuleEntities)
  const defaultEngageHeight = useSelector(getMagnetLabwareEngageHeight)

  const moduleModel = moduleEntities[formData.moduleId].model

  const mmUnits = t('units.millimeter')
  const isGen1 = moduleModel === MAGNETIC_MODULE_V1
  const engageHeightMinMax = isGen1
    ? t('magnet_height_caption', {
        low: MIN_ENGAGE_HEIGHT_V1,
        high: MAX_ENGAGE_HEIGHT_V1,
      })
    : t('magnet_height_caption', {
        low: `${MIN_ENGAGE_HEIGHT_V2} ${mmUnits}`,
        high: `${MAX_ENGAGE_HEIGHT_V2} ${mmUnits}`,
      })
  const engageHeightDefault =
    defaultEngageHeight != null
      ? isGen1
        ? t('magnet_recommended', { default: defaultEngageHeight })
        : t('magnet_recommended', {
            default: `${defaultEngageHeight} ${mmUnits}`,
          })
      : ''
  const engageHeightCaption = `${engageHeightMinMax} ${engageHeightDefault}`

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <DropdownStepFormField
        {...propsForFields.moduleId}
        options={moduleLabwareOptions}
        title={t('protocol_steps:module')}
      />
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
        <ToggleExpandStepFormField
          {...propsForFields.engageHeight}
          toggleValue={propsForFields.magnetAction.value}
          toggleUpdateValue={propsForFields.magnetAction.updateValue}
          title={t('form:step_edit_form.field.magnetAction.label')}
          fieldTitle={t('protocol_steps:engage_height')}
          isSelected={formData.magnetAction === 'engage'}
          units={mmUnits}
          onLabel={t('form:step_edit_form.field.magnetAction.options.engage')}
          offLabel={t(
            'form:step_edit_form.field.magnetAction.options.disengage'
          )}
          caption={engageHeightCaption}
          errorToShow={getFormLevelError('engageHeight', mappedErrorsToField)}
        />
      </Flex>
    </Flex>
  )
}
