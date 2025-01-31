import { useMutation, useQueryClient } from 'react-query'
import { createLabwareOffset } from '@opentrons/api-client'
import { useHost } from '../api'
import type {
  HostConfig,
  Run,
  LegacyLabwareOffsetCreateData,
} from '@opentrons/api-client'
import type { UseMutationResult, UseMutateAsyncFunction } from 'react-query'

interface CreateLabwareOffsetParams {
  runId: string
  data: LegacyLabwareOffsetCreateData
}

export type UseCreateLabwareOffsetMutationResult = UseMutationResult<
  Run,
  unknown,
  CreateLabwareOffsetParams
> & {
  createLabwareOffset: UseMutateAsyncFunction<
    Run,
    unknown,
    CreateLabwareOffsetParams
  >
}

export function useCreateLabwareOffsetMutation(): UseCreateLabwareOffsetMutationResult {
  const host = useHost()
  const queryClient = useQueryClient()

  const mutation = useMutation<Run, unknown, CreateLabwareOffsetParams>(
    ({ runId, data }) =>
      createLabwareOffset(host as HostConfig, runId, data)
        .then(response => {
          queryClient.invalidateQueries([host, 'runs']).catch((e: Error) => {
            console.error(`error invalidating runs query: ${e.message}`)
          })
          return response.data
        })
        .catch((e: Error) => {
          console.error(`error creating labware offsets: ${e.message}`)
          throw e
        })
  )

  return {
    ...mutation,
    createLabwareOffset: mutation.mutateAsync,
  }
}
