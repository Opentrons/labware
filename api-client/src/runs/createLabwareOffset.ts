import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { LegacyLabwareOffsetCreateData, Run } from './types'

export function createLabwareOffset(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData
): ResponsePromise<Run> {
  return request<Run, { data: LegacyLabwareOffsetCreateData }>(
    POST,
    `/runs/${runId}/labware_offsets`,
    { data },
    config
  )
}
