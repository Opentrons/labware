import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
} from '@opentrons/components'
import { hoverSelection } from '../../../../../../ui/steps/actions/actions'
import { getTemperatureLabwareOptions } from '../../../../../../ui/modules/selectors'
import {
  DropdownStepFormField,
  ToggleExpandStepFormField,
} from '../../../../../../molecules'
import { getFormErrorsMappedToField, getFormLevelError } from '../../utils'

import type { StepFormProps } from '../../types'

export function TemperatureTools(props: StepFormProps): JSX.Element {
  const { propsForFields, formData, visibleFormErrors } = props
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const moduleLabwareOptions = useSelector(getTemperatureLabwareOptions)
  const dispatch = useDispatch()
  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      paddingY={SPACING.spacing16}
    >
      <DropdownStepFormField
        {...propsForFields.moduleId}
        tooltipContent={null}
        options={moduleLabwareOptions}
        title={t('protocol_steps:module')}
        onEnter={(id: string) => {
          dispatch(hoverSelection({ id, text: t('select') }))
        }}
        onExit={() => {
          dispatch(hoverSelection({ id: null, text: null }))
        }}
      />
      <Box borderBottom={`1px solid ${COLORS.grey30}`} />
      <Flex padding={`0 ${SPACING.spacing16}`}>
        <ToggleExpandStepFormField
          {...propsForFields.targetTemperature}
          toggleValue={propsForFields.setTemperature.value}
          toggleUpdateValue={propsForFields.setTemperature.updateValue}
          title={t('form:step_edit_form.moduleState')}
          fieldTitle={t('form:step_edit_form.field.temperature.setTemperature')}
          units={t('units.degrees')}
          isSelected={formData.setTemperature === 'true'}
          onLabel={t('form:step_edit_form.field.temperature.toggleOn')}
          offLabel={t('form:step_edit_form.field.temperature.toggleOff')}
          formLevelError={getFormLevelError(
            'targetTemperature',
            mappedErrorsToField
          )}
          caption={t('form:step_edit_form.field.temperature.caption')}
        />
      </Flex>
    </Flex>
  )
}
