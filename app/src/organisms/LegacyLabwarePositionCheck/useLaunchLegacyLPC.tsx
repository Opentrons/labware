import { useState } from 'react'

import {
  useCreateMaintenanceRunLabwareDefinitionMutation,
  useDeleteMaintenanceRunMutation,
} from '@opentrons/react-api-client'

import {
  useCreateTargetedMaintenanceRunMutation,
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { LegacyLabwarePositionCheck } from '.'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'

import type { RobotType } from '@opentrons/shared-data'

export function useLaunchLegacyLPC(
  runId: string,
  robotType: RobotType,
  protocolName?: string
): { launchLegacyLPC: () => void; LegacyLPCWizard: JSX.Element | null } {
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const {
    createTargetedMaintenanceRun,
  } = useCreateTargetedMaintenanceRunMutation()
  const {
    deleteMaintenanceRun,
    isLoading: isDeletingMaintenanceRun,
  } = useDeleteMaintenanceRunMutation()
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const [maintenanceRunId, setMaintenanceRunId] = useState<string | null>(null)
  const currentOffsets = runRecord?.data?.labwareOffsets ?? []
  const {
    createLabwareDefinition,
  } = useCreateMaintenanceRunLabwareDefinitionMutation()

  const handleCloseLPC = (): void => {
    if (maintenanceRunId != null) {
      deleteMaintenanceRun(maintenanceRunId, {
        onSettled: () => {
          setMaintenanceRunId(null)
        },
      })
    }
  }
  return {
    launchLegacyLPC: () =>
      createTargetedMaintenanceRun({
        labwareOffsets: currentOffsets.map(
          ({ vector, location, definitionUri }) => ({
            vector,
            location,
            definitionUri,
          })
        ),
      }).then(maintenanceRun =>
        // TODO(BC, 2023-05-15): replace this with a call to the protocol run's GET labware_definitions
        // endpoint once it's made we should be adding the definitions to the maintenance run by
        // reading from the current protocol run, and not from the analysis
        Promise.all(
          getLabwareDefinitionsFromCommands(
            mostRecentAnalysis?.commands ?? []
          ).map(def => {
            createLabwareDefinition({
              maintenanceRunId: maintenanceRun?.data?.id,
              labwareDef: def,
            })
          })
        ).then(() => {
          setMaintenanceRunId(maintenanceRun.data.id)
        })
      ),
    LegacyLPCWizard:
      maintenanceRunId != null ? (
        <LegacyLabwarePositionCheck
          onCloseClick={handleCloseLPC}
          runId={runId}
          mostRecentAnalysis={mostRecentAnalysis}
          existingOffsets={runRecord?.data?.labwareOffsets ?? []}
          maintenanceRunId={maintenanceRunId}
          setMaintenanceRunId={setMaintenanceRunId}
          protocolName={protocolName ?? ''}
          robotType={robotType}
          isDeletingMaintenanceRun={isDeletingMaintenanceRun}
        />
      ) : null,
  }
}
