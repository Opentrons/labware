import { css } from 'styled-components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_V1,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_V1,
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
} from '@opentrons/shared-data'

import magdeck_gen1 from '../../assets/images/modules/magdeck_gen1.png'
import magdeck_gen2 from '../../assets/images/modules/magdeck_gen2.png'
import tempdeck_gen1 from '../../assets/images/modules/tempdeck_gen1.png'
import temp_deck_gen_2_transparent from '../../assets/images/modules/temp_deck_gen_2_transparent.png'
import thermocycler from '../../assets/images/modules/thermocycler.png'
import thermocycler_gen2 from '../../assets/images/modules/thermocycler_gen2.png'
import heater_shaker_module_transparent from '../../assets/images/modules/heater_shaker_module_transparent.png'
import mag_block from '../../assets/images/modules/MagneticBlock_GEN1_HERO.png'
import type { ModuleType, ModuleModel } from '@opentrons/shared-data'

interface Props {
  type: ModuleType
  model: ModuleModel
}

type ModuleImg = {
  [type in ModuleType]: {
    [model in ModuleModel]?: string
  }
}

const MODULE_IMG_BY_TYPE: ModuleImg = {
  [MAGNETIC_MODULE_TYPE]: {
    [MAGNETIC_MODULE_V1]: magdeck_gen1,
    [MAGNETIC_MODULE_V2]: magdeck_gen2,
  },
  [TEMPERATURE_MODULE_TYPE]: {
    [TEMPERATURE_MODULE_V1]: tempdeck_gen1,
    [TEMPERATURE_MODULE_V2]: temp_deck_gen_2_transparent,
  },
  [THERMOCYCLER_MODULE_TYPE]: {
    [THERMOCYCLER_MODULE_V1]: thermocycler,
    [THERMOCYCLER_MODULE_V2]: thermocycler_gen2,
  },
  [HEATERSHAKER_MODULE_TYPE]: {
    [HEATERSHAKER_MODULE_V1]: heater_shaker_module_transparent,
  },
  [MAGNETIC_BLOCK_TYPE]: {
    [MAGNETIC_BLOCK_V1]: mag_block,
  },
  [ABSORBANCE_READER_TYPE]: {
    // TODO (AA): update absorbance reader image
    [ABSORBANCE_READER_V1]: heater_shaker_module_transparent,
  },
}

const IMAGE_MAX_WIDTH = '96px'
export function ModuleDiagram(props: Props): JSX.Element {
  const model = MODULE_IMG_BY_TYPE[props.type][props.model]
  return (
    <img
      css={css`
        max-width: ${IMAGE_MAX_WIDTH};
        width: 100%;
        height: auto;
      `}
      src={model}
      alt={props.type}
    />
  )
}
