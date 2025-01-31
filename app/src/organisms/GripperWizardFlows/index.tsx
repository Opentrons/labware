import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useConditionalConfirm,
  Flex,
  DIRECTION_COLUMN,
  POSITION_ABSOLUTE,
  COLORS,
  BORDERS,
  ModalShell,
} from '@opentrons/components'
import {
  useCreateMaintenanceCommandMutation,
  useDeleteMaintenanceRunMutation,
} from '@opentrons/react-api-client'
import {
  useChainMaintenanceCommands,
  useNotifyCurrentMaintenanceRun,
} from '/app/resources/maintenance_runs'
import { getTopPortalEl } from '/app/App/portal'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { SimpleWizardBody } from '/app/molecules/SimpleWizardBody'
import { FirmwareUpdateModal } from '../FirmwareUpdateModal'
import { getIsOnDevice } from '/app/redux/config'
import { useCreateTargetedMaintenanceRunMutation } from '/app/resources/runs'
import { getGripperWizardSteps } from './getGripperWizardSteps'
import { GRIPPER_FLOW_TYPES, SECTIONS } from './constants'
import { BeforeBeginning } from './BeforeBeginning'
import { MovePin } from './MovePin'
import { MountGripper } from './MountGripper'
import { UnmountGripper } from './UnmountGripper'
import { Success } from './Success'
import { ExitConfirmation } from './ExitConfirmation'

import type { UseMutateFunction } from 'react-query'
import type { GripperWizardFlowType } from './types'
import type { AxiosError } from 'axios'
import type {
  CreateMaintenanceRunData,
  InstrumentData,
  MaintenanceRun,
  CommandData,
  RunStatus,
} from '@opentrons/api-client'
import { RUN_STATUS_FAILED } from '@opentrons/api-client'
import type { Coordinates, CreateCommand } from '@opentrons/shared-data'

const RUN_REFETCH_INTERVAL = 5000

interface MaintenanceRunManagerProps {
  flowType: GripperWizardFlowType
  attachedGripper: InstrumentData | null
  closeFlow: () => void
  onComplete?: () => void
}
export function GripperWizardFlows(
  props: MaintenanceRunManagerProps
): JSX.Element {
  const { flowType, closeFlow, attachedGripper } = props
  const {
    chainRunCommands,
    isCommandMutationLoading: isChainCommandMutationLoading,
  } = useChainMaintenanceCommands()
  const {
    createMaintenanceCommand,
    isLoading: isCommandLoading,
  } = useCreateMaintenanceCommandMutation()

  const [createdMaintenanceRunId, setCreatedMaintenanceRunId] = useState<
    string | null
  >(null)
  const [errorMessage, setErrorMessage] = useState<null | string>(null)

  // we should start checking for run deletion only after the maintenance run is created
  // and the useCurrentRun poll has returned that created id
  const [
    monitorMaintenanceRunForDeletion,
    setMonitorMaintenanceRunForDeletion,
  ] = useState<boolean>(false)

  const {
    createTargetedMaintenanceRun,
    isLoading: isCreateLoading,
  } = useCreateTargetedMaintenanceRunMutation({
    onSuccess: response => {
      setCreatedMaintenanceRunId(response.data.id)
    },
    onError: error => {
      setErrorMessage(error.message)
    },
  })

  const { data: maintenanceRunData } = useNotifyCurrentMaintenanceRun({
    refetchInterval: RUN_REFETCH_INTERVAL,
    enabled: createdMaintenanceRunId != null,
  })

  // this will close the modal in case the run was deleted by the terminate
  // activity modal on the ODD
  useEffect(() => {
    if (
      createdMaintenanceRunId !== null &&
      maintenanceRunData?.data.id === createdMaintenanceRunId
    ) {
      setMonitorMaintenanceRunForDeletion(true)
    }
    if (
      maintenanceRunData?.data.id !== createdMaintenanceRunId &&
      monitorMaintenanceRunForDeletion
    ) {
      closeFlow()
    }
  }, [
    maintenanceRunData?.data.id,
    maintenanceRunData?.data.status,
    createdMaintenanceRunId,
    monitorMaintenanceRunForDeletion,
    closeFlow,
  ])

  const [isExiting, setIsExiting] = useState<boolean>(false)

  const handleClose = (): void => {
    if (props?.onComplete != null) {
      props.onComplete()
    }
    if (maintenanceRunData != null) {
      deleteMaintenanceRun(maintenanceRunData?.data.id)
    }
    closeFlow()
  }

  const {
    deleteMaintenanceRun,
    isLoading: isDeleteLoading,
  } = useDeleteMaintenanceRunMutation({
    onSuccess: () => {
      closeFlow()
    },
    onError: () => {
      closeFlow()
    },
  })

  const handleCleanUpAndClose = (): void => {
    setIsExiting(true)

    if (maintenanceRunData?.data.id == null) {
      handleClose()
    } else {
      chainRunCommands(
        maintenanceRunData?.data.id,
        [{ commandType: 'home' as const, params: {} }],
        false
      )
        .catch(error => {
          setIsExiting(true)
          setErrorMessage(error.message as string)
        })
        .finally(() => {
          handleClose()
        })
    }
  }

  return (
    <GripperWizard
      flowType={flowType}
      createdMaintenanceRunId={createdMaintenanceRunId}
      maintenanceRunId={maintenanceRunData?.data.id}
      maintenanceRunStatus={maintenanceRunData?.data.status}
      attachedGripper={attachedGripper}
      createMaintenanceRun={createTargetedMaintenanceRun}
      isCreateLoading={isCreateLoading}
      isRobotMoving={
        isChainCommandMutationLoading ||
        isCommandLoading ||
        isExiting ||
        isDeleteLoading
      }
      handleCleanUpAndClose={handleCleanUpAndClose}
      handleClose={handleClose}
      chainRunCommands={chainRunCommands}
      createRunCommand={createMaintenanceCommand}
      errorMessage={errorMessage}
      setErrorMessage={setErrorMessage}
      isExiting={isExiting}
    />
  )
}

interface GripperWizardProps {
  flowType: GripperWizardFlowType
  maintenanceRunId?: string
  maintenanceRunStatus?: RunStatus
  createdMaintenanceRunId: string | null
  attachedGripper: InstrumentData | null
  createMaintenanceRun: UseMutateFunction<
    MaintenanceRun,
    AxiosError<any>,
    CreateMaintenanceRunData,
    unknown
  >
  isCreateLoading: boolean
  isRobotMoving: boolean
  isExiting: boolean
  setErrorMessage: (message: string | null) => void
  errorMessage: string | null
  handleCleanUpAndClose: () => void
  handleClose: () => void
  chainRunCommands: ReturnType<
    typeof useChainMaintenanceCommands
  >['chainRunCommands']
  createRunCommand: ReturnType<
    typeof useCreateMaintenanceCommandMutation
  >['createMaintenanceCommand']
}

export const GripperWizard = (
  props: GripperWizardProps
): JSX.Element | null => {
  const {
    flowType,
    maintenanceRunId,
    maintenanceRunStatus,
    createMaintenanceRun,
    handleCleanUpAndClose,
    handleClose,
    chainRunCommands,
    attachedGripper,
    isCreateLoading,
    isRobotMoving,
    createRunCommand,
    setErrorMessage,
    errorMessage,
    isExiting,
    createdMaintenanceRunId,
  } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t } = useTranslation('gripper_wizard_flows')
  const gripperWizardSteps = getGripperWizardSteps(flowType)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [frontJawOffset, setFrontJawOffset] = useState<Coordinates | null>(null)

  const totalStepCount = gripperWizardSteps.length - 1
  const currentStep = gripperWizardSteps?.[currentStepIndex]
  const isFinalStep = currentStepIndex === gripperWizardSteps.length - 1
  const goBack = (): void => {
    setCurrentStepIndex(isFinalStep ? currentStepIndex : currentStepIndex - 1)
  }

  const handleProceed = (): void => {
    if (isFinalStep) {
      handleCleanUpAndClose()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  let chainMaintenanceRunCommands

  if (maintenanceRunId != null) {
    chainMaintenanceRunCommands = (
      commands: CreateCommand[],
      continuePastCommandFailure: boolean
    ): Promise<CommandData[]> =>
      chainRunCommands(maintenanceRunId, commands, continuePastCommandFailure)
  }

  const sharedProps = {
    maintenanceRunStatus,
    flowType,
    maintenanceRunId:
      maintenanceRunId != null && createdMaintenanceRunId === maintenanceRunId
        ? maintenanceRunId
        : undefined,
    isCreateLoading,
    isRobotMoving,
    attachedGripper,
    proceed: handleProceed,
    goBack,
    chainRunCommands: chainMaintenanceRunCommands,
    setErrorMessage,
    errorMessage,
  }
  let onExit
  if (currentStep == null) return null
  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  if (showConfirmExit && maintenanceRunId !== null) {
    modalContent = (
      <ExitConfirmation
        handleGoBack={cancelExit}
        handleExit={confirmExit}
        flowType={flowType}
        isRobotMoving={isRobotMoving}
      />
    )
  }
  // These flows often have custom error messaging, so this fallback modal is shown only in specific circumstances.
  else if (
    (isExiting && errorMessage != null) ||
    maintenanceRunStatus === RUN_STATUS_FAILED ||
    (errorMessage != null && createdMaintenanceRunId == null)
  ) {
    onExit = handleClose
    modalContent = (
      <SimpleWizardBody
        isSuccess={false}
        iconColor={COLORS.red50}
        header={t('shared:error_encountered')}
        subHeader={errorMessage ?? undefined}
      />
    )
  } else if (currentStep.section === SECTIONS.BEFORE_BEGINNING) {
    onExit = handleCleanUpAndClose
    modalContent = (
      <BeforeBeginning
        {...currentStep}
        {...sharedProps}
        createMaintenanceRun={createMaintenanceRun}
        createdMaintenanceRunId={createdMaintenanceRunId}
      />
    )
  } else if (currentStep.section === SECTIONS.MOVE_PIN) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MovePin
        {...currentStep}
        {...sharedProps}
        {...{ setFrontJawOffset, frontJawOffset, createRunCommand, isExiting }}
      />
    )
  } else if (currentStep.section === SECTIONS.MOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MountGripper {...currentStep} {...sharedProps} />
    )
  } else if (currentStep.section === SECTIONS.FIRMWARE_UPDATE) {
    onExit = confirmExit
    modalContent = modalContent = (
      <FirmwareUpdateModal
        proceed={handleProceed}
        subsystem="gripper"
        description={t('firmware_updating')}
        proceedDescription={t('firmware_up_to_date')}
        isOnDevice={isOnDevice}
      />
    )
  } else if (currentStep.section === SECTIONS.UNMOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <UnmountGripper {...currentStep} {...sharedProps} />
    )
  } else if (currentStep.section === SECTIONS.SUCCESS) {
    onExit = confirmExit
    modalContent = modalContent = (
      <Success
        isRobotMoving={isRobotMoving}
        {...currentStep}
        proceed={handleProceed}
      />
    )
  }

  const titleByFlowType: { [flowType in GripperWizardFlowType]: string } = {
    [GRIPPER_FLOW_TYPES.RECALIBRATE]: t('calibrate_gripper'),
    [GRIPPER_FLOW_TYPES.ATTACH]: t('attach_gripper'),
    [GRIPPER_FLOW_TYPES.DETACH]: t('detach_gripper'),
  }
  let handleExit = onExit
  if (isRobotMoving) {
    handleExit = undefined
  } else if (showConfirmExit || errorMessage != null) {
    handleExit = handleCleanUpAndClose
  }

  const wizardHeader = (
    <WizardHeader
      title={titleByFlowType[flowType]}
      currentStep={currentStepIndex + 1}
      totalSteps={totalStepCount + 1}
      onExit={handleExit}
    />
  )

  return createPortal(
    isOnDevice ? (
      <Flex
        flexDirection={DIRECTION_COLUMN}
        width="992px"
        height="568px"
        left="14.5px"
        top="16px"
        border={BORDERS.lineBorder}
        boxShadow={BORDERS.shadowSmall}
        borderRadius={BORDERS.borderRadius8}
        position={POSITION_ABSOLUTE}
        backgroundColor={COLORS.white}
      >
        {wizardHeader}
        {modalContent}
      </Flex>
    ) : (
      <ModalShell width="48rem" header={wizardHeader}>
        {modalContent}
      </ModalShell>
    ),
    getTopPortalEl()
  )
}
