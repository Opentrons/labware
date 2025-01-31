import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useModulesQuery } from '@opentrons/react-api-client'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  SPACING,
  SecondaryButton,
  LegacyStyledText,
  TEXT_ALIGN_CENTER,
  TYPOGRAPHY,
  Modal,
} from '@opentrons/components'
import {
  getFixtureDisplayName,
  getCutoutFixturesForModuleModel,
  MAGNETIC_BLOCK_V1,
  getModuleDisplayName,
} from '@opentrons/shared-data'
import { getTopPortalEl } from '/app/App/portal'
import { OddModal } from '/app/molecules/OddModal'
import { FixtureOption } from '/app/organisms/DeviceDetailsDeckConfiguration/AddFixtureModal'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { SmallButton } from '/app/atoms/buttons'
import { useCloseCurrentRun } from '/app/resources/runs'

import type { ModuleModel, DeckDefinition } from '@opentrons/shared-data'
import type { AttachedModule } from '@opentrons/api-client'

const EQUIPMENT_POLL_MS = 5000
interface ModuleFixtureOption {
  moduleModel: ModuleModel
  usbPort?: number | string
  serialNumber?: string
}
interface ChooseModuleToConfigureModalProps {
  handleConfigureModule: (moduleSerialNumber?: string) => void
  onCloseClick: () => void
  deckDef: DeckDefinition
  isOnDevice: boolean
  requiredModuleModel: ModuleModel
  robotName: string
  displaySlotName: string
}

export const ChooseModuleToConfigureModal = (
  props: ChooseModuleToConfigureModalProps
): JSX.Element => {
  const {
    handleConfigureModule,
    onCloseClick,
    deckDef,
    requiredModuleModel,
    isOnDevice,
    robotName,
    displaySlotName,
  } = props
  const { t, i18n } = useTranslation(['protocol_setup', 'shared'])
  const attachedModules =
    useModulesQuery({ refetchInterval: EQUIPMENT_POLL_MS })?.data?.data ?? []
  const deckConfig = useNotifyDeckConfigurationQuery()?.data ?? []
  const [configuredModuleMatches, unconfiguredModuleMatches] =
    attachedModules.reduce<[AttachedModule[], AttachedModule[]]>(
      (acc, attachedMod) => {
        if (attachedMod.moduleModel === requiredModuleModel) {
          return deckConfig.some(
            ({ opentronsModuleSerialNumber }) =>
              attachedMod.serialNumber === opentronsModuleSerialNumber
          )
            ? [[...acc[0], attachedMod], acc[1]]
            : [acc[0], [...acc[1], attachedMod]]
        }
        return acc
      },
      [[], []]
    ) ?? []

  const connectedOptions: ModuleFixtureOption[] = unconfiguredModuleMatches.map(
    attachedMod => {
      const portDisplay =
        attachedMod.usbPort.hubPort != null
          ? `${attachedMod.usbPort.port}.${attachedMod.usbPort.hubPort}`
          : attachedMod.usbPort.port
      return {
        moduleModel: attachedMod.moduleModel,
        usbPort: portDisplay,
        serialNumber: attachedMod.serialNumber,
      }
    }
  )
  const passiveOptions: ModuleFixtureOption[] =
    requiredModuleModel === MAGNETIC_BLOCK_V1
      ? [{ moduleModel: MAGNETIC_BLOCK_V1 }]
      : []
  const fixtureOptions = [...connectedOptions, ...passiveOptions].map(
    ({ moduleModel, serialNumber, usbPort }) => {
      const moduleFixtures = getCutoutFixturesForModuleModel(
        moduleModel,
        deckDef
      )
      return (
        <FixtureOption
          key={serialNumber}
          onClickHandler={() => {
            handleConfigureModule(serialNumber)
          }}
          optionName={getFixtureDisplayName(moduleFixtures[0].id, usbPort)}
          buttonText={i18n.format(t('shared:add'), 'capitalize')}
          isOnDevice={isOnDevice}
        />
      )
    }
  )

  const moduleDisplayName = getModuleDisplayName(requiredModuleModel)

  const contents =
    fixtureOptions.length > 0 ? (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
        <LegacyStyledText as="p">
          {t('add_this_deck_hardware')}
        </LegacyStyledText>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          {fixtureOptions}
        </Flex>
      </Flex>
    ) : (
      <NoUnconfiguredModules
        {...{
          isOnDevice,
          configuredModuleMatches,
          moduleDisplayName,
          displaySlotName,
          robotName,
        }}
      />
    )

  return createPortal(
    isOnDevice ? (
      <OddModal
        onOutsideClick={onCloseClick}
        header={{
          title: t('add_to_slot', { slotName: displaySlotName }),
          hasExitIcon: true,
          onClick: onCloseClick,
        }}
      >
        {contents}
      </OddModal>
    ) : (
      <Modal
        title={
          <Flex
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing10}
            alignItems={ALIGN_CENTER}
          >
            <LegacyStyledText
              as="h3"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            >
              {t('add_to_slot', { slotName: displaySlotName })}
            </LegacyStyledText>
          </Flex>
        }
        onClose={onCloseClick}
        width="27.75rem"
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          {contents}
        </Flex>
      </Modal>
    ),
    getTopPortalEl()
  )
}

interface NoUnconfiguredModulesProps {
  moduleDisplayName: string
  displaySlotName: string
  configuredModuleMatches: AttachedModule[]
  isOnDevice: boolean
  robotName: string
}
function NoUnconfiguredModules(props: NoUnconfiguredModulesProps): JSX.Element {
  const {
    moduleDisplayName,
    configuredModuleMatches,
    displaySlotName,
    isOnDevice,
    robotName,
  } = props
  const { t } = useTranslation('protocol_setup')
  const navigate = useNavigate()
  const { closeCurrentRun } = useCloseCurrentRun()
  const handleCancelRun = (): void => {
    closeCurrentRun()
  }
  const handleNavigateToDeviceDetails = (): void => {
    navigate(`/devices/${robotName}`)
  }
  const exitButton = isOnDevice ? (
    <SmallButton
      onClick={handleCancelRun}
      buttonType="secondary"
      buttonText={t('exit_to_deck_configuration')}
    />
  ) : (
    <SecondaryButton onClick={handleNavigateToDeviceDetails}>
      {t('exit_to_deck_configuration')}
    </SecondaryButton>
  )

  const loadingBlock = (
    <Flex
      paddingX={SPACING.spacing80}
      paddingY={SPACING.spacing40}
      gridGap={isOnDevice ? SPACING.spacing32 : SPACING.spacing10}
      borderRadius={isOnDevice ? BORDERS.borderRadius12 : BORDERS.borderRadius8}
      backgroundColor={isOnDevice ? COLORS.grey35 : COLORS.grey30}
      flexDirection={DIRECTION_COLUMN}
      alignItems={ALIGN_CENTER}
    >
      <Icon
        size={isOnDevice ? '2rem' : '1.25rem'}
        marginLeft={SPACING.spacing8}
        color={COLORS.grey60}
        name="ot-spinner"
        spin
      />
      <LegacyStyledText
        as={isOnDevice ? 'h4' : 'p'}
        color={COLORS.grey60}
        textAlign={TEXT_ALIGN_CENTER}
      >
        {t('plug_in_module_to_configure', { module: moduleDisplayName })}
      </LegacyStyledText>
    </Flex>
  )
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={isOnDevice ? SPACING.spacing32 : SPACING.spacing24}
    >
      {configuredModuleMatches.length > 0 ? (
        <>
          <LegacyStyledText as="p">
            {t('there_are_other_configured_modules', {
              module: moduleDisplayName,
            })}
          </LegacyStyledText>
          {loadingBlock}
          {exitButton}
        </>
      ) : (
        <>
          <LegacyStyledText as="p">
            {t('there_are_no_unconfigured_modules', {
              module: moduleDisplayName,
              slot: displaySlotName,
            })}
          </LegacyStyledText>
          {loadingBlock}
        </>
      )}
    </Flex>
  )
}
