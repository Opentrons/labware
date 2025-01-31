import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  InputField,
  ListButton,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { getWellsDepth, getWellDimension } from '@opentrons/shared-data'
import { TipPositionModal, ZTipPositionModal } from '../../../../../organisms'
import { getIsDelayPositionField } from '../../../../../form-types'
import { getDefaultMmFromEdge } from '../../../../../organisms/TipPositionModal/utils'
import { selectors as stepFormSelectors } from '../../../../../step-forms'
import type {
  TipXOffsetFields,
  TipYOffsetFields,
  TipZOffsetFields,
} from '../../../../../form-types'
import type { PositionSpecs } from '../../../../../organisms'
import type { FieldPropsByName } from '../types'
interface PositionFieldProps {
  prefix: 'aspirate' | 'dispense' | 'mix'
  propsForFields: FieldPropsByName
  zField: TipZOffsetFields
  xField?: TipXOffsetFields
  yField?: TipYOffsetFields
  labwareId?: string | null
  padding?: string
}

export function PositionField(props: PositionFieldProps): JSX.Element {
  const {
    labwareId,
    propsForFields,
    zField,
    xField,
    yField,
    prefix,
    padding = `0 ${SPACING.spacing16}`,
  } = props
  const {
    name: zName,
    value: rawZValue,
    updateValue: zUpdateValue,
    tooltipContent,
    isIndeterminate,
    disabled,
  } = propsForFields[zField]

  const { t, i18n } = useTranslation(['application', 'protocol_steps'])
  const [targetProps, tooltipProps] = useHoverTooltip()
  const [isModalOpen, setModalOpen] = useState<boolean>(false)
  const labwareEntities = useSelector(stepFormSelectors.getLabwareEntities)
  const labwareDef =
    labwareId != null && labwareEntities[labwareId] != null
      ? labwareEntities[labwareId].def
      : null

  let wellDepthMm = 0
  let wellXWidthMm = 0
  let wellYWidthMm = 0

  if (labwareDef != null) {
    // NOTE: only taking depth of first well in labware def, UI not currently equipped for multiple depths/widths
    const firstWell = labwareDef.wells.A1
    if (firstWell) {
      wellDepthMm = getWellsDepth(labwareDef, ['A1'])
      wellXWidthMm = getWellDimension(labwareDef, ['A1'], 'x')
      wellYWidthMm = getWellDimension(labwareDef, ['A1'], 'y')
    }
  }

  if (
    (wellDepthMm === 0 || wellXWidthMm === 0 || wellYWidthMm === 0) &&
    labwareId != null &&
    labwareDef != null
  ) {
    console.error(
      `expected to find all well dimensions mm with labwareId ${labwareId} but could not`
    )
  }

  const handleOpen = (has3Specs: boolean): void => {
    if (has3Specs && wellDepthMm && wellXWidthMm && wellYWidthMm) {
      setModalOpen(true)
    }
    if (!has3Specs && wellDepthMm) {
      setModalOpen(true)
    }
  }
  const handleClose = (): void => {
    setModalOpen(false)
  }
  const isDelayPositionField = getIsDelayPositionField(zName)
  let zValue: string | number = '0'

  const mmFromBottom = typeof rawZValue === 'number' ? rawZValue : null
  if (wellDepthMm !== null) {
    // show default value for field in parens if no mmFromBottom value is selected
    zValue = mmFromBottom ?? getDefaultMmFromEdge({ name: zName })
  }

  let modal = (
    <ZTipPositionModal
      name={zName}
      closeModal={handleClose}
      wellDepthMm={wellDepthMm}
      zValue={zValue as number}
      updateValue={zUpdateValue}
      isIndeterminate={isIndeterminate}
    />
  )
  if (yField != null && xField != null) {
    const {
      name: xName,
      value: rawXValue,
      updateValue: xUpdateValue,
    } = propsForFields[xField]
    const {
      name: yName,
      value: rawYValue,
      updateValue: yUpdateValue,
    } = propsForFields[yField]

    const specs: PositionSpecs = {
      z: {
        name: zName,
        value: zValue as number,
        updateValue: zUpdateValue,
      },
      x: {
        name: xName,
        value: rawXValue != null ? Number(rawXValue) : null,
        updateValue: xUpdateValue,
      },
      y: {
        name: yName,
        value: rawYValue != null ? Number(rawYValue) : null,
        updateValue: yUpdateValue,
      },
    }

    modal = (
      <TipPositionModal
        closeModal={handleClose}
        wellDepthMm={wellDepthMm}
        wellXWidthMm={wellXWidthMm}
        wellYWidthMm={wellYWidthMm}
        isIndeterminate={isIndeterminate}
        specs={specs}
        prefix={prefix}
      />
    )
  }

  return (
    <>
      <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
      {isModalOpen ? modal : null}
      {yField != null && xField != null ? (
        <Flex
          {...targetProps}
          padding={padding}
          gridGap={SPACING.spacing8}
          flexDirection={DIRECTION_COLUMN}
        >
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {i18n.format(
              t('protocol_steps:tip_position', { prefix }),
              'capitalize'
            )}
          </StyledText>
          <ListButton
            padding={SPACING.spacing12}
            type="noActive"
            onClick={() => {
              handleOpen(true)
            }}
            gridGap={SPACING.spacing8}
            alignItems={ALIGN_CENTER}
          >
            <Icon name="tip-position" size="1.25rem" />
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('protocol_steps:well_position', {
                x:
                  propsForFields[xField].value != null
                    ? Number(propsForFields[xField].value)
                    : 0,
                y:
                  propsForFields[yField].value != null
                    ? Number(propsForFields[yField].value)
                    : 0,
                z: zValue,
              })}
            </StyledText>
          </ListButton>
        </Flex>
      ) : (
        <InputField
          title={
            isDelayPositionField
              ? t('protocol_steps:delay_position')
              : t('protocol_steps:touch_tip_position')
          }
          disabled={disabled}
          readOnly
          onClick={() => {
            handleOpen(false)
          }}
          value={String(zValue)}
          isIndeterminate={isIndeterminate}
          units={t('units.millimeter')}
          id={`TipPositionField_${zName}`}
        />
      )}
    </>
  )
}
