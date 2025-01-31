import { RunHeaderSectionUpper } from './RunHeaderSectionUpper'
import { RunHeaderSectionLower } from './RunHeaderSectionLower'

import type { MutableRefObject } from 'react'
import type { AttachedModule, RunStatus } from '@opentrons/api-client'
import type { ProtocolRunHeaderProps } from '..'
import type { RunControls } from '/app/organisms/RunTimeControl'
import type { UseRunHeaderModalContainerResult } from '../RunHeaderModalContainer'

export type RunHeaderContentProps = ProtocolRunHeaderProps & {
  runStatus: RunStatus | null
  isResetRunLoadingRef: MutableRefObject<boolean>
  attachedModules: AttachedModule[]
  protocolRunControls: RunControls
  runHeaderModalContainerUtils: UseRunHeaderModalContainerResult
}

export function RunHeaderContent(props: RunHeaderContentProps): JSX.Element {
  return (
    <>
      <RunHeaderSectionUpper {...props} />
      {props.runStatus != null ? <RunHeaderSectionLower {...props} /> : null}
    </>
  )
}
