import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  COLORS,
  Banner,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import {
  NINETY_SIX_CHANNEL,
  RIGHT,
  SINGLE_MOUNT_PIPETTES,
  WEIGHT_OF_96_CHANNEL,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import {
  SimpleWizardBody,
  SimpleWizardInProgressBody,
} from '/app/molecules/SimpleWizardBody'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import { WizardRequiredEquipmentList } from '/app/molecules/WizardRequiredEquipmentList'
import { usePipetteNameSpecs } from '/app/local-resources/instruments'
import {
  CALIBRATION_PROBE,
  FLOWS,
  PIPETTE,
  HEX_SCREWDRIVER,
  NINETY_SIX_CHANNEL_PIPETTE,
  NINETY_SIX_CHANNEL_MOUNTING_PLATE,
  BODY_STYLE,
} from './constants'
import { getIsGantryEmpty } from './utils'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { UseMutateFunction } from 'react-query'
import type { AxiosError } from 'axios'
import type {
  CreateCommand,
  LoadedPipette,
  PipetteName,
} from '@opentrons/shared-data'
import type {
  CreateMaintenanceRunData,
  MaintenanceRun,
} from '@opentrons/api-client'
import type { PipetteWizardStepProps } from './types'

interface BeforeBeginningProps extends PipetteWizardStepProps {
  createMaintenanceRun: UseMutateFunction<
    MaintenanceRun,
    AxiosError<any>,
    CreateMaintenanceRunData,
    unknown
  >
  isCreateLoading: boolean
  createdMaintenanceRunId: string | null
  requiredPipette?: LoadedPipette
}
export const BeforeBeginning = (
  props: BeforeBeginningProps
): JSX.Element | null => {
  const {
    proceed,
    flowType,
    createMaintenanceRun,
    attachedPipettes,
    chainRunCommands,
    isCreateLoading,
    mount,
    isRobotMoving,
    errorMessage,
    setShowErrorMessage,
    selectedPipette,
    isOnDevice,
    requiredPipette,
    maintenanceRunId,
    createdMaintenanceRunId,
  } = props
  const { t } = useTranslation(['pipette_wizard_flows', 'shared'])
  useEffect(() => {
    if (createdMaintenanceRunId == null) {
      createMaintenanceRun({})
    }
  }, [])
  const pipetteId = attachedPipettes[mount]?.serialNumber
  const isGantryEmpty = getIsGantryEmpty(attachedPipettes)
  const isGantryEmptyFor96ChannelAttachment =
    isGantryEmpty &&
    selectedPipette === NINETY_SIX_CHANNEL &&
    flowType === FLOWS.ATTACH
  const deckConfig = useNotifyDeckConfigurationQuery().data
  const isWasteChuteOnDeck =
    deckConfig?.find(fixture => fixture.cutoutId === WASTE_CHUTE_CUTOUT) ??
    false

  const pipetteDisplayName = usePipetteNameSpecs(
    requiredPipette?.pipetteName as PipetteName
  )?.displayName

  if (
    pipetteId == null &&
    (flowType === FLOWS.CALIBRATE || flowType === FLOWS.DETACH)
  )
    return null

  let equipmentList = [CALIBRATION_PROBE]
  const proceedButtonText = t('move_gantry_to_front')
  const hexScrewdriverWithSubtitle = {
    ...HEX_SCREWDRIVER,
    subtitle: t('provided_with_robot'),
  }
  let bodyTranslationKey: string = ''

  switch (flowType) {
    case FLOWS.CALIBRATE: {
      bodyTranslationKey = 'remove_labware_to_get_started'
      break
    }
    case FLOWS.ATTACH: {
      bodyTranslationKey = 'remove_labware'
      let displayName: string | undefined
      if (requiredPipette != null) {
        displayName = pipetteDisplayName ?? requiredPipette.pipetteName
      }
      if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
        equipmentList = [
          { ...PIPETTE, displayName: displayName ?? PIPETTE.displayName },
          CALIBRATION_PROBE,
          hexScrewdriverWithSubtitle,
        ]
      } else {
        equipmentList = [
          {
            ...NINETY_SIX_CHANNEL_PIPETTE,
            displayName: displayName ?? NINETY_SIX_CHANNEL_PIPETTE.displayName,
          },
          CALIBRATION_PROBE,
          hexScrewdriverWithSubtitle,
          NINETY_SIX_CHANNEL_MOUNTING_PLATE,
        ]
      }
      break
    }
    case FLOWS.DETACH: {
      if (requiredPipette != null) {
        const displayName = pipetteDisplayName ?? requiredPipette.pipetteName
        bodyTranslationKey = 'remove_labware'

        if (requiredPipette.pipetteName === 'p1000_96') {
          equipmentList = [
            { ...NINETY_SIX_CHANNEL_PIPETTE, displayName },
            CALIBRATION_PROBE,
            hexScrewdriverWithSubtitle,
            NINETY_SIX_CHANNEL_MOUNTING_PLATE,
          ]
        } else {
          equipmentList = [
            { ...PIPETTE, displayName },
            CALIBRATION_PROBE,
            hexScrewdriverWithSubtitle,
          ]
        }
      } else {
        bodyTranslationKey = 'get_started_detach'
        equipmentList = [hexScrewdriverWithSubtitle]
      }
      break
    }
  }
  const rightHandBody = (
    <WizardRequiredEquipmentList width="100%" equipmentList={equipmentList} />
  )

  const handleOnClickCalibrateOrDetach = (): void => {
    let moveToFrontCommands: CreateCommand[] = [
      {
        commandType: 'loadPipette' as const,
        params: {
          pipetteName: attachedPipettes[mount]?.instrumentName ?? '',
          pipetteId: pipetteId ?? '',
          mount,
        },
      },
      { commandType: 'home' as const, params: {} },
      {
        commandType: 'calibration/moveToMaintenancePosition' as const,
        params: {
          mount,
        },
      },
    ]
    if (pipetteId == null) moveToFrontCommands = moveToFrontCommands.slice(1)
    chainRunCommands?.(moveToFrontCommands, false)
      .then(() => {
        proceed()
      })
      .catch(error => {
        setShowErrorMessage(error.message as string)
      })
  }

  const SingleMountAttachCommand: CreateCommand[] = [
    { commandType: 'home' as const, params: {} },
    {
      commandType: 'calibration/moveToMaintenancePosition' as const,
      params: {
        mount,
      },
    },
  ]

  const NinetySixChannelAttachCommand: CreateCommand[] = [
    { commandType: 'home' as const, params: {} },
    {
      commandType: 'calibration/moveToMaintenancePosition' as const,
      params: {
        mount: RIGHT,
        maintenancePosition: 'attachPlate',
      },
    },
  ]

  const handleOnClickAttach = (): void => {
    chainRunCommands?.(
      selectedPipette === SINGLE_MOUNT_PIPETTES
        ? SingleMountAttachCommand
        : NinetySixChannelAttachCommand,
      false
    )
      .then(() => {
        proceed()
      })
      .catch(error => {
        setShowErrorMessage(error.message as string)
      })
  }

  if (isRobotMoving)
    return <SimpleWizardInProgressBody description={t('stand_back')} />

  return errorMessage != null ? (
    <SimpleWizardBody
      isSuccess={false}
      iconColor={COLORS.red50}
      header={t('shared:error_encountered')}
      subHeader={errorMessage}
    />
  ) : (
    <GenericWizardTile
      header={t('before_you_begin')}
      rightHandBody={rightHandBody}
      bodyText={
        <>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing6}>
            <Trans
              t={t}
              i18nKey={bodyTranslationKey}
              components={{
                block: <LegacyStyledText css={BODY_STYLE} />,
              }}
            />
            {selectedPipette === NINETY_SIX_CHANNEL &&
              flowType === FLOWS.ATTACH &&
              !Boolean(isOnDevice) && (
                <LegacyStyledText css={BODY_STYLE}>
                  {t('pipette_heavy', { weight: WEIGHT_OF_96_CHANNEL })}
                </LegacyStyledText>
              )}
          </Flex>
          {selectedPipette === NINETY_SIX_CHANNEL &&
            (flowType === FLOWS.CALIBRATE || flowType === FLOWS.ATTACH ? (
              <Banner
                type={Boolean(isWasteChuteOnDeck) ? 'error' : 'warning'}
                size={Boolean(isOnDevice) ? '1.5rem' : '1rem'}
                marginTop={
                  Boolean(isOnDevice) ? SPACING.spacing24 : SPACING.spacing16
                }
              >
                {Boolean(isWasteChuteOnDeck)
                  ? t('waste_chute_error')
                  : t('waste_chute_warning')}
              </Banner>
            ) : (
              <Banner
                type="warning"
                size={Boolean(isOnDevice) ? '1.5rem' : '1rem'}
                marginTop={
                  Boolean(isOnDevice) ? SPACING.spacing24 : SPACING.spacing16
                }
              >
                {t('pipette_heavy', { weight: WEIGHT_OF_96_CHANNEL })}
              </Banner>
            ))}
        </>
      }
      proceedButtonText={proceedButtonText}
      proceedIsDisabled={isCreateLoading || maintenanceRunId == null}
      proceed={
        isGantryEmptyFor96ChannelAttachment ||
        (flowType === FLOWS.ATTACH && selectedPipette === SINGLE_MOUNT_PIPETTES)
          ? handleOnClickAttach
          : handleOnClickCalibrateOrDetach
      }
    />
  )
}
