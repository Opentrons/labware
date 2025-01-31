import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  COLORS,
  POSITION_FIXED,
  ALIGN_CENTER,
  Tabs,
  RadioButton,
} from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { getCompatibleLabwareByCategory } from './utils'

import type { ComponentProps, Dispatch } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { SmallButton } from '/app/atoms/buttons'
import type { LabwareFilter } from '/app/local-resources/labware'
import type {
  QuickTransferWizardState,
  QuickTransferWizardAction,
} from './types'

interface SelectDestLabwareProps {
  onNext: () => void
  onBack: () => void
  exitButtonProps: ComponentProps<typeof SmallButton>
  state: QuickTransferWizardState
  dispatch: Dispatch<QuickTransferWizardAction>
}

export function SelectDestLabware(
  props: SelectDestLabwareProps
): JSX.Element | null {
  const { onNext, onBack, exitButtonProps, state, dispatch } = props
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const labwareDisplayCategoryFilters: LabwareFilter[] = [
    'all',
    'wellPlate',
    'reservoir',
  ]
  if (state.pipette?.channels === 1) {
    labwareDisplayCategoryFilters.push('tubeRack')
  }
  const [selectedCategory, setSelectedCategory] = useState<LabwareFilter>('all')
  const [selectedLabware, setSelectedLabware] = useState<
    LabwareDefinition2 | 'source' | undefined
  >(state.destination)

  if (state.pipette == null) return null

  const compatibleLabwareDefinitions = getCompatibleLabwareByCategory(
    state.pipette.channels,
    selectedCategory
  )

  const handleClickNext = (): void => {
    // the button will be disabled if this values is null
    if (selectedLabware != null) {
      dispatch({
        type: 'SET_DEST_LABWARE',
        labware: selectedLabware,
      })
      onNext()
    }
  }
  return (
    <Flex>
      <ChildNavigation
        header={t('select_dest_labware')}
        buttonText={i18n.format(t('shared:continue'), 'capitalize')}
        onClickBack={onBack}
        onClickButton={handleClickNext}
        secondaryButtonProps={exitButtonProps}
        top={SPACING.spacing8}
        buttonIsDisabled={selectedLabware == null}
      />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
        width="100%"
      >
        <Flex
          gridGap={SPACING.spacing8}
          height={SPACING.spacing80}
          backgroundColor={COLORS.white}
          width="100%"
          flexDirection={DIRECTION_ROW}
          position={POSITION_FIXED}
          top={SPACING.spacing120}
          marginBottom={SPACING.spacing24}
          alignItems={ALIGN_CENTER}
        >
          <Tabs
            tabs={labwareDisplayCategoryFilters.map(category => ({
              text: t(category),
              onClick: () => {
                setSelectedCategory(category)
              },
              isActive: category === selectedCategory,
              disabled: false,
            }))}
          />
        </Flex>
        <Flex
          gridGap={SPACING.spacing4}
          flexDirection={DIRECTION_COLUMN}
          marginTop="175px"
        >
          {selectedCategory === 'all' && state?.source != null ? (
            <RadioButton
              isSelected={selectedLabware === 'source'}
              onChange={() => {
                setSelectedLabware('source')
              }}
              buttonLabel={t('source_labware_c2')}
              buttonValue="source-labware-c2"
              subButtonLabel={state.source.metadata.displayName}
            />
          ) : null}
          {compatibleLabwareDefinitions?.map(definition => {
            return definition.metadata.displayName != null ? (
              <RadioButton
                key={`${selectedCategory}-${definition.metadata.displayName}`}
                isSelected={
                  selectedLabware !== 'source' &&
                  selectedLabware?.metadata.displayName ===
                    definition.metadata.displayName
                }
                onChange={() => {
                  setSelectedLabware(definition)
                }}
                buttonValue={definition.metadata.displayName}
                buttonLabel={definition.metadata.displayName}
              />
            ) : null
          })}
        </Flex>
      </Flex>
    </Flex>
  )
}
