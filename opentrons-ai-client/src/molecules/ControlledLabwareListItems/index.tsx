import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Flex,
  ListItem,
  ListItemCustomize,
  SPACING,
} from '@opentrons/components'
import type { DropdownBorder } from '@opentrons/components'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import { LabwareDiagram } from '../../molecules/LabwareDiagram'
import type { DisplayLabware } from '../../organisms/LabwareLiquidsSection'
import { LABWARES_FIELD_NAME } from '../../organisms/LabwareLiquidsSection'
import { getOnlyLatestDefs } from '../../resources/utils'

export function ControlledLabwareListItems(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const { watch } = useFormContext()

  const labwares: DisplayLabware[] = watch(LABWARES_FIELD_NAME) ?? []

  const defs = getOnlyLatestDefs()

  return (
    <Controller
      name={LABWARES_FIELD_NAME}
      rules={{
        required: true,
        validate: value => value.length > 0,
      }}
      render={({ field }) => {
        return (
          <>
            {labwares.map((labware, index) => {
              const labwareDef = defs[labware.labwareURI]
              const dropdownProps = {
                currentOption: {
                  name: `${labware.count}`,
                  value: `${labware.count}`,
                },
                title: (null as unknown) as string,
                onClick: (value: string) => {
                  field.onChange(
                    labwares.map(lw =>
                      lw.labwareURI === labware.labwareURI
                        ? { ...lw, count: parseInt(value) }
                        : lw
                    )
                  )
                },
                dropdownType: 'neutral' as DropdownBorder,
                filterOptions: Array.from({ length: 10 }, (_, i) => ({
                  name: `${i + 1}`,
                  value: `${i + 1}`,
                })),
              }

              return (
                <ListItem
                  type="noActive"
                  key={`${index}_${labwareDef.parameters.loadName}`}
                >
                  <ListItemCustomize
                    dropdown={dropdownProps}
                    label={t('labwares_quantity_label')}
                    linkText={t('labwares_remove_label')}
                    onClick={() => {
                      field.onChange(
                        labwares.filter(lw => lw !== labware),
                        {
                          shouldValidate: true,
                        }
                      )
                    }}
                    header={getLabwareDisplayName(labwareDef)}
                    leftHeaderItem={
                      <Flex
                        padding={SPACING.spacing2}
                        backgroundColor={COLORS.white}
                        borderRadius={BORDERS.borderRadius8}
                        alignItems={ALIGN_CENTER}
                        width="3.75rem"
                        height="3.625rem"
                      >
                        <LabwareDiagram def={labwareDef} />
                      </Flex>
                    }
                  />
                </ListItem>
              )
            })}
          </>
        )
      }}
    />
  )
}
