import {
  useHost,
  usePlayRunMutation,
  usePauseRunMutation,
  useStopRunMutation,
} from '..'
import { useQueryClient } from 'react-query'

interface UseRunActionMutations {
  playRun: () => void
  pauseRun: () => void
  stopRun: () => void
  isPlayRunActionLoading: boolean
  isPauseRunActionLoading: boolean
  isStopRunActionLoading: boolean
}

export function useRunActionMutations(runId: string): UseRunActionMutations {
  const host = useHost()
  const queryClient = useQueryClient()

  const onSuccess = (): void => {
    queryClient
      .invalidateQueries([host, 'runs', runId])
      .catch((e: Error) =>
        console.error(`error invalidating run ${runId} query: ${e.message}`)
      )
  }

  const { playRun, isLoading: isPlayRunActionLoading } = usePlayRunMutation({
    onSuccess,
  })

  const { pauseRun, isLoading: isPauseRunActionLoading } = usePauseRunMutation({
    onSuccess,
  })

  const { stopRun, isLoading: isStopRunActionLoading } = useStopRunMutation()

  return {
    playRun: () => playRun(runId),
    pauseRun: () => pauseRun(runId),
    stopRun: () => stopRun(runId),
    isPlayRunActionLoading,
    isPauseRunActionLoading,
    isStopRunActionLoading,
  }
}
