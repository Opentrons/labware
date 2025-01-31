import { useRunCommandErrors } from '@opentrons/react-api-client'

import { isTerminalRunStatus } from '../utils'
import { getHighestPriorityError } from '/app/transformations/runs'

import type { RunStatus, Run } from '@opentrons/api-client'
import type { RunCommandError } from '@opentrons/shared-data'

// A reasonably high number of commands that a user would realistically care to examine.
const ALL_COMMANDS_PAGE_LENGTH = 100

interface UseRunErrorsProps {
  runId: string
  runStatus: RunStatus | null
  runRecord: Run | null
}

export interface UseRunErrorsResult {
  commandErrorList: RunCommandError[] | null
  highestPriorityError: RunCommandError | null
}

// During a run, a single error or multiple errors may occur, and currently, these are managed under separate endpoints.
export function useRunErrors({
  runId,
  runRecord,
  runStatus,
}: UseRunErrorsProps): UseRunErrorsResult {
  const { data: commandErrorList } = useRunCommandErrors(
    runId,
    { cursor: 0, pageLength: ALL_COMMANDS_PAGE_LENGTH },
    {
      enabled: isTerminalRunStatus(runStatus),
    }
  )

  const highestPriorityError =
    runRecord?.data.errors?.[0] != null
      ? getHighestPriorityError(runRecord.data.errors as RunCommandError[])
      : null

  return {
    commandErrorList: commandErrorList?.data ?? null,
    highestPriorityError,
  }
}
