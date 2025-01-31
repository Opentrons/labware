import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  LegacyStyledText,
  RadioButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { RIGHT, LEFT } from '@opentrons/shared-data'
import { usePipetteSpecsV2 } from '/app/local-resources/instruments'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'

import type { ComponentProps, Dispatch } from 'react'
import type { PipetteData, Mount } from '@opentrons/api-client'
import type { SmallButton } from '/app/atoms/buttons'
import type {
  QuickTransferWizardState,
  QuickTransferWizardAction,
} from './types'

interface SelectPipetteProps {
  onNext: () => void
  onBack: () => void
  exitButtonProps: ComponentProps<typeof SmallButton>
  state: QuickTransferWizardState
  dispatch: Dispatch<QuickTransferWizardAction>
}

export function SelectPipette(props: SelectPipetteProps): JSX.Element {
  const { onNext, onBack, exitButtonProps, state, dispatch } = props
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const { data: attachedInstruments } = useInstrumentsQuery()

  const leftPipette = attachedInstruments?.data.find(
    (i): i is PipetteData => i.ok && i.mount === LEFT
  )
  const leftPipetteSpecs = usePipetteSpecsV2(leftPipette?.instrumentModel)

  const rightPipette = attachedInstruments?.data.find(
    (i): i is PipetteData => i.ok && i.mount === RIGHT
  )
  const rightPipetteSpecs = usePipetteSpecsV2(rightPipette?.instrumentModel)

  // automatically select 96 channel if it is attached
  const [selectedPipette, setSelectedPipette] = useState<Mount | undefined>(
    leftPipetteSpecs?.channels === 96 ? LEFT : state.mount
  )

  const handleClickNext = (): void => {
    const selectedPipetteSpecs =
      selectedPipette === LEFT ? leftPipetteSpecs : rightPipetteSpecs

    // the button will be disabled if these values are null
    if (selectedPipette != null && selectedPipetteSpecs != null) {
      dispatch({
        type: 'SELECT_PIPETTE',
        pipette: selectedPipetteSpecs,
        mount: selectedPipette,
      })
      onNext()
    }
  }
  return (
    <Flex>
      <ChildNavigation
        header={t('select_attached_pipette')}
        buttonText={i18n.format(t('shared:continue'), 'capitalize')}
        onClickBack={onBack}
        onClickButton={handleClickNext}
        secondaryButtonProps={exitButtonProps}
        top={SPACING.spacing8}
        buttonIsDisabled={selectedPipette == null}
      />
      <Flex
        marginTop={SPACING.spacing120}
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
        gridGap={SPACING.spacing4}
      >
        <LegacyStyledText
          css={TYPOGRAPHY.level4HeaderRegular}
          paddingBottom={SPACING.spacing8}
        >
          {t('pipette_currently_attached')}
        </LegacyStyledText>
        {leftPipetteSpecs != null ? (
          <RadioButton
            isSelected={selectedPipette === LEFT}
            onChange={() => {
              setSelectedPipette(LEFT)
            }}
            buttonValue={LEFT}
            buttonLabel={
              leftPipetteSpecs.channels === 96
                ? t('both_mounts')
                : t('left_mount')
            }
            subButtonLabel={leftPipetteSpecs.displayName}
          />
        ) : null}
        {rightPipetteSpecs != null ? (
          <RadioButton
            isSelected={selectedPipette === RIGHT}
            onChange={() => {
              setSelectedPipette(RIGHT)
            }}
            buttonValue={RIGHT}
            buttonLabel={t('right_mount')}
            subButtonLabel={rightPipetteSpecs.displayName}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
