import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  ModuleIcon,
  SIZE_1,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  getCutoutDisplayName,
  getFixtureDisplayName,
  getModuleDisplayName,
  getModuleType,
  getPipetteNameSpecs,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_FIXTURES,
  SINGLE_SLOT_FIXTURES,
  THERMOCYCLER_MODULE_TYPE,
  FLEX_USB_MODULE_FIXTURES,
} from '@opentrons/shared-data'

import { InstrumentContainer } from '/app/atoms/InstrumentContainer'
import { Divider } from '/app/atoms/structure'
import { getRobotTypeDisplayName } from '../ProtocolsLanding/utils'
import { getSlotsForThermocycler } from './utils'

import type { ReactNode } from 'react'
import type {
  CutoutConfigProtocolSpec,
  LoadModuleRunTimeCommand,
  PipetteName,
  RobotType,
  SingleSlotCutoutFixtureId,
} from '@opentrons/shared-data'

interface RobotConfigurationDetailsProps {
  leftMountPipetteName: PipetteName | null
  rightMountPipetteName: PipetteName | null
  extensionInstrumentName: string | null
  requiredModuleDetails: LoadModuleRunTimeCommand[]
  requiredFixtureDetails: CutoutConfigProtocolSpec[]
  isLoading: boolean
  robotType: RobotType | null
}

export const RobotConfigurationDetails = (
  props: RobotConfigurationDetailsProps
): JSX.Element => {
  const {
    leftMountPipetteName,
    rightMountPipetteName,
    extensionInstrumentName,
    requiredModuleDetails,
    requiredFixtureDetails,
    isLoading,
    robotType,
  } = props
  const { t } = useTranslation(['protocol_details', 'shared'])

  const loadingText = (
    <StyledText desktopStyle="bodyDefaultRegular">
      {t('shared:loading')}
    </StyledText>
  )
  const emptyText = (
    <StyledText
      desktopStyle="bodyDefaultRegular"
      textTransform={TYPOGRAPHY.textTransformCapitalize}
    >
      {t('shared:empty')}
    </StyledText>
  )

  const is96PipetteUsed = leftMountPipetteName === 'p1000_96'
  const leftMountPipetteDisplayName =
    getPipetteNameSpecs(leftMountPipetteName as PipetteName)?.displayName ??
    null
  const leftMountItem =
    leftMountPipetteDisplayName != null ? (
      <InstrumentContainer displayName={leftMountPipetteDisplayName} />
    ) : (
      emptyText
    )

  const rightMountPipetteDisplayName =
    getPipetteNameSpecs(rightMountPipetteName as PipetteName)?.displayName ??
    null
  const rightMountItem =
    rightMountPipetteDisplayName != null ? (
      <InstrumentContainer displayName={rightMountPipetteDisplayName} />
    ) : (
      emptyText
    )

  const extensionMountItem =
    extensionInstrumentName != null ? (
      <InstrumentContainer displayName={extensionInstrumentName} />
    ) : (
      emptyText
    )

  // filter out single slot fixtures as they're implicit
  // also filter out usb module fixtures as they're handled by required modules
  const nonStandardRequiredFixtureDetails = requiredFixtureDetails.filter(
    fixture =>
      ![...SINGLE_SLOT_FIXTURES, ...FLEX_USB_MODULE_FIXTURES].includes(
        fixture.cutoutFixtureId as SingleSlotCutoutFixtureId
      )
  )

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <RobotConfigurationDetailsItem
        label={t('robot')}
        item={
          isLoading ? (
            loadingText
          ) : (
            <StyledText desktopStyle="bodyDefaultRegular">
              {getRobotTypeDisplayName(robotType)}
            </StyledText>
          )
        }
      />
      <Divider marginY={SPACING.spacing12} width="100%" />
      <RobotConfigurationDetailsItem
        label={is96PipetteUsed ? t('left_and_right_mounts') : t('left_mount')}
        item={isLoading ? loadingText : leftMountItem}
      />
      {!is96PipetteUsed && (
        <>
          <Divider marginY={SPACING.spacing12} width="100%" />
          <RobotConfigurationDetailsItem
            label={t('right_mount')}
            item={isLoading ? loadingText : rightMountItem}
          />
        </>
      )}
      {robotType === 'OT-3 Standard' ? (
        <>
          <Divider marginY={SPACING.spacing12} width="100%" />
          <RobotConfigurationDetailsItem
            label={t('shared:extension_mount')}
            item={isLoading ? loadingText : extensionMountItem}
          />
        </>
      ) : null}
      {requiredModuleDetails.map((module, index) => {
        return (
          <Fragment key={`module_${index}`}>
            <Divider marginY={SPACING.spacing12} width="100%" />
            <RobotConfigurationDetailsItem
              label={`${t('slot')} ${
                getModuleType(module.params.model) === THERMOCYCLER_MODULE_TYPE
                  ? getSlotsForThermocycler(robotType)
                  : module.params.location.slotName
              }`}
              item={
                <>
                  <ModuleIcon
                    key={index}
                    moduleType={getModuleType(module.params.model)}
                    marginRight={SPACING.spacing4}
                    alignSelf={ALIGN_CENTER}
                    color={COLORS.grey50}
                    height={SIZE_1}
                    minWidth={SIZE_1}
                    minHeight={SIZE_1}
                  />
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {getModuleDisplayName(module.params.model)}
                  </StyledText>
                </>
              }
            />
          </Fragment>
        )
      })}
      {nonStandardRequiredFixtureDetails.map((fixture, index) => {
        return (
          <Fragment key={`fixture_${index}`}>
            <Divider marginY={SPACING.spacing12} width="100%" />
            <RobotConfigurationDetailsItem
              label={`${t('slot')} ${getCutoutDisplayName(fixture.cutoutId)}`}
              item={
                <>
                  {MAGNETIC_BLOCK_FIXTURES.includes(fixture.cutoutFixtureId) ? (
                    <ModuleIcon
                      key={index}
                      moduleType={MAGNETIC_BLOCK_TYPE}
                      marginRight={SPACING.spacing4}
                      alignSelf={ALIGN_CENTER}
                      color={COLORS.grey50}
                      height={SIZE_1}
                      minWidth={SIZE_1}
                      minHeight={SIZE_1}
                    />
                  ) : null}
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {getFixtureDisplayName(fixture.cutoutFixtureId)}
                  </StyledText>
                </>
              }
            />
          </Fragment>
        )
      })}
    </Flex>
  )
}

interface RobotConfigurationDetailsItemProps {
  label: string
  item: ReactNode
}

export const RobotConfigurationDetailsItem = (
  props: RobotConfigurationDetailsItemProps
): JSX.Element => {
  const { label, item } = props
  return (
    <Flex
      flex="1 0 100%"
      flexDirection={DIRECTION_ROW}
      alignItems={ALIGN_CENTER}
    >
      <StyledText
        desktopStyle="bodyDefaultRegular"
        flex="0 0 auto"
        marginRight={SPACING.spacing16}
        color={COLORS.grey60}
        textTransform={TYPOGRAPHY.textTransformCapitalize}
        width="9.375rem"
      >
        {label}
      </StyledText>
      <Flex data-testid={`RobotConfigurationDetails_${label}`}>{item}</Flex>
    </Flex>
  )
}
