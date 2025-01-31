import {
  DIRECTION_COLUMN,
  Flex,
  InfoScreen,
  SPACING,
} from '@opentrons/components'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ControlledEmptySelectorButtonGroup } from '../../molecules/ControlledEmptySelectorButtonGroup'
import { ModuleListItemGroup } from '../../molecules/ModuleListItemGroup'
import type { ModuleType, ModuleModel } from '@opentrons/shared-data'

export interface DisplayModules {
  type: ModuleType
  model: ModuleModel
  name: string
  adapter?: {
    name: string
    value: string
  }
}

export const MODULES_FIELD_NAME = 'modules'

export function ModulesSection(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const { watch } = useFormContext()

  const modules: DisplayModules[] = [
    {
      type: 'heaterShakerModuleType',
      model: 'heaterShakerModuleV1',
      name: t('heater_shaker_module_v1'),
    },
    {
      type: 'temperatureModuleType',
      model: 'temperatureModuleV2',
      name: t('temperature_module_v2'),
    },
    {
      type: 'thermocyclerModuleType',
      model: 'thermocyclerModuleV2',
      name: t('thermocycler_module_v2'),
    },
    {
      type: 'magneticModuleType',
      model: 'magneticModuleV1',
      name: t('magnetic_module_v1'),
    },
  ]

  const modulesWatch: DisplayModules[] = watch(MODULES_FIELD_NAME) ?? []

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      height="100%"
      gap={SPACING.spacing24}
    >
      <ControlledEmptySelectorButtonGroup modules={modules} />

      {modulesWatch.length === 0 && (
        <InfoScreen content={t('no_modules_added_yet')} />
      )}

      <ModuleListItemGroup />
    </Flex>
  )
}
