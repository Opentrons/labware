import * as React from 'react'
import styled from 'styled-components'
import { useSelector } from 'react-redux'
import without from 'lodash/without'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  Text,
  SPACING,
  PrimaryButton,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  useHoverTooltip,
  Tooltip,
  WRAP,
} from '@opentrons/components'
import {
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  getPipetteSpecsV2,
  PipetteName,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
  ModuleModel,
  getModuleDisplayName,
  getModuleType,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { getIsCrashablePipetteSelected } from '../../../step-forms'
import gripperImage from '../../../images/flex_gripper.png'
import wasteChuteImage from '../../../images/waste_chute.png'
import trashBinImage from '../../../images/flex_trash_bin.png'
import { uuid } from '../../../utils'
import { selectors as featureFlagSelectors } from '../../../feature-flags'
import { CrashInfoBox, ModuleDiagram } from '../../modules'
import { ModuleFields } from '../FilePipettesModal/ModuleFields'
import { GoBack } from './GoBack'
import {
  getCrashableModuleSelected,
  getLastCheckedEquipment,
  getTrashBinOptionDisabled,
} from './utils'
import { EquipmentOption } from './EquipmentOption'
import { HandleEnter } from './HandleEnter'

import type { AdditionalEquipment, WizardTileProps } from './types'

export const DEFAULT_SLOT_MAP: { [moduleModel in ModuleModel]?: string } = {
  [THERMOCYCLER_MODULE_V2]: 'B1',
  [HEATERSHAKER_MODULE_V1]: 'D1',
  [MAGNETIC_BLOCK_V1]: 'D2',
  [TEMPERATURE_MODULE_V2]: 'C1',
}
export const FLEX_SUPPORTED_MODULE_MODELS: ModuleModel[] = [
  THERMOCYCLER_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
]

export function ModulesAndOtherTile(props: WizardTileProps): JSX.Element {
  const { getValues, goBack, proceed, watch } = props
  const { t } = useTranslation(['modal', 'tooltip'])
  const { fields, pipettesByMount, additionalEquipment } = getValues()
  const modules = watch('modules')
  const robotType = fields.robotType
  const moduleRestrictionsDisabled = useSelector(
    featureFlagSelectors.getDisableModuleRestrictions
  )
  const [targetProps, tooltipProps] = useHoverTooltip()
  const hasATrash =
    robotType === FLEX_ROBOT_TYPE
      ? additionalEquipment.includes('wasteChute') ||
        additionalEquipment.includes('trashBin')
      : true

  const { left, right } = pipettesByMount

  const hasCrashableMagnetModuleSelected = getCrashableModuleSelected(
    modules,
    MAGNETIC_MODULE_TYPE
  )
  const hasCrashableTemperatureModuleSelected = getCrashableModuleSelected(
    modules,
    TEMPERATURE_MODULE_TYPE
  )
  const hasHeaterShakerSelected =
    modules != null
      ? Object.values(modules).some(
          module => module.type === HEATERSHAKER_MODULE_TYPE
        )
      : false

  const leftPipetteSpecs =
    left.pipetteName != null && left.pipetteName !== ''
      ? getPipetteSpecsV2(left.pipetteName as PipetteName)
      : null
  const rightPipetteSpecs =
    right.pipetteName != null && right.pipetteName !== ''
      ? getPipetteSpecsV2(right.pipetteName as PipetteName)
      : null

  const showHeaterShakerPipetteCollisions =
    hasHeaterShakerSelected &&
    [leftPipetteSpecs, rightPipetteSpecs].some(
      pipetteSpecs => pipetteSpecs && pipetteSpecs.channels !== 1
    )

  const crashablePipetteSelected = getIsCrashablePipetteSelected(
    pipettesByMount
  )
  const modCrashWarning = (
    <CrashInfoBox
      showDiagram
      showMagPipetteCollisons={
        crashablePipetteSelected && hasCrashableMagnetModuleSelected
      }
      showTempPipetteCollisons={
        crashablePipetteSelected && hasCrashableTemperatureModuleSelected
      }
      showHeaterShakerLabwareCollisions={hasHeaterShakerSelected}
      showHeaterShakerModuleCollisions={hasHeaterShakerSelected}
      showHeaterShakerPipetteCollisions={showHeaterShakerPipetteCollisions}
    />
  )

  return (
    <HandleEnter disabled={!hasATrash} onEnter={proceed}>
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing32}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          minHeight="26rem"
          gridGap={SPACING.spacing32}
        >
          <Text as="h2">{t('choose_additional_items')}</Text>
          {robotType === OT2_ROBOT_TYPE ? (
            <ModuleFields {...props} />
          ) : (
            <FlexModuleFields {...props} />
          )}
          {robotType === OT2_ROBOT_TYPE && moduleRestrictionsDisabled !== true
            ? modCrashWarning
            : null}
        </Flex>

        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          width="100%"
        >
          <GoBack
            onClick={() => {
              if (robotType === OT2_ROBOT_TYPE) {
                if (pipettesByMount.right.pipetteName === '') {
                  goBack(2)
                } else {
                  goBack(1)
                }
              } else {
                goBack()
              }
            }}
          />
          <PrimaryButton
            onClick={() => proceed()}
            disabled={!hasATrash}
            {...targetProps}
          >
            {t('review_file_details')}
          </PrimaryButton>
          {!hasATrash ? (
            <Tooltip {...tooltipProps}>
              {t(`tooltip:disabled_no_trash`)}
            </Tooltip>
          ) : null}
        </Flex>
      </Flex>
    </HandleEnter>
  )
}

function FlexModuleFields(props: WizardTileProps): JSX.Element {
  const { watch, setValue } = props
  const modules = watch('modules')
  const additionalEquipment = watch('additionalEquipment')
  const moduleTypesOnDeck =
    modules != null ? Object.values(modules).map(module => module.type) : []
  const trashBinDisabled = getTrashBinOptionDisabled({
    additionalEquipment,
    moduleTypesOnDeck,
  })

  const handleSetEquipmentOption = (equipment: AdditionalEquipment): void => {
    if (additionalEquipment.includes(equipment)) {
      setValue('additionalEquipment', without(additionalEquipment, equipment))
    } else {
      setValue('additionalEquipment', [...additionalEquipment, equipment])
    }
  }

  React.useEffect(() => {
    if (trashBinDisabled) {
      setValue('additionalEquipment', without(additionalEquipment, 'trashBin'))
    }
  }, [trashBinDisabled, setValue])

  return (
    <Flex flexWrap={WRAP} gridGap={SPACING.spacing4} alignSelf={ALIGN_CENTER}>
      {FLEX_SUPPORTED_MODULE_MODELS.map(moduleModel => {
        const moduleType = getModuleType(moduleModel)
        const moduleOnDeck = moduleTypesOnDeck.includes(moduleType)
        return (
          <EquipmentOption
            robotType={FLEX_ROBOT_TYPE}
            key={moduleModel}
            isSelected={moduleOnDeck}
            image={<ModuleDiagram type={moduleType} model={moduleModel} />}
            text={getModuleDisplayName(moduleModel)}
            disabled={
              getLastCheckedEquipment({
                additionalEquipment,
                moduleTypesOnDeck,
              }) === moduleType
            }
            onClick={() => {
              if (moduleOnDeck) {
                const updatedModulesByType =
                  modules != null
                    ? Object.fromEntries(
                        Object.entries(modules).filter(
                          ([key, value]) => value.type !== moduleType
                        )
                      )
                    : {}
                setValue('modules', updatedModulesByType)
              } else {
                setValue('modules', {
                  ...modules,
                  [uuid()]: {
                    model: moduleModel,
                    type: moduleType,
                    slot: DEFAULT_SLOT_MAP[moduleModel] ?? '',
                  },
                })
              }
            }}
            showCheckbox
          />
        )
      })}
      <EquipmentOption
        robotType={FLEX_ROBOT_TYPE}
        onClick={() => handleSetEquipmentOption('gripper')}
        isSelected={additionalEquipment.includes('gripper')}
        image={
          <AdditionalItemImage
            src={gripperImage}
            alt="Opentrons Flex Gripper"
          />
        }
        text="Gripper"
        showCheckbox
      />

      <EquipmentOption
        robotType={FLEX_ROBOT_TYPE}
        onClick={() => handleSetEquipmentOption('wasteChute')}
        isSelected={additionalEquipment.includes('wasteChute')}
        image={
          <AdditionalItemImage
            src={wasteChuteImage}
            alt="Opentrons Waste Chute"
          />
        }
        text="Waste Chute"
        showCheckbox
      />
      <EquipmentOption
        robotType={FLEX_ROBOT_TYPE}
        onClick={() => handleSetEquipmentOption('trashBin')}
        isSelected={additionalEquipment.includes('trashBin')}
        image={
          <AdditionalItemImage src={trashBinImage} alt="Opentrons Trash Bin" />
        }
        text="Trash Bin"
        showCheckbox
        disabled={trashBinDisabled}
      />
    </Flex>
  )
}

const AdditionalItemImage = styled.img`
  width: 6rem;
  max-height: 4rem;
  display: block;
`
