import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getPipetteEntities } from '../../../../../step-forms/selectors'
import { SelectWellsModal, getMainPagePortalEl } from '../../../../../organisms'
import { getNozzleType } from '../utils'

import type { FieldProps } from '../types'

type TipWellSelectionFieldProps = FieldProps & {
  pipetteId: unknown
  labwareId: unknown
  nozzles: string | null
}

export function TipWellSelectionField(
  props: TipWellSelectionFieldProps
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
  const { t } = useTranslation('protocol_steps')
  const pipetteEntities = useSelector(getPipetteEntities)
  const primaryWellCount =
    Array.isArray(selectedWells) && selectedWells.length > 0
      ? selectedWells.length.toString()
      : null
  const [openModal, setOpenModal] = useState<boolean>(false)
  const pipette = pipetteId != null ? pipetteEntities[String(pipetteId)] : null
  const nozzleType = getNozzleType(pipette, nozzles)

  return (
    <>
      {createPortal(
        <SelectWellsModal
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

      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing16}
        gridGap={SPACING.spacing8}
      >
        <Flex gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
            {t('tip_selection')}
          </StyledText>
        </Flex>
        <InputField
          disabled={disabled}
          readOnly
          name={name}
          error={errorToShow}
          value={primaryWellCount}
          onClick={() => {
            setOpenModal(true)
          }}
        />
      </Flex>
    </>
  )
}
