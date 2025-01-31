import { getPipetteSpecsV2 } from '@opentrons/shared-data'

import type { ConfigureNozzleLayoutRunTimeCommand } from '@opentrons/shared-data'
import type { HandlesCommands } from '../types'

export function getConfigureNozzleLayoutCommandText({
  command,
  commandTextData,
  t,
}: HandlesCommands<ConfigureNozzleLayoutRunTimeCommand>): string {
  const { configurationParams, pipetteId } = command.params
  const pipetteName = commandTextData?.pipettes.find(
    pip => pip.id === pipetteId
  )?.pipetteName

  const ConfigAmount = {
    SINGLE: t('single_nozzle_layout'),
    COLUMN: t('column_layout'),
    ROW: t('row_layout'),
    QUADRANT: t('partial_layout'),
    ALL: t('all_nozzles'),
  }

  return t('configure_nozzle_layout', {
    layout: ConfigAmount[configurationParams.style],
    pipette:
      pipetteName != null ? getPipetteSpecsV2(pipetteName)?.displayName : '',
  })
}
