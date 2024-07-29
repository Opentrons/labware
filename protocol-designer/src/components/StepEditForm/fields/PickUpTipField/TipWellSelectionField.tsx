import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import { FormGroup, InputField } from '@opentrons/components'
import { getPipetteEntities } from '../../../../step-forms/selectors'
import { getNozzleType } from '../../utils'
import { getMainPagePortalEl } from '../../../portals/MainPageModalPortal'
import { WellSelectionModal } from '../WellSelectionField/WellSelectionModal'
import { StepFormDropdown } from '../StepFormDropdownField'

import styles from '../../StepEditForm.module.css'

export function TipWellSelectionField(
  props: Omit<React.ComponentProps<typeof StepFormDropdown>, 'options'> & {
    pipetteId: unknown
    labwareId: unknown
    nozzles: string | null
  }
): JSX.Element {
  const {
    value: selectedWells,
    errorToShow,
    name,
    updateValue,
    disabled,
    pipetteId,
    labwareId,
    nozzles,
  } = props
  const { t } = useTranslation('form')
  const pipetteEntities = useSelector(getPipetteEntities)
  const primaryWellCount =
    Array.isArray(selectedWells) && selectedWells.length > 0
      ? selectedWells.length.toString()
      : undefined
  const [openModal, setOpenModal] = React.useState<boolean>(false)
  const pipette = pipetteId != null ? pipetteEntities[String(pipetteId)] : null
  const nozzleType = getNozzleType(pipette, nozzles)
  const label = t('step_edit_form.wellSelectionLabel.wells')

  return (
    <>
      {createPortal(
        <WellSelectionModal
          isOpen={openModal}
          key={`${labwareId}_${name}_TipField`}
          labwareId={String(labwareId)}
          name={name}
          onCloseClick={() => {
            setOpenModal(false)
          }}
          pipetteId={String(pipetteId)}
          updateValue={updateValue}
          value={selectedWells}
          nozzleType={nozzleType}
        />,

        getMainPagePortalEl()
      )}

      <FormGroup
        disabled={disabled}
        label={label}
        className={styles.small_field}
      >
        <InputField
          readOnly
          error={errorToShow}
          name={name}
          value={primaryWellCount ?? null}
          onClick={() => {
            setOpenModal(true)
          }}
        />
      </FormGroup>
    </>
  )
}
