import { POST, request } from '../request'
import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface CreateLabwareDefinitionResponsePayload {
  definitionUri: string
}

export function createLabwareDefinition(
  config: HostConfig,
  runId: string,
  data: LabwareDefinition2
): ResponsePromise<CreateLabwareDefinitionResponsePayload> {
  return request<
    CreateLabwareDefinitionResponsePayload,
    { data: LabwareDefinition2 }
  >(POST, `/runs/${runId}/labware_definitions`, { data }, config)
}
