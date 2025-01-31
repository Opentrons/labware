import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  RadioButton,
  SPACING,
} from '@opentrons/components'
import { getAllDefinitions } from '@opentrons/shared-data'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'

import type { ComponentProps, Dispatch } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { SmallButton } from '/app/atoms/buttons'
import type {
  QuickTransferWizardState,
  QuickTransferWizardAction,
} from './types'

interface SelectTipRackProps {
  onNext: () => void
  onBack: () => void
  exitButtonProps: ComponentProps<typeof SmallButton>
  state: QuickTransferWizardState
  dispatch: Dispatch<QuickTransferWizardAction>
}

export function SelectTipRack(props: SelectTipRackProps): JSX.Element {
  const { onNext, onBack, exitButtonProps, state, dispatch } = props
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])

  const allLabwareDefinitionsByUri = getAllDefinitions()
  const selectedPipetteDefaultTipracks =
    state.pipette?.liquids.default.defaultTipracks ?? []

  const [selectedTipRack, setSelectedTipRack] = useState<
    LabwareDefinition2 | undefined
  >(state.tipRack)

  const handleClickNext = (): void => {
    // the button will be disabled if this values is null
    if (selectedTipRack != null) {
      dispatch({
        type: 'SELECT_TIP_RACK',
        tipRack: selectedTipRack,
      })
      onNext()
    }
  }
  return (
    <Flex>
      <ChildNavigation
        header={t('select_tip_rack')}
        buttonText={i18n.format(t('shared:continue'), 'capitalize')}
        onClickBack={onBack}
        onClickButton={handleClickNext}
        secondaryButtonProps={exitButtonProps}
        top={SPACING.spacing8}
        buttonIsDisabled={selectedTipRack == null}
      />
      <Flex
        marginTop={SPACING.spacing120}
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        {selectedPipetteDefaultTipracks.map(tipRack => {
          const tipRackDef = allLabwareDefinitionsByUri[tipRack]

          return tipRackDef != null ? (
            <RadioButton
              key={tipRack}
              isSelected={selectedTipRack === tipRackDef}
              buttonValue={tipRack}
              buttonLabel={tipRackDef.metadata.displayName}
              onChange={() => {
                setSelectedTipRack(tipRackDef)
              }}
            />
          ) : null
        })}
      </Flex>
    </Flex>
  )
}
