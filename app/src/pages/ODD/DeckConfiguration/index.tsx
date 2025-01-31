import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  DeckConfigurator,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_AROUND,
} from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { DeckFixtureSetupInstructionsModal } from '/app/organisms/DeviceDetailsDeckConfiguration/DeckFixtureSetupInstructionsModal'
import { DeckConfigurationDiscardChangesModal } from '/app/organisms/DeviceDetailsDeckConfiguration/DeckConfigurationDiscardChangesModal'
import { getTopPortalEl } from '/app/App/portal'
import {
  useDeckConfigurationEditingTools,
  useNotifyDeckConfigurationQuery,
} from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'
import type { SmallButton } from '/app/atoms/buttons'

export function DeckConfigurationEditor(): JSX.Element {
  const { t, i18n } = useTranslation([
    'protocol_setup',
    'devices_landing',
    'shared',
  ])
  const navigate = useNavigate()
  const [
    showSetupInstructionsModal,
    setShowSetupInstructionsModal,
  ] = useState<boolean>(false)

  const isOnDevice = true
  const {
    addFixtureToCutout,
    removeFixtureFromCutout,
    addFixtureModal,
  } = useDeckConfigurationEditingTools(isOnDevice)

  const [showDiscardChangeModal, setShowDiscardChangeModal] = useState<boolean>(
    false
  )

  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []

  const handleClickConfirm = (): void => {
    navigate(-1)
  }

  const secondaryButtonProps: ComponentProps<typeof SmallButton> = {
    onClick: () => {
      setShowSetupInstructionsModal(true)
    },
    buttonText: i18n.format(t('setup_instructions'), 'titleCase'),
    buttonType: 'tertiaryLowLight',
    iconName: 'information',
    iconPlacement: 'startIcon',
  }

  return (
    <>
      {createPortal(
        <>
          {showDiscardChangeModal ? (
            <DeckConfigurationDiscardChangesModal
              setShowConfirmationModal={setShowDiscardChangeModal}
            />
          ) : null}
          {showSetupInstructionsModal ? (
            <DeckFixtureSetupInstructionsModal
              setShowSetupInstructionsModal={setShowSetupInstructionsModal}
              isOnDevice={isOnDevice}
            />
          ) : null}
          {addFixtureModal}
        </>,
        getTopPortalEl()
      )}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_AROUND}
      >
        <ChildNavigation
          header={t('devices_landing:deck_configuration')}
          buttonText={i18n.format(t('shared:save'), 'capitalize')}
          onClickButton={handleClickConfirm}
          secondaryButtonProps={secondaryButtonProps}
        />
        <Flex marginTop="7.75rem" justifyContent={JUSTIFY_CENTER}>
          <DeckConfigurator
            deckConfig={deckConfig}
            handleClickAdd={addFixtureToCutout}
            handleClickRemove={removeFixtureFromCutout}
          />
        </Flex>
      </Flex>
    </>
  )
}
