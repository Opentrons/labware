import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getHasWasteChute } from '@opentrons/step-generation'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import { getAdditionalEquipmentEntities } from '../../../../../../step-forms/selectors'
import {
  getRobotStateAtActiveItem,
  getUnoccupiedLabwareLocationOptions,
} from '../../../../../../top-selectors/labware-locations'
import { hoverSelection } from '../../../../../../ui/steps/actions/actions'
import { DropdownStepFormField } from '../../../../../../molecules'
import type { FieldProps } from '../../types'

interface LabwareLocationFieldProps extends FieldProps {
  useGripper: boolean
  canSave: boolean
  labware: string
}
export function LabwareLocationField(
  props: LabwareLocationFieldProps
): JSX.Element {
  const { t } = useTranslation(['form', 'protocol_steps'])
  const { labware, useGripper } = props
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const dispatch = useDispatch()
  const robotState = useSelector(getRobotStateAtActiveItem)
  const isLabwareOffDeck =
    labware != null ? robotState?.labware[labware]?.slot === 'offDeck' : false

  let unoccupiedLabwareLocationsOptions =
    useSelector(getUnoccupiedLabwareLocationOptions) ?? []

  if (useGripper || isLabwareOffDeck) {
    unoccupiedLabwareLocationsOptions = unoccupiedLabwareLocationsOptions.filter(
      option => option.value !== 'offDeck'
    )
  }

  if (!useGripper && getHasWasteChute(additionalEquipmentEntities)) {
    unoccupiedLabwareLocationsOptions = unoccupiedLabwareLocationsOptions.filter(
      option => option.value !== WASTE_CHUTE_CUTOUT
    )
  }

  return (
    <DropdownStepFormField
      {...props}
      options={unoccupiedLabwareLocationsOptions}
      errorToShow={props.errorToShow}
      title={t('protocol_steps:new_location')}
      onEnter={(id: string) => {
        dispatch(
          hoverSelection({
            id,
            text: t('application:location'),
          })
        )
      }}
      onExit={() => {
        dispatch(hoverSelection({ id: null, text: null }))
      }}
    />
  )
}
