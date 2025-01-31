import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  getDisposalOptions,
  getLabwareOptions,
} from '../../../../../ui/labware/selectors'
import { hoverSelection } from '../../../../../ui/steps/actions/actions'
import { DropdownStepFormField } from '../../../../../molecules'
import type { FieldProps } from '../types'

export function LabwareField(props: FieldProps): JSX.Element {
  const { name } = props
  const { i18n, t } = useTranslation(['protocol_steps', 'application'])
  const disposalOptions = useSelector(getDisposalOptions)
  const options = useSelector(getLabwareOptions)
  const dispatch = useDispatch()
  const allOptions =
    name === 'dispense_labware'
      ? [...options, ...disposalOptions]
      : [...options]

  return (
    <DropdownStepFormField
      {...props}
      name={name}
      options={allOptions}
      title={i18n.format(t(`${name}`), 'capitalize')}
      onEnter={(id: string) => {
        dispatch(hoverSelection({ id, text: t('application:select') }))
      }}
      onExit={() => {
        dispatch(hoverSelection({ id: null, text: null }))
      }}
    />
  )
}
