import * as React from 'react'
import { UseMutateFunction } from 'react-query'
import { COLORS } from '@opentrons/components'
import { Trans, useTranslation } from 'react-i18next'
import { StyledText } from '../../atoms/text'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { GenericWizardTile } from '../../molecules/GenericWizardTile'
import { InProgressModal } from '../../molecules/InProgressModal/InProgressModal'
import { WizardRequiredEquipmentList } from '../../molecules/WizardRequiredEquipmentList'
import { CALIBRATION_PROBE, FLOWS } from './constants'
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
  } = props
  const { t } = useTranslation('pipette_wizard_flows')
  React.useEffect(() => {
    createRun({})
  }, [])

  const pipetteId = attachedPipette[mount]?.id
  if (pipetteId == null && flowType === FLOWS.CALIBRATE) return null
  const handleOnClick = (): void => {
    const pipetteName = attachedPipette[mount]?.name
    if (pipetteName != null) {
      chainRunCommands(
        [
          {
            commandType: 'home' as const,
            params: {},
          },
          {
            commandType: 'loadPipette' as const,
            params: {
              pipetteName: pipetteName,
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
    } else {
      setShowErrorMessage('No pipette attached')
    }
  }
  //  TODO(jr, 10/26/22): when we wire up other flows, const will turn into let
  //  for proceedButtonText and rightHandBody
  const proceedButtonText: string = t('get_started')
  const rightHandBody = (
    <WizardRequiredEquipmentList
      width="100%"
      equipmentList={[CALIBRATION_PROBE]}
    />
  )
  switch (flowType) {
    case FLOWS.CALIBRATE: {
      break
    }
    //  TODO(jr, 10/26/22): wire up the other flows
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
        <Trans
          t={t}
          i18nKey="remove_labware_to_get_started"
          components={{ block: <StyledText as="p" /> }}
        />
      }
      proceedButtonText={proceedButtonText}
      proceedIsDisabled={isCreateLoading}
      proceed={handleOnClick}
    />
  )
}
