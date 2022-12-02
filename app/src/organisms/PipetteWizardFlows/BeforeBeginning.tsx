import * as React from 'react'
import { UseMutateFunction } from 'react-query'
import { COLORS } from '@opentrons/components'
import {
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'
import { Trans, useTranslation } from 'react-i18next'
import { StyledText } from '../../atoms/text'
import { Banner } from '../../atoms/Banner'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { GenericWizardTile } from '../../molecules/GenericWizardTile'
import { InProgressModal } from '../../molecules/InProgressModal/InProgressModal'
import { WizardRequiredEquipmentList } from '../../molecules/WizardRequiredEquipmentList'
import {
  CALIBRATION_PROBE,
  FLOWS,
  PIPETTE,
  HEX_SCREWDRIVER,
  NINETY_SIX_CHANNEL_MOUNTING_PLATE,
  NINETY_SIX_CHANNEL_PIPETTE,
} from './constants'
import type { Run, CreateRunData } from '@opentrons/api-client'
import type { PipetteWizardStepProps } from './types'
import type { AxiosError } from 'axios'

interface BeforeBeginningProps extends PipetteWizardStepProps {
  createRun: UseMutateFunction<Run, AxiosError<any>, CreateRunData, unknown>
  isCreateLoading: boolean
}

export const BeforeBeginning = (
  props: BeforeBeginningProps
): JSX.Element | null => {
  const {
    proceed,
    flowType,
    createRun,
    attachedPipette,
    chainRunCommands,
    isCreateLoading,
    mount,
    isRobotMoving,
    errorMessage,
    setShowErrorMessage,
    selectedPipette,
  } = props
  const { t } = useTranslation('pipette_wizard_flows')
  React.useEffect(() => {
    createRun({})
  }, [])

  const pipetteId = attachedPipette[mount]?.id

  if (
    pipetteId == null &&
    (flowType === FLOWS.CALIBRATE || flowType === FLOWS.DETACH)
  )
    return null

  let equipmentList = [CALIBRATION_PROBE]
  let proceedButtonText: string = t('get_started')
  let bodyText: string = ''

  switch (flowType) {
    case FLOWS.CALIBRATE: {
      bodyText = t('remove_labware_to_get_started')
      break
    }
    case FLOWS.ATTACH: {
      equipmentList = [PIPETTE, CALIBRATION_PROBE, HEX_SCREWDRIVER]
      proceedButtonText = t('move_gantry_to_front')
      bodyText = t('remove_labware')
      break
    }
    case FLOWS.DETACH: {
      equipmentList = [HEX_SCREWDRIVER]
      bodyText = t('get_started_detach')
      bodyText = t('remove_labware')
      proceedButtonText = t('move_gantry_to_front')
      if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
        equipmentList = [PIPETTE, CALIBRATION_PROBE, HEX_SCREWDRIVER]
      } else {
        equipmentList = [
          NINETY_SIX_CHANNEL_PIPETTE,
          CALIBRATION_PROBE,
          HEX_SCREWDRIVER,
          NINETY_SIX_CHANNEL_MOUNTING_PLATE,
        ]
      }
      break
    }
    case FLOWS.DETACH: {
      bodyText = t('get_started_flow')
      if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
        equipmentList = [HEX_SCREWDRIVER]
      } else {
        equipmentList = [CALIBRATION_PROBE, HEX_SCREWDRIVER]
      }
      break
    }
  }
  const rightHandBody = (
    <WizardRequiredEquipmentList width="100%" equipmentList={equipmentList} />
  )

  const handleOnClickCalibrateOrDetach = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'home' as const,
          params: {},
        },
        {
          commandType: 'loadPipette' as const,
          params: {
            // @ts-expect-error pipetteName is required but missing in schema v6 type
            pipetteName: attachedPipette[mount]?.name,
            pipetteId: pipetteId,
            mount: mount,
          },
        },
        {
          // @ts-expect-error calibration type not yet supported
          commandType: 'calibration/moveToLocation' as const,
          params: {
            pipetteId: pipetteId,
            location: 'attachOrDetach',
          },
        },
      ],
      false
    )
      .then(() => {
        proceed()
      })
      .catch(error => {
        setShowErrorMessage(error.message)
      })
  }

  const handleOnClickAttach = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'home' as const,
          params: {},
        },
        //  TODO(jr 11/17/22): move to location needs to be added
      ],
      false
    )
      .then(() => {
        proceed()
      })
      .catch(error => {
        setShowErrorMessage(error.message)
      })
  }

  if (isRobotMoving) return <InProgressModal description={t('stand_back')} />

  return errorMessage != null ? (
    <SimpleWizardBody
      isSuccess={false}
      iconColor={COLORS.errorEnabled}
      header={t('error_encountered')}
      subHeader={errorMessage}
    />
  ) : (
    <GenericWizardTile
      header={t('before_you_begin')}
      //  TODO(jr, 11/3/22): wire up this URL and unhide the link!
      // getHelp={BEFORE_YOU_BEGIN_URL}
      rightHandBody={rightHandBody}
      bodyText={
        <>
          <Trans
            t={t}
            i18nKey={bodyText}
            components={{ block: <StyledText as="p" /> }}
          />
          {selectedPipette === NINETY_SIX_CHANNEL &&
          (flowType === FLOWS.DETACH || flowType === FLOWS.ATTACH) ? (
            <Banner type="warning">{t('pipette_heavy')}</Banner>
          ) : null}
        </>
      }
      proceedButtonText={proceedButtonText}
      proceedIsDisabled={isCreateLoading}
      proceed={
        flowType === FLOWS.ATTACH
          ? handleOnClickAttach
          : handleOnClickCalibrateOrDetach
      }
    />
  )
}
