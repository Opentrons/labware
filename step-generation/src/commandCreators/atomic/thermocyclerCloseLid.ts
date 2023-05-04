import type { CommandCreator } from '../../types'
import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data/protocol/types/schemaV4'

export const thermocyclerCloseLid: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  return {
    commands: [
      {
        commandType: 'thermocycler/closeLid',
        key: uuid(),
        params: {
          moduleId: args.module,
        },
      },
    ],
  }
}
