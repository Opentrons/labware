import * as React from 'react'
import { Command } from '@opentrons/shared-data/protocol/types/schemaV6/command'
import {
  ALIGN_CENTER,
  DIRECTION_ROW,
  Flex,
  SPACING_1,
  SPACING_3,
} from '@opentrons/components'
import type { RunCommandSummary } from '@opentrons/api-client'

interface Props {
  command: Command | RunCommandSummary
  commandText?: JSX.Element
}
export function CommandText(props: Props): JSX.Element | null {
  return (
    <Flex
      marginLeft={SPACING_3}
      flex={'auto'}
      alignItems={ALIGN_CENTER}
      flexDirection={DIRECTION_ROW}
    >
      <Flex marginLeft={SPACING_1} key={props.command.id}>
        {props.commandText}
      </Flex>
    </Flex>
  )
}
