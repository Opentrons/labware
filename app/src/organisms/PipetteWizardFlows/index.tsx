import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import {
  useConditionalConfirm,
  COLORS,
  ModalShell,
} from '@opentrons/components'
import { LEFT, NINETY_SIX_CHANNEL, RIGHT } from '@opentrons/shared-data'
import {
  useHost,
  useDeleteMaintenanceRunMutation,
  ApiHostProvider,
} from '@opentrons/react-api-client'

import { useCreateTargetedMaintenanceRunMutation } from '/app/resources/runs'
import {
  useChainMaintenanceCommands,
  useNotifyCurrentMaintenanceRun,
} from '/app/resources/maintenance_runs'
import { getTopPortalEl } from '/app/App/portal'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { FirmwareUpdateModal } from '../FirmwareUpdateModal'
import { getIsOnDevice } from '/app/redux/config'
import { SimpleWizardBody } from '/app/molecules/SimpleWizardBody'
import { useAttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import { usePipetteFlowWizardHeaderText } from './hooks'
import { getPipetteWizardSteps } from './getPipetteWizardSteps'
import { getPipetteWizardStepsForProtocol } from './getPipetteWizardStepsForProtocol'
import { FLOWS, SECTIONS } from './constants'
import { BeforeBeginning } from './BeforeBeginning'
import { AttachProbe } from './AttachProbe'
import { DetachProbe } from './DetachProbe'
import { Results } from './Results'
import { ExitModal } from './ExitModal'
import { MountPipette } from './MountPipette'
import { DetachPipette } from './DetachPipette'
import { Carriage } from './Carriage'
import { MountingPlate } from './MountingPlate'
import { UnskippableModal } from './UnskippableModal'

import type {
  LoadedPipette,
  CreateCommand,
  PipetteMount,
} from '@opentrons/shared-data'
import type { CommandData, HostConfig } from '@opentrons/api-client'
import { RUN_STATUS_FAILED } from '@opentrons/api-client'
import type { PipetteWizardFlow, SelectablePipettes } from './types'

const RUN_REFETCH_INTERVAL = 5000

interface PipetteWizardFlowsProps {
  flowType: PipetteWizardFlow
  mount: PipetteMount
  selectedPipette: SelectablePipettes
  closeFlow: () => void
  onComplete?: () => void
  pipetteInfo?: LoadedPipette[]
}

export const PipetteWizardFlows = (
  props: PipetteWizardFlowsProps
): JSX.Element | null => {
  const { flowType, mount, closeFlow, selectedPipette, onComplete } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t } = useTranslation('pipette_wizard_flows')

  const attachedPipettes = useAttachedPipettesFromInstrumentsQuery()
  const memoizedPipetteInfo = useMemo(() => props.pipetteInfo ?? null, [])
  const isGantryEmpty = useMemo(
    () => attachedPipettes[LEFT] == null && attachedPipettes[RIGHT] == null,
    []
  )

  const pipetteWizardSteps = useMemo(
    () =>
      memoizedPipetteInfo == null
        ? getPipetteWizardSteps(flowType, mount, selectedPipette, isGantryEmpty)
        : getPipetteWizardStepsForProtocol(
            attachedPipettes,
            memoizedPipetteInfo,
            mount
          ),
    []
  )
  const requiredPipette = memoizedPipetteInfo?.find(
    pipette => pipette.mount === mount
  )
  const host = useHost()
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const totalStepCount =
    pipetteWizardSteps != null ? pipetteWizardSteps.length - 1 : 0
  const currentStep = pipetteWizardSteps?.[currentStepIndex] ?? null
  const [isFetchingPipettes, setIsFetchingPipettes] = useState<boolean>(false)
  const memoizedAttachedPipettes = useMemo(() => attachedPipettes, [])
  const hasCalData =
    memoizedAttachedPipettes[mount]?.data.calibratedOffset?.last_modified !=
    null
  const wizardTitle = usePipetteFlowWizardHeaderText({
    flowType,
    mount,
    selectedPipette,
    hasCalData,
    isGantryEmpty,
    attachedPipettes: memoizedAttachedPipettes,
    pipetteInfo: memoizedPipetteInfo,
  })
  const memoizedWizardTitle = useMemo(() => wizardTitle, [])
  const [createdMaintenanceRunId, setCreatedMaintenanceRunId] = useState<
    string | null
  >(null)
  const [errorMessage, setShowErrorMessage] = useState<null | string>(null)
  // we should start checking for run deletion only after the maintenance run is created
  // and the useCurrentRun poll has returned that created id
  const [
    monitorMaintenanceRunForDeletion,
    setMonitorMaintenanceRunForDeletion,
  ] = useState<boolean>(false)

  const goBack = (): void => {
    setCurrentStepIndex(
      currentStepIndex !== totalStepCount ? 0 : currentStepIndex
    )
  }
  const { data: maintenanceRunData } = useNotifyCurrentMaintenanceRun({
    refetchInterval: RUN_REFETCH_INTERVAL,
    enabled: createdMaintenanceRunId != null,
  })

  const {
    chainRunCommands,
    isCommandMutationLoading,
  } = useChainMaintenanceCommands()

  const {
    createTargetedMaintenanceRun,
    isLoading: isCreateLoading,
  } = useCreateTargetedMaintenanceRunMutation(
    {
      onSuccess: response => {
        setCreatedMaintenanceRunId(response.data.id)
      },
      onError: error => {
        setShowErrorMessage(error.message)
      },
    },
    host
  )

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
    createdMaintenanceRunId,
    monitorMaintenanceRunForDeletion,
    closeFlow,
  ])

  const [isExiting, setIsExiting] = useState<boolean>(false)
  const proceed = (): void => {
    if (!isCommandMutationLoading) {
      setCurrentStepIndex(
        currentStepIndex !== totalStepCount
          ? currentStepIndex + 1
          : currentStepIndex
      )
    }
  }
  const handleClose = (): void => {
    if (onComplete != null) {
      onComplete()
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
    if (maintenanceRunData?.data.id == null) handleClose()
    else {
      chainRunCommands(
        maintenanceRunData?.data.id,
        [{ commandType: 'home' as const, params: {} }],
        false
      )
        .catch(error => {
          setIsExiting(true)
          setShowErrorMessage(error.message as string)
        })
        .finally(() => {
          handleClose()
        })
    }
  }
  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  let chainMaintenanceRunCommands
  if (maintenanceRunData?.data.id != null) {
    chainMaintenanceRunCommands = (
      commands: CreateCommand[],
      continuePastCommandFailure: boolean
    ): Promise<CommandData[]> =>
      chainRunCommands(
        maintenanceRunData.data.id,
        commands,
        continuePastCommandFailure
      )
  }

  const maintenanceRunId =
    maintenanceRunData?.data.id != null &&
    maintenanceRunData?.data.id === createdMaintenanceRunId
      ? createdMaintenanceRunId
      : undefined
  const calibrateBaseProps = {
    chainRunCommands: chainMaintenanceRunCommands,
    isRobotMoving: isCommandMutationLoading || isDeleteLoading,
    proceed,
    maintenanceRunId,
    goBack,
    attachedPipettes,
    setShowErrorMessage,
    errorMessage,
    selectedPipette,
    isOnDevice,
  }
  const is96ChannelUnskippableStep =
    currentStep?.section === SECTIONS.CARRIAGE ||
    currentStep?.section === SECTIONS.MOUNTING_PLATE ||
    (selectedPipette === NINETY_SIX_CHANNEL &&
      currentStep?.section === SECTIONS.DETACH_PIPETTE)

  const exitModal = is96ChannelUnskippableStep ? (
    <UnskippableModal
      proceed={handleCleanUpAndClose}
      goBack={cancelExit}
      isOnDevice={isOnDevice}
      isRobotMoving={isCommandMutationLoading || isDeleteLoading}
    />
  ) : (
    <ExitModal
      isRobotMoving={isCommandMutationLoading || isDeleteLoading}
      goBack={cancelExit}
      proceed={handleCleanUpAndClose}
      flowType={flowType}
      isOnDevice={isOnDevice}
    />
  )

  if (currentStep == null) {
    return null
  }

  const isFatalError =
    (isExiting && errorMessage != null) ||
    maintenanceRunData?.data.status === RUN_STATUS_FAILED ||
    (errorMessage != null && createdMaintenanceRunId == null)

  let onExit: () => void
  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  // These flows often have custom error messaging, so this fallback modal is shown only in specific circumstances.
  if (isFatalError) {
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
        {...calibrateBaseProps}
        createMaintenanceRun={createTargetedMaintenanceRun}
        createdMaintenanceRunId={createdMaintenanceRunId}
        isCreateLoading={isCreateLoading}
        requiredPipette={requiredPipette}
      />
    )
  } else if (currentStep.section === SECTIONS.ATTACH_PROBE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <AttachProbe
        {...currentStep}
        {...calibrateBaseProps}
        isExiting={isExiting}
      />
    )
  } else if (currentStep.section === SECTIONS.DETACH_PROBE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <DetachProbe
        {...currentStep}
        {...calibrateBaseProps}
        proceed={errorMessage != null ? handleCleanUpAndClose : proceed}
      />
    )
  } else if (currentStep.section === SECTIONS.RESULTS) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <Results
        {...currentStep}
        {...calibrateBaseProps}
        handleCleanUpAndClose={handleCleanUpAndClose}
        currentStepIndex={currentStepIndex}
        totalStepCount={totalStepCount}
        isFetching={isFetchingPipettes}
        setFetching={setIsFetchingPipettes}
        hasCalData={hasCalData}
        requiredPipette={requiredPipette}
      />
    )
  } else if (currentStep.section === SECTIONS.MOUNT_PIPETTE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <MountPipette
        {...currentStep}
        {...calibrateBaseProps}
        isFetching={isFetchingPipettes}
        setFetching={setIsFetchingPipettes}
      />
    )
  } else if (currentStep.section === SECTIONS.FIRMWARE_UPDATE) {
    modalContent = (
      <FirmwareUpdateModal
        proceed={proceed}
        subsystem={
          currentStep.mount === LEFT ? 'pipette_left' : 'pipette_right'
        }
        description={t('firmware_updating')}
        proceedDescription={t('firmware_up_to_date')}
        isOnDevice={isOnDevice}
      />
    )
  } else if (currentStep.section === SECTIONS.DETACH_PIPETTE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <DetachPipette
        {...currentStep}
        {...calibrateBaseProps}
        isFetching={isFetchingPipettes}
        setFetching={setIsFetchingPipettes}
      />
    )
  } else if (currentStep.section === SECTIONS.CARRIAGE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <Carriage {...currentStep} {...calibrateBaseProps} />
    )
  } else if (currentStep.section === SECTIONS.MOUNTING_PLATE) {
    onExit = confirmExit
    modalContent = showConfirmExit ? (
      exitModal
    ) : (
      <MountingPlate {...currentStep} {...calibrateBaseProps} />
    )
  }

  const buildWizardOnExit = (): (() => void) => {
    if (isFatalError || showConfirmExit) {
      return handleCleanUpAndClose
    } else {
      return onExit
    }
  }

  const progressBarForCalError =
    currentStep.section === SECTIONS.DETACH_PROBE && errorMessage != null

  const wizardHeader = (
    <WizardHeader
      title={memoizedWizardTitle}
      currentStep={
        progressBarForCalError ? currentStepIndex - 1 : currentStepIndex
      }
      totalSteps={totalStepCount}
      onExit={buildWizardOnExit()}
      exitDisabled={isCommandMutationLoading || isFetchingPipettes}
    />
  )

  return createPortal(
    isOnDevice ? (
      <ModalShell>
        {wizardHeader}
        {modalContent}
      </ModalShell>
    ) : (
      <ModalShell
        width="47rem"
        height={
          //  changing modal height for now on BeforeBeginning 96 channel attach flow
          //  until we do design qa to normalize the modal sizes
          currentStep.section === SECTIONS.BEFORE_BEGINNING &&
          selectedPipette === NINETY_SIX_CHANNEL &&
          flowType === FLOWS.ATTACH
            ? '30rem'
            : 'auto'
        }
        header={wizardHeader}
      >
        {modalContent}
      </ModalShell>
    ),
    getTopPortalEl()
  )
}

type PipetteWizardFlowsPropsWithHost = PipetteWizardFlowsProps & {
  host: HostConfig
}

export const handlePipetteWizardFlows = (
  props: PipetteWizardFlowsPropsWithHost
): void => {
  NiceModal.show(NiceModalPipetteWizardFlows, props)
}

const NiceModalPipetteWizardFlows = NiceModal.create(
  (props: PipetteWizardFlowsPropsWithHost): JSX.Element => {
    const modal = useModal()
    const closeFlowAndModal = (): void => {
      props.closeFlow()
      modal.remove()
    }

    return (
      <ApiHostProvider {...props.host}>
        <PipetteWizardFlows {...props} closeFlow={closeFlowAndModal} />
      </ApiHostProvider>
    )
  }
)
