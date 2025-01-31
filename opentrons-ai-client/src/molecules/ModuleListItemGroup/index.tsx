import {
  Flex,
  SPACING,
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  ListItem,
  ListItemCustomize,
} from '@opentrons/components'
import type { DropdownBorder } from '@opentrons/components'
import {
  ABSORBANCE_READER_TYPE,
  getModuleDisplayName,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import type { ModuleType } from '@opentrons/shared-data'
import { Controller, useFormContext } from 'react-hook-form'
import { ModuleDiagram } from '../ModelDiagram'
import { MODULES_FIELD_NAME } from '../../organisms/ModulesSection'
import type { DisplayModules } from '../../organisms/ModulesSection'
import { getOnlyLatestDefs } from '../../resources/utils'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

export const RECOMMENDED_LABWARE_BY_MODULE: { [K in ModuleType]: string[] } = {
  [TEMPERATURE_MODULE_TYPE]: [
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_96_well_aluminum_block',
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_aluminum_flat_bottom_plate',
    'opentrons_96_deep_well_temp_mod_adapter',
  ],
  [MAGNETIC_MODULE_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    'opentrons_96_deep_well_adapter',
    'opentrons_96_flat_bottom_adapter',
    'opentrons_96_pcr_adapter',
    'opentrons_universal_flat_adapter',
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [ABSORBANCE_READER_TYPE]: [
    'opentrons_flex_lid_absorbance_plate_reader_module',
  ],
}

export function ModuleListItemGroup(): JSX.Element | null {
  const { watch, setValue } = useFormContext()
  const { t } = useTranslation('create_protocol')
  const modulesWatch: DisplayModules[] = watch(MODULES_FIELD_NAME) ?? []

  const allDefinitionsValues = useMemo(
    () => Object.values(getOnlyLatestDefs()),
    []
  )

  const getDefDisplayName = (value: string): string => {
    return (
      allDefinitionsValues.find(def => def.parameters.loadName === value)
        ?.metadata.displayName ?? value
    )
  }

  return (
    <>
      {modulesWatch?.map(module => {
        const adapters = RECOMMENDED_LABWARE_BY_MODULE[module.type]

        return (
          <Controller
            key={module.type}
            name={MODULES_FIELD_NAME}
            render={({ field }) => {
              const currentModule = field.value.find(
                (m: DisplayModules) => m.type === module.type
              )

              return (
                <ListItem type="noActive" key={module.type}>
                  <ListItemCustomize
                    label={
                      adapters != null && adapters.length > 0
                        ? t('modules_adapter_label')
                        : undefined
                    }
                    linkText={t('modules_remove_label')}
                    dropdown={
                      adapters != null && adapters.length > 0
                        ? {
                            title: (null as unknown) as string,
                            currentOption: {
                              name:
                                getDefDisplayName(
                                  currentModule?.adapter?.value as string
                                ) ?? 'Choose an adapter',
                              value: currentModule?.adapter?.value,
                            },
                            onClick: (value: string) => {
                              field.onChange(
                                field.value.map((m: DisplayModules) =>
                                  m.type === module.type
                                    ? {
                                        ...m,
                                        adapter: {
                                          name: getDefDisplayName(value),
                                          value,
                                        },
                                      }
                                    : m
                                )
                              )
                            },
                            dropdownType: 'neutral' as DropdownBorder,
                            filterOptions: adapters?.map(adapter => ({
                              name: getDefDisplayName(adapter),
                              value: adapter,
                            })),
                          }
                        : undefined
                    }
                    onClick={() => {
                      setValue(
                        MODULES_FIELD_NAME,
                        modulesWatch.filter(m => m.type !== module.type),
                        { shouldValidate: true }
                      )
                    }}
                    header={getModuleDisplayName(module.model)}
                    leftHeaderItem={
                      <Flex
                        padding={SPACING.spacing2}
                        backgroundColor={COLORS.white}
                        borderRadius={BORDERS.borderRadius8}
                        alignItems={ALIGN_CENTER}
                        width="3.75rem"
                        height="3.625rem"
                      >
                        <ModuleDiagram
                          type={module.type}
                          model={module.model}
                        />
                      </Flex>
                    }
                  />
                </ListItem>
              )
            }}
          />
        )
      })}
    </>
  )
}
