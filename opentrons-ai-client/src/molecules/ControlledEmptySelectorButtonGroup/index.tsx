import { Flex, WRAP, SPACING, EmptySelectorButton } from '@opentrons/components'
import { Controller, useFormContext } from 'react-hook-form'
import type { DisplayModules } from '../../organisms/ModulesSection'
import { MODULES_FIELD_NAME } from '../../organisms/ModulesSection'

export function ControlledEmptySelectorButtonGroup({
  modules,
}: {
  modules: DisplayModules[]
}): JSX.Element | null {
  const { watch } = useFormContext()
  const modulesWatch: DisplayModules[] = watch(MODULES_FIELD_NAME) ?? []

  return (
    <Controller
      defaultValue={[]}
      name={MODULES_FIELD_NAME}
      render={({ field }) => {
        return (
          <Flex flexWrap={WRAP} gap={SPACING.spacing8}>
            {modules.map(module => (
              <EmptySelectorButton
                key={module.type}
                iconName="plus"
                onClick={() => {
                  if (modulesWatch.some(m => m.type === module.type)) {
                    return
                  }
                  field.onChange([...modulesWatch, module])
                }}
                text={module.name}
                textAlignment="left"
              />
            ))}
          </Flex>
        )
      }}
    />
  )
}
