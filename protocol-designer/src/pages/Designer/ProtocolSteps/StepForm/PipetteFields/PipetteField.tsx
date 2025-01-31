import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { DropdownStepFormField } from '../../../../../molecules'
import { getEquippedPipetteOptions } from '../../../../../step-forms/selectors'
import type { FieldProps } from '../types'

export const PipetteField = (props: FieldProps): JSX.Element => {
  const { value } = props
  const { t } = useTranslation('protocol_steps')
  const pipetteOptions = useSelector(getEquippedPipetteOptions)
  return (
    <DropdownStepFormField
      {...props}
      options={pipetteOptions}
      value={value ? String(value) : null}
      title={t('pipette')}
    />
  )
}
