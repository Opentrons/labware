import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeleteMaintenanceRunMutation } from '@opentrons/react-api-client'

import { TakeoverModal } from './TakeoverModal'
import { MaintenanceRunStatusProvider } from './MaintenanceRunStatusProvider'
import { useMaintenanceRunTakeover } from './useMaintenanceRunTakeover'

import type { ReactNode } from 'react'

interface MaintenanceRunTakeoverProps {
  children: ReactNode
}

export function MaintenanceRunTakeover({
  children,
}: MaintenanceRunTakeoverProps): JSX.Element {
  return (
    <MaintenanceRunStatusProvider>
      <MaintenanceRunTakeoverModal>{children}</MaintenanceRunTakeoverModal>
    </MaintenanceRunStatusProvider>
  )
}

interface MaintenanceRunTakeoverModalProps {
  children: ReactNode
}

export function MaintenanceRunTakeoverModal(
  props: MaintenanceRunTakeoverModalProps
): JSX.Element {
  const { i18n, t } = useTranslation(['shared', 'branded'])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [
    showConfirmTerminateModal,
    setShowConfirmTerminateModal,
  ] = useState<boolean>(false)

  const { oddRunId, currentRunId } = useMaintenanceRunTakeover().getRunIds()
  const isMaintenanceRunCurrent = currentRunId != null

  const desktopMaintenanceRunInProgress =
    isMaintenanceRunCurrent && oddRunId !== currentRunId

  const { deleteMaintenanceRun, reset } = useDeleteMaintenanceRunMutation()

  const handleCloseAndTerminate = (): void => {
    if (currentRunId != null) {
      setIsLoading(true)
      deleteMaintenanceRun(currentRunId)
    }
  }

  useEffect(() => {
    if (currentRunId == null) {
      setIsLoading(false)
      setShowConfirmTerminateModal(false)
      reset()
    }
  }, [currentRunId])

  return (
    <>
      {desktopMaintenanceRunInProgress && (
        <TakeoverModal
          title={i18n.format(t('robot_is_busy'), 'capitalize')}
          confirmTerminate={handleCloseAndTerminate}
          showConfirmTerminateModal={showConfirmTerminateModal}
          setShowConfirmTerminateModal={setShowConfirmTerminateModal}
          terminateInProgress={isLoading}
        />
      )}
      {props.children}
    </>
  )
}
