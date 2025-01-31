import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { COLORS, LegacyStyledText } from '@opentrons/components'
import { EXTENSION } from '@opentrons/shared-data'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import {
  SimpleWizardBody,
  SimpleWizardInProgressBody,
} from '/app/molecules/SimpleWizardBody'
import { WizardRequiredEquipmentList } from '/app/molecules/WizardRequiredEquipmentList'
import {
  GRIPPER_FLOW_TYPES,
  SCREWDRIVER_LOADNAME,
  GRIPPER_LOADNAME,
  CAL_PIN_LOADNAME,
  CALIBRATION_PIN_DISPLAY_NAME,
  HEX_SCREWDRIVER_DISPLAY_NAME,
} from './constants'

import type { UseMutateFunction } from 'react-query'
import type { AxiosError } from 'axios'
import type { CreateCommand } from '@opentrons/shared-data'
import type {
  CreateMaintenanceRunData,
  MaintenanceRun,
} from '@opentrons/api-client'
import type { GripperWizardFlowType, GripperWizardStepProps } from './types'

interface BeforeBeginningInfo {
  bodyI18nKey: string
  equipmentLoadNames: string[]
}

const INFO_BY_FLOW_TYPE: {
  [flowType in GripperWizardFlowType]: BeforeBeginningInfo
} = {
  [GRIPPER_FLOW_TYPES.ATTACH]: {
    bodyI18nKey: 'remove_labware_to_get_started_attaching',
    equipmentLoadNames: [
      GRIPPER_LOADNAME,
      SCREWDRIVER_LOADNAME,
      CAL_PIN_LOADNAME,
    ],
  },
  [GRIPPER_FLOW_TYPES.DETACH]: {
    bodyI18nKey: 'remove_labware_to_get_started_detaching',
    equipmentLoadNames: [SCREWDRIVER_LOADNAME],
  },
  [GRIPPER_FLOW_TYPES.RECALIBRATE]: {
    bodyI18nKey: 'remove_labware_to_get_started_recalibrating',
    equipmentLoadNames: [GRIPPER_LOADNAME, CAL_PIN_LOADNAME],
  },
}
interface BeforeBeginningProps extends GripperWizardStepProps {
  createMaintenanceRun: UseMutateFunction<
    MaintenanceRun,
    AxiosError<any>,
    CreateMaintenanceRunData,
    unknown
  >
  isCreateLoading: boolean
  createdMaintenanceRunId: string | null
}

export const BeforeBeginning = (
  props: BeforeBeginningProps
): JSX.Element | null => {
  const {
    proceed,
    createMaintenanceRun,
    flowType,
    isCreateLoading,
    isRobotMoving,
    chainRunCommands,
    errorMessage,
    maintenanceRunId,
    setErrorMessage,
    createdMaintenanceRunId,
  } = props
  const { t } = useTranslation(['gripper_wizard_flows', 'shared', 'branded'])
  useEffect(() => {
    if (createdMaintenanceRunId == null) {
      createMaintenanceRun({})
    }
  }, [])

  const commandsOnProceed: CreateCommand[] = [
    { commandType: 'home' as const, params: {} },
    {
      commandType: 'calibration/moveToMaintenancePosition' as const,
      params: {
        mount: EXTENSION,
      },
    },
  ]

  const handleOnClick = (): void => {
    chainRunCommands?.(commandsOnProceed, false)
      .then(() => {
        proceed()
      })
      .catch(error => {
        setErrorMessage(error.message as string)
      })
  }

  const equipmentInfoByLoadName: {
    [loadName: string]: { displayName: string; subtitle?: string }
  } = {
    calibration_pin: { displayName: CALIBRATION_PIN_DISPLAY_NAME },
    hex_screwdriver: {
      displayName: HEX_SCREWDRIVER_DISPLAY_NAME,
      subtitle: t('provided_with_robot_use_right_size'),
    },
    [GRIPPER_LOADNAME]: { displayName: t('branded:gripper') },
  }

  const { bodyI18nKey, equipmentLoadNames } = INFO_BY_FLOW_TYPE[flowType]
  const equipmentList = equipmentLoadNames.map(loadName => {
    const { displayName, subtitle } = equipmentInfoByLoadName[loadName]
    return { loadName, displayName, subtitle }
  })

  if (isRobotMoving)
    return (
      <SimpleWizardInProgressBody
        description={t('shared:stand_back_robot_is_in_motion')}
      />
    )
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
      //  TODO(BC, 11/8/22): wire up this URL and unhide the link!
      // getHelp={BEFORE_YOU_BEGIN_URL}
      rightHandBody={
        <WizardRequiredEquipmentList equipmentList={equipmentList} />
      }
      bodyText={
        <Trans
          t={t}
          i18nKey={bodyI18nKey}
          components={{ block: <LegacyStyledText as="p" /> }}
        />
      }
      proceedButtonText={t('move_gantry_to_front')}
      proceedIsDisabled={isCreateLoading || maintenanceRunId == null}
      proceed={handleOnClick}
    />
  )
}
