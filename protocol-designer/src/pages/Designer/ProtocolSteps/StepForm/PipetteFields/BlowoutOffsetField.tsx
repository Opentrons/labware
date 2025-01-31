import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  DEST_WELL_BLOWOUT_DESTINATION,
  SOURCE_WELL_BLOWOUT_DESTINATION,
} from '@opentrons/step-generation'
import { getWellDepth } from '@opentrons/shared-data'
import {
  Flex,
  InputField,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { ZTipPositionModal } from '../../../../../organisms'
import { getLabwareEntities } from '../../../../../step-forms/selectors'
import type { FieldProps } from '../types'

interface BlowoutOffsetFieldProps extends FieldProps {
  destLabwareId: unknown
  sourceLabwareId?: unknown
  blowoutLabwareId?: unknown
}

export function BlowoutOffsetField(
  props: BlowoutOffsetFieldProps
): JSX.Element {
  const {
    disabled,
    value,
    destLabwareId,
    sourceLabwareId,
    blowoutLabwareId,
    tooltipContent,
    name,
    isIndeterminate,
    updateValue,
  } = props
  const { t } = useTranslation(['application', 'protocol_steps'])
  const [isModalOpen, setModalOpen] = useState<boolean>(false)
  const [targetProps, tooltipProps] = useHoverTooltip()
  const labwareEntities = useSelector(getLabwareEntities)

  let labwareId = null
  if (blowoutLabwareId === SOURCE_WELL_BLOWOUT_DESTINATION) {
    labwareId = sourceLabwareId
  } else if (blowoutLabwareId === DEST_WELL_BLOWOUT_DESTINATION) {
    labwareId = destLabwareId
  }

  const labwareWellDepth =
    labwareId != null && labwareEntities[String(labwareId)]?.def != null
      ? getWellDepth(labwareEntities[String(labwareId)].def, 'A1')
      : 0

  return (
    <>
      <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
      {isModalOpen ? (
        <ZTipPositionModal
          closeModal={() => {
            setModalOpen(false)
          }}
          name={name}
          zValue={Number(value)}
          updateValue={updateValue}
          wellDepthMm={labwareWellDepth}
        />
      ) : null}

      <Flex {...targetProps}>
        <InputField
          title={t('protocol_steps:blowout_position')}
          disabled={disabled}
          readOnly
          onClick={
            disabled
              ? undefined
              : () => {
                  setModalOpen(true)
                }
          }
          value={String(value)}
          isIndeterminate={isIndeterminate}
          units={t('units.millimeter')}
          id={`TipPositionField_${name}`}
        />
      </Flex>
    </>
  )
}
