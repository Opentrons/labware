import { useTranslation, Trans } from 'react-i18next'

import {
  Flex,
  SPACING,
  LegacyStyledText,
  DeckConfigurator,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
} from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'
import type { SmallButton } from '/app/atoms/buttons'

interface CreateNewTransferProps {
  onNext: () => void
  exitButtonProps: ComponentProps<typeof SmallButton>
}

export function CreateNewTransfer(props: CreateNewTransferProps): JSX.Element {
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []
  return (
    <Flex>
      <ChildNavigation
        header={t('create_new_transfer')}
        buttonText={i18n.format(t('shared:continue'), 'capitalize')}
        onClickButton={props.onNext}
        secondaryButtonProps={props.exitButtonProps}
        top={SPACING.spacing8}
      />
      <Flex
        marginTop={SPACING.spacing80}
        flexDirection={DIRECTION_COLUMN}
        padding={`0 ${SPACING.spacing60} ${SPACING.spacing40} ${SPACING.spacing60}`}
      >
        <Flex gridGap={SPACING.spacing16}>
          <Flex
            width="50%"
            paddingTop={SPACING.spacing32}
            marginTop={SPACING.spacing32}
            flexDirection={DIRECTION_COLUMN}
          >
            <Trans
              t={t}
              i18nKey="use_deck_slots"
              components={{
                block: (
                  <LegacyStyledText
                    css={TYPOGRAPHY.level4HeaderRegular}
                    marginBottom={SPACING.spacing16}
                  />
                ),
              }}
            />
          </Flex>
          <Flex width="50%">
            <DeckConfigurator
              deckConfig={deckConfig}
              editableCutoutIds={[]}
              handleClickAdd={() => {}}
              handleClickRemove={() => {}}
              additionalStaticFixtures={[
                { location: 'cutoutB2', label: t('tip_rack') },
                { location: 'cutoutC2', label: t('source') },
                { location: 'cutoutD2', label: t('destination') },
              ]}
            />
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
