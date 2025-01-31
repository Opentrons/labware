import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { hoverSelection } from '../../../../../../ui/steps/actions/actions'
import { getHeaterShakerLabwareOptions } from '../../../../../../ui/modules/selectors'
import {
  DropdownStepFormField,
  ToggleExpandStepFormField,
  ToggleStepFormField,
} from '../../../../../../molecules'
import { getFormErrorsMappedToField, getFormLevelError } from '../../utils'
import type { StepFormProps } from '../../types'

export function HeaterShakerTools(props: StepFormProps): JSX.Element {
  const { propsForFields, formData, visibleFormErrors } = props
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const moduleLabwareOptions = useSelector(getHeaterShakerLabwareOptions)
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
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        paddingX={SPACING.spacing16}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('protocol_steps:heater_shaker_settings')}
        </StyledText>
        <ToggleExpandStepFormField
          {...propsForFields.targetHeaterShakerTemperature}
          toggleValue={propsForFields.setHeaterShakerTemperature.value}
          toggleUpdateValue={
            propsForFields.setHeaterShakerTemperature.updateValue
          }
          title={t(
            'form:step_edit_form.field.heaterShaker.temperature.setTemperature'
          )}
          fieldTitle={t('protocol_steps:temperature')}
          isSelected={formData.setHeaterShakerTemperature === true}
          units={t('units.degrees')}
          onLabel={t(
            'form:step_edit_form.field.heaterShaker.temperature.toggleOn'
          )}
          offLabel={t(
            'form:step_edit_form.field.heaterShaker.temperature.toggleOff'
          )}
          formLevelError={getFormLevelError(
            'targetHeaterShakerTemperature',
            mappedErrorsToField
          )}
        />
        <ToggleExpandStepFormField
          {...propsForFields.targetSpeed}
          toggleValue={propsForFields.setShake.value}
          toggleUpdateValue={propsForFields.setShake.updateValue}
          title={t('form:step_edit_form.field.heaterShaker.shaker.setShake')}
          fieldTitle={t('protocol_steps:speed')}
          isSelected={formData.setShake === true}
          units={t('units.rpm')}
          onLabel={t('form:step_edit_form.field.heaterShaker.shaker.toggleOn')}
          offLabel={t(
            'form:step_edit_form.field.heaterShaker.shaker.toggleOff'
          )}
          formLevelError={getFormLevelError('targetSpeed', mappedErrorsToField)}
        />
        <ToggleStepFormField
          isDisabled={propsForFields.latchOpen.disabled}
          title={t('form:step_edit_form.field.heaterShaker.latch.setLatch')}
          isSelected={propsForFields.latchOpen.value === true}
          onLabel={t('form:step_edit_form.field.heaterShaker.latch.toggleOn')}
          offLabel={t('form:step_edit_form.field.heaterShaker.latch.toggleOff')}
          toggleUpdateValue={propsForFields.latchOpen.updateValue}
          toggleValue={propsForFields.latchOpen.value}
          tooltipContent={
            propsForFields.latchOpen.disabled
              ? propsForFields.latchOpen.tooltipContent ?? null
              : null
          }
        />
        <ToggleExpandStepFormField
          {...propsForFields.heaterShakerTimer}
          toggleValue={propsForFields.heaterShakerSetTimer.value}
          toggleUpdateValue={propsForFields.heaterShakerSetTimer.updateValue}
          title={t(
            'form:step_edit_form.field.heaterShaker.timer.heaterShakerSetTimer'
          )}
          fieldTitle={t('form:step_edit_form.field.heaterShaker.duration')}
          isSelected={formData.heaterShakerSetTimer === true}
          units={t('application:units.time')}
          toggleElement="checkbox"
          formLevelError={getFormLevelError(
            'heaterShakerTimer',
            mappedErrorsToField
          )}
        />
      </Flex>
    </Flex>
  )
}
