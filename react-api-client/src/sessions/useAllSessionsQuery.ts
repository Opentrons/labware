import { useHost } from '../api'
import { HostConfig, Sessions, getSessions } from '@opentrons/api-client'
import { UseQueryResult, useQuery } from 'react-query'
import type { UseQueryOptions } from 'react-query'

export function useAllSessionsQuery(
  options: UseQueryOptions<Sessions, Error> = {}
): UseQueryResult<Sessions, Error> {
  const host = useHost()
  const query = useQuery<Sessions, Error>(
    ['session', host],
    () =>
      getSessions(host as HostConfig)
        .then(response => response.data)
        .catch((e: Error) => {
          throw e
        }),
    { enabled: host !== null, ...options }
  )

  return query
}
