import { GET, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { RunLoadedLabwareDefinitions } from './types'

export function getRunLoadedLabwareDefintions(
  config: HostConfig,
  runId: string
): ResponsePromise<RunLoadedLabwareDefinitions> {
  return request<RunLoadedLabwareDefinitions>(
    GET,
    `runs/${runId}/loaded_labware_definitions`,
    null,
    config
  )
}
