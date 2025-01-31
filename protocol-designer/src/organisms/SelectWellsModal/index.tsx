import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import omit from 'lodash/omit'
import {
  WELL_LABEL_OPTIONS,
  Modal,
  Flex,
  SPACING,
  JUSTIFY_CENTER,
  COLORS,
  StyledText,
  SecondaryButton,
  PrimaryButton,
  ALIGN_CENTER,
  JUSTIFY_END,
} from '@opentrons/components'
import { sortWells } from '@opentrons/shared-data'
import { arrayToWellGroup } from '../../utils'
import * as wellContentsSelectors from '../../top-selectors/well-contents'
import { selectors } from '../../labware-ingred/selectors'
import { selectors as stepFormSelectors } from '../../step-forms'
import { wellFillFromWellContents } from '../LabwareOnDeck/utils'
import { SelectableLabware } from '../Labware/SelectableLabware'

import type { WellGroup } from '@opentrons/components'
import type { StepFieldName } from '../../form-types'
import type { NozzleType } from '../../types'

interface SelectWellsModalProps {
  isOpen: boolean
  name: StepFieldName
  onCloseClick: () => void
  value: unknown
  updateValue: (val: unknown | null | undefined) => void
  nozzleType?: NozzleType | null
  labwareId?: string | null
  pipetteId?: string | null
}

export const SelectWellsModal = (
  props: SelectWellsModalProps
): JSX.Element | null => {
  const {
    isOpen,
    labwareId,
    onCloseClick,
    pipetteId,
    nozzleType = null,
    updateValue,
    name,
    value: wellFieldData,
  } = props
  const { t, i18n } = useTranslation(['liquids', 'protocol_steps', 'shared'])
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const allWellContentsForStep = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const ingredNames = useSelector(selectors.getLiquidNamesById)
  const labwareEntities = useSelector(stepFormSelectors.getLabwareEntities)
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)
  const labwareDef =
    (labwareId != null ? labwareEntities[labwareId]?.def : null) ?? null
  const pipette = pipetteId != null ? pipetteEntities[pipetteId] : null

  const [selectedPrimaryWells, setSelectedPrimaryWells] = useState<WellGroup>(
    Array.isArray(wellFieldData)
      ? arrayToWellGroup(wellFieldData as string[])
      : {}
  )
  useEffect(() => {
    if (Array.isArray(wellFieldData)) {
      setSelectedPrimaryWells(
        wellFieldData.length === 0
          ? {}
          : arrayToWellGroup(wellFieldData as string[])
      )
    }
  }, [wellFieldData])

  const [highlightedWells, setHighlightedWells] = useState<WellGroup>({})

  if (!isOpen) return null

  const selectWells = (wells: WellGroup): void => {
    setSelectedPrimaryWells(prev => ({ ...prev, ...wells }))
    setHighlightedWells({})
  }

  const deselectWells = (deselectedWells: WellGroup): void => {
    setSelectedPrimaryWells(prev => omit(prev, Object.keys(deselectedWells)))
    setHighlightedWells({})
  }

  const handleSave = (): void => {
    const sortedWells = Object.keys(selectedPrimaryWells).sort(sortWells)
    updateValue(sortedWells)
    onCloseClick()
  }

  const pipetteDisplayName = pipette?.spec.displayName
  const wellContents =
    labwareId != null && allWellContentsForStep != null
      ? allWellContentsForStep[labwareId]
      : {}

  return (
    <Modal
      marginLeft="0"
      width="42.0625rem"
      zIndex={15}
      zIndexOverlay={11}
      onClose={onCloseClick}
      title={
        <StyledText desktopStyle="bodyLargeSemiBold">
          {t(`protocol_steps:select_${name}`, {
            displayName: pipetteDisplayName,
          })}
        </StyledText>
      }
      footer={
        <Flex
          padding={`0 ${SPACING.spacing16} ${SPACING.spacing16}`}
          gridGap={SPACING.spacing8}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_END}
        >
          <SecondaryButton onClick={onCloseClick}>
            {i18n.format(t('shared:back'), 'capitalize')}
          </SecondaryButton>
          <PrimaryButton onClick={handleSave}>{t('shared:save')}</PrimaryButton>
        </Flex>
      }
    >
      <Flex
        marginBottom={SPACING.spacing12}
        justifyContent={JUSTIFY_CENTER}
        width="100%"
        color={COLORS.grey60}
      >
        <StyledText desktopStyle="headingSmallRegular">
          {t('click_and_drag')}
        </StyledText>
      </Flex>
      {labwareDef != null ? (
        <SelectableLabware
          showBorder={false}
          labwareProps={{
            wellLabelOption: WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE,
            definition: labwareDef,
            highlightedWells,
            wellFill: wellFillFromWellContents(
              wellContents,
              liquidDisplayColors
            ),
          }}
          selectedPrimaryWells={selectedPrimaryWells}
          selectWells={selectWells}
          deselectWells={deselectWells}
          updateHighlightedWells={setHighlightedWells}
          nozzleType={nozzleType}
          ingredNames={ingredNames}
          wellContents={wellContents}
        />
      ) : null}
    </Modal>
  )
}
