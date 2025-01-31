import { useSelector } from 'react-redux'
import { Trans, useTranslation } from 'react-i18next'
import first from 'lodash/first'
import flatten from 'lodash/flatten'
import last from 'lodash/last'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  ListItem,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
  getModuleEntities,
} from '../../../step-forms/selectors'
import { getLabwareNicknamesById } from '../../../ui/labware/selectors'
import { LINE_CLAMP_TEXT_STYLE } from '../../../atoms'
import type { FormData } from '../../../form-types'

interface StyledTransProps {
  i18nKey: string
  tagText?: string
  values?: object
}

function StyledTrans(props: StyledTransProps): JSX.Element {
  const { i18nKey, tagText, values } = props
  const { t } = useTranslation(['protocol_steps', 'application'])
  return (
    <Flex
      gridGap={SPACING.spacing4}
      alignItems={ALIGN_CENTER}
      css={`
        flex-wrap: wrap;
        word-break: break-word;
      `}
    >
      <Trans
        t={t}
        i18nKey={i18nKey}
        components={{
          text: <StyledText desktopStyle="bodyDefaultRegular" />,
          semiBoldText: <StyledText desktopStyle="bodyDefaultSemiBold" />,
          tag: <Tag type="default" text={tagText ?? ''} />,
        }}
        values={values}
      />
    </Flex>
  )
}

const getWellsForStepSummary = (
  targetWells: string[],
  labwareWells: string[]
): string => {
  if (targetWells.length === 1) {
    return targetWells[0]
  }
  const firstElementIndexOffset = labwareWells.indexOf(targetWells[0])
  const isInOrder = targetWells.every(
    (targetWell, i) =>
      labwareWells.indexOf(targetWell) === firstElementIndexOffset + i
  )
  return isInOrder
    ? `${first(targetWells)}-${last(targetWells)}`
    : `${targetWells.length} wells`
}

interface StepSummaryProps {
  currentStep: FormData | null
  stepDetails?: string
}

export function StepSummary(props: StepSummaryProps): JSX.Element | null {
  const { currentStep, stepDetails } = props
  const { t } = useTranslation(['protocol_steps', 'application'])
  const labwareNicknamesById = useSelector(getLabwareNicknamesById)
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )

  const labwareEntities = useSelector(getLabwareEntities)
  const modules = useSelector(getModuleEntities)
  if (currentStep?.stepType == null) {
    return null
  }
  const { stepType } = currentStep
  let stepSummaryContent: JSX.Element | null = null
  switch (stepType) {
    case 'mix':
      const {
        labware: mixLabwareId,
        volume: mixVolume,
        times,
        wells: mix_wells,
        labware: mixLabware,
      } = currentStep
      const mixLabwareDisplayName = labwareNicknamesById[mixLabwareId]
      const mixWellsDisplay = getWellsForStepSummary(
        mix_wells as string[],
        flatten(labwareEntities[mixLabware].def.ordering)
      )

      stepSummaryContent = (
        <StyledTrans
          i18nKey="protocol_steps:mix_step"
          tagText={`${mixVolume} ${t('application:units.microliter')}`}
          values={{
            labware: mixLabwareDisplayName,
            times,
            wells: mixWellsDisplay,
          }}
        />
      )
      break
    case 'magnet':
      const {
        moduleId: magneticModuleId,
        engageHeight,
        magnetAction,
      } = currentStep
      const magneticModuleDisplayName = getModuleDisplayName(
        modules[magneticModuleId].model
      )
      stepSummaryContent =
        magnetAction === 'engage' ? (
          <StyledTrans
            i18nKey="protocol_steps:magnetic_module.engage"
            tagText={`${engageHeight}${t('application:units.millimeter')}`}
            values={{ module: magneticModuleDisplayName }}
          />
        ) : (
          <StyledTrans
            i18nKey="protocol_steps:magnetic_module.disengage"
            values={{ module: magneticModuleDisplayName }}
          />
        )
      break
    case 'thermocycler':
      const {
        lidIsActive,
        lidTargetTemp,
        blockIsActive,
        blockTargetTemp,
        lidOpen,
        thermocyclerFormType,
        lidOpenHold,
        blockTargetTempHold,
        profileTargetLidTemp,
        profileVolume,
      } = currentStep
      stepSummaryContent =
        thermocyclerFormType === 'thermocyclerState' ? (
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            {blockIsActive ? (
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_state.block"
                tagText={`${blockTargetTemp}${t('application:units.degrees')}`}
              />
            ) : null}
            <Flex gridGap={SPACING.spacing20} alignItems={ALIGN_CENTER}>
              {lidIsActive ? (
                <StyledTrans
                  i18nKey="protocol_steps:thermocycler_module.thermocycler_state.lid_temperature"
                  tagText={`${lidTargetTemp}${t('application:units.degrees')}`}
                />
              ) : null}
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_state.lid_position"
                tagText={t(
                  `protocol_steps:thermocycler_module.lid_position.${
                    lidOpen ? 'open' : 'closed'
                  }`
                )}
              />
            </Flex>
          </Flex>
        ) : (
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <Flex gridGap={SPACING.spacing20}>
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_profile.volume"
                tagText={`${profileVolume} ${t(
                  'application:units.microliter'
                )}`}
              />
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_profile.lid_temperature"
                tagText={`${profileTargetLidTemp}${t(
                  'application:units.degrees'
                )}`}
              />
            </Flex>
            <Flex gridGap={SPACING.spacing20}>
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_profile.end_hold.block"
                tagText={`${blockTargetTempHold}${t(
                  'application:units.degrees'
                )}`}
              />
              <StyledTrans
                i18nKey="protocol_steps:thermocycler_module.thermocycler_profile.end_hold.lid_position"
                tagText={t(
                  `protocol_steps:thermocycler_module.lid_position.${
                    lidOpenHold ? 'open' : 'closed'
                  }`
                )}
              />
            </Flex>
          </Flex>
        )
      break
    case 'pause':
      const {
        moduleId: pauseModuleId,
        pauseAction,
        pauseTime,
        pauseTemperature,
      } = currentStep
      switch (pauseAction) {
        case 'untilResume':
          stepSummaryContent = (
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('protocol_steps:pause.untilResume')}
            </StyledText>
          )
          break
        case 'untilTemperature':
          const pauseModuleDisplayName = getModuleDisplayName(
            modules[pauseModuleId].model
          )
          stepSummaryContent = (
            <StyledTrans
              i18nKey="protocol_steps:pause.untilTemperature"
              values={{ module: pauseModuleDisplayName }}
              tagText={`${pauseTemperature}${t('application:units.degrees')}`}
            />
          )
          break
        case 'untilTime':
          stepSummaryContent = (
            <StyledTrans
              i18nKey={t('protocol_steps:pause.untilTime')}
              tagText={pauseTime}
            />
          )
          break
      }
      break
    case 'temperature':
      const {
        moduleId: tempModuleId,
        setTemperature,
        targetTemperature,
      } = currentStep
      const isDeactivating = setTemperature === 'false'
      const tempModuleDisplayName = getModuleDisplayName(
        modules[tempModuleId].model
      )
      stepSummaryContent = isDeactivating ? (
        <StyledTrans
          i18nKey={'protocol_steps:temperature_module.deactivated'}
          values={{ module: tempModuleDisplayName }}
        />
      ) : (
        <StyledTrans
          i18nKey={'protocol_steps:temperature_module.active'}
          tagText={`${targetTemperature}${t('application:units.degrees')}`}
          values={{ module: tempModuleDisplayName }}
        />
      )
      break
    case 'moveLabware':
      const { labware, newLocation, useGripper } = currentStep
      const labwareName = labwareNicknamesById[labware]
      let newLocationName = newLocation
      if (newLocation in modules) {
        newLocationName = getModuleDisplayName(modules[newLocation].model)
      } else if (newLocation in labwareEntities) {
        newLocationName = labwareNicknamesById[newLocation]
      } else if (newLocation === 'offDeck') {
        newLocationName = t('off_deck')
      }
      stepSummaryContent = (
        <StyledTrans
          i18nKey={
            useGripper
              ? 'protocol_steps:move_labware.gripper'
              : 'protocol_steps:move_labware.no_gripper'
          }
          values={{
            labware: labwareName,
          }}
          tagText={newLocationName}
        />
      )
      break
    case 'moveLiquid':
      let moveLiquidType
      const {
        aspirate_labware,
        aspirate_wells,
        dispense_wells,
        dispense_labware,
        volume,
      } = currentStep
      const sourceLabwareName = labwareNicknamesById[aspirate_labware]
      const destinationLabwareName = labwareNicknamesById[dispense_labware]
      const aspirateWellsDisplay = getWellsForStepSummary(
        aspirate_wells as string[],
        flatten(labwareEntities[aspirate_labware]?.def.ordering)
      )
      const dispenseWellsDisplay = getWellsForStepSummary(
        dispense_wells as string[],
        flatten(labwareEntities[dispense_labware]?.def.ordering)
      )

      const disposalName = additionalEquipmentEntities[dispense_labware]?.name

      const isDisposalLocation =
        disposalName === 'wasteChute' || disposalName === 'trashBin'

      if (currentStep.path === 'single') {
        moveLiquidType = 'transfer'
      } else if (currentStep.path === 'multiAspirate') {
        moveLiquidType = 'consolidate'
      } else {
        moveLiquidType = 'distribute'
      }

      stepSummaryContent = (
        <StyledTrans
          i18nKey={
            isDisposalLocation
              ? `protocol_steps:move_liquid.${moveLiquidType}_disposal`
              : `protocol_steps:move_liquid.${moveLiquidType}`
          }
          values={{
            sourceWells: aspirateWellsDisplay,
            destinationWells: dispenseWellsDisplay,
            source: sourceLabwareName,
            destination: isDisposalLocation
              ? t(`shared:${disposalName}`)
              : destinationLabwareName,
          }}
          tagText={`${volume} ${t('application:units.microliter')}`}
        />
      )

      break
    case 'heaterShaker':
      const {
        latchOpen,
        heaterShakerTimer,
        moduleId: heaterShakerModuleId,
        targetHeaterShakerTemperature,
        targetSpeed,
      } = currentStep
      const moduleDisplayName = getModuleDisplayName(
        modules[heaterShakerModuleId].model
      )
      stepSummaryContent = (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          <Flex gridGap={SPACING.spacing20} alignItems={ALIGN_CENTER}>
            <StyledTrans
              i18nKey="protocol_steps:heater_shaker.active.temperature"
              values={{ module: moduleDisplayName }}
              tagText={
                targetHeaterShakerTemperature
                  ? `${targetHeaterShakerTemperature}${t(
                      'application:units.degrees'
                    )}`
                  : t('protocol_steps:heater_shaker.active.ambient')
              }
            />
            {targetSpeed ? (
              <StyledTrans
                i18nKey="protocol_steps:heater_shaker.active.shake"
                tagText={`${targetSpeed}${t('application:units.rpm')}`}
              />
            ) : null}
          </Flex>
          <Flex gridGap={SPACING.spacing20}>
            {heaterShakerTimer ? (
              <StyledTrans
                i18nKey="protocol_steps:heater_shaker.active.time"
                tagText={heaterShakerTimer}
              />
            ) : null}
            <StyledTrans
              i18nKey="protocol_steps:heater_shaker.active.latch"
              tagText={t(
                latchOpen
                  ? 'protocol_steps:heater_shaker.latch.open'
                  : 'protocol_steps:heater_shaker.latch.closed'
              )}
            />
          </Flex>
        </Flex>
      )
      break
    default:
      stepSummaryContent = null
  }
  return stepSummaryContent != null || stepDetails != null ? (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      width="100%"
    >
      {stepSummaryContent != null ? (
        <ListItem type="noActive">
          <Flex padding={SPACING.spacing12}>{stepSummaryContent}</Flex>
        </ListItem>
      ) : null}
      {stepDetails != null && stepDetails !== '' ? (
        <ListItem type="noActive">
          <Flex padding={SPACING.spacing12}>
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={LINE_CLAMP_TEXT_STYLE(3)}
            >
              {stepDetails}
            </StyledText>
          </Flex>
        </ListItem>
      ) : null}
    </Flex>
  ) : null
}
