import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import startCase from 'lodash/startCase'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  BORDERS,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  ModalShell,
  POSITION_ABSOLUTE,
  PrimaryButton,
  RESPONSIVENESS,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  EIGHT_CHANNEL,
  LEFT,
  NINETY_SIX_CHANNEL,
  RIGHT,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import { getIsOnDevice } from '/app/redux/config'
import { getTopPortalEl } from '/app/App/portal'
import { SmallButton } from '/app/atoms/buttons'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { ModalContentOneColSimpleButtons } from '/app/molecules/InterventionModal'
import singleChannelAndEightChannel from '/app/assets/images/change-pip/1_and_8_channel.png'
import ninetySixChannel from '/app/assets/images/change-pip/ninety-six-channel.png'
import { useAttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import { ExitModal } from './ExitModal'
import { FLOWS } from './constants'
import { getIsGantryEmpty } from './utils'

import type { Dispatch, SetStateAction, ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { PipetteMount } from '@opentrons/shared-data'
import type { SelectablePipettes } from './types'

const UNSELECTED_OPTIONS_STYLE = css`
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius8};
  height: 14.5625rem;
  width: 14.5625rem;
  cursor: ${CURSOR_POINTER};
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing8}

  &:hover {
    border: 1px solid ${COLORS.grey35};
    background-color: ${COLORS.grey10}
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    flex-direction: ${DIRECTION_ROW};
    justify-content: ${JUSTIFY_FLEX_START};
    background-color: ${COLORS.blue35};
    border-width: 0;
    border-radius: ${BORDERS.borderRadius16};
    padding: ${SPACING.spacing24};
    height: 5.25rem;
    width: 57.8125rem;

    &:hover {
      border-width: 0px;
    }
  }
`

const SELECTED_OPTIONS_STYLE = css`
  ${UNSELECTED_OPTIONS_STYLE}
  border: 1px solid ${COLORS.blue50};
  background-color: ${COLORS.blue10};

  &:hover {
    border: 1px solid ${COLORS.blue50};
    background-color: ${COLORS.blue30};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-width: 0px;
    background-color: ${COLORS.blue50};
    color: ${COLORS.white};

    &:hover {
      border-width: 0px;
      background-color: ${COLORS.blue50};
    }
  }
`

interface ChoosePipetteProps {
  proceed: () => void
  selectedPipette: SelectablePipettes
  setSelectedPipette: Dispatch<SetStateAction<SelectablePipettes>>
  exit: () => void
  mount: PipetteMount
}
export const ChoosePipette = (props: ChoosePipetteProps): JSX.Element => {
  const { selectedPipette, setSelectedPipette, proceed, exit, mount } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t } = useTranslation(['pipette_wizard_flows', 'shared'])
  const attachedPipettesByMount = useAttachedPipettesFromInstrumentsQuery()
  const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(
    false
  )

  const bothMounts = getIsGantryEmpty(attachedPipettesByMount)
    ? t('ninety_six_channel', {
        ninetySix: NINETY_SIX_CHANNEL,
      })
    : t('detach_pipette_to_attach_96', {
        pipetteName:
          attachedPipettesByMount[LEFT]?.displayName ??
          attachedPipettesByMount[RIGHT]?.displayName,
      })

  const singleMount = t('single_or_8_channel', {
    single: '1-',
    eight: EIGHT_CHANNEL,
  })
  const wizardHeader = (
    <WizardHeader
      title={startCase(t('attach_pipette', { mount }) as string)}
      currentStep={0}
      totalSteps={3}
      onExit={
        showExitConfirmation
          ? exit
          : () => {
              setShowExitConfirmation(true)
            }
      }
    />
  )
  return createPortal(
    isOnDevice ? (
      <ModalShell height="100%" header={wizardHeader}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          width="100%"
          height="472px"
          position={POSITION_ABSOLUTE}
          backgroundColor={COLORS.white}
        >
          {showExitConfirmation ? (
            <ExitModal
              goBack={() => {
                setShowExitConfirmation(false)
              }}
              proceed={exit}
              flowType={FLOWS.ATTACH}
              isOnDevice={isOnDevice}
            />
          ) : (
            <Flex
              margin={SPACING.spacing32}
              flexDirection={DIRECTION_COLUMN}
              height="100%"
              justifyContent={JUSTIFY_SPACE_BETWEEN}
            >
              <ModalContentOneColSimpleButtons
                headline={t('choose_pipette')}
                firstButton={{
                  label: singleMount,
                  value: SINGLE_MOUNT_PIPETTES,
                }}
                secondButton={{
                  label: bothMounts,
                  value: NINETY_SIX_CHANNEL,
                }}
                onSelect={event => {
                  setSelectedPipette(event.target.value as SelectablePipettes)
                }}
                initialSelected={selectedPipette}
              />
              <Flex justifyContent={JUSTIFY_FLEX_END}>
                <SmallButton
                  onClick={proceed}
                  textTransform={TYPOGRAPHY.textTransformCapitalize}
                  buttonText={i18n.format(t('shared:continue'), 'capitalize')}
                />
              </Flex>
            </Flex>
          )}
        </Flex>
      </ModalShell>
    ) : (
      <ModalShell width="47rem" height="min-content" header={wizardHeader}>
        {showExitConfirmation ? (
          <ExitModal
            goBack={() => {
              setShowExitConfirmation(false)
            }}
            proceed={exit}
            flowType={FLOWS.ATTACH}
            isOnDevice={isOnDevice}
          />
        ) : (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            padding={SPACING.spacing32}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
          >
            <Flex flexDirection={DIRECTION_COLUMN}>
              <LegacyStyledText as="h1">{t('choose_pipette')}</LegacyStyledText>
              <Flex
                margin={SPACING.spacing40}
                justifyContent={JUSTIFY_SPACE_AROUND}
              >
                <PipetteMountOption
                  isSelected={selectedPipette === SINGLE_MOUNT_PIPETTES}
                  onClick={() => {
                    setSelectedPipette(SINGLE_MOUNT_PIPETTES)
                  }}
                >
                  <img
                    src={singleChannelAndEightChannel}
                    width="168px"
                    height="150.99px"
                    alt={singleMount}
                  />
                  <LegacyStyledText
                    as="h3"
                    fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    textAlign={TYPOGRAPHY.textAlignCenter}
                  >
                    {singleMount}
                  </LegacyStyledText>
                </PipetteMountOption>
                <PipetteMountOption
                  isSelected={selectedPipette === NINETY_SIX_CHANNEL}
                  onClick={() => {
                    setSelectedPipette(NINETY_SIX_CHANNEL)
                  }}
                >
                  <img
                    src={ninetySixChannel}
                    width="168px"
                    height="151.2px"
                    alt={bothMounts}
                  />
                  <LegacyStyledText
                    as="h3"
                    fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    textAlign={TYPOGRAPHY.textAlignCenter}
                  >
                    {bothMounts}
                  </LegacyStyledText>
                </PipetteMountOption>
              </Flex>
            </Flex>
            <PrimaryButton onClick={proceed} alignSelf={ALIGN_FLEX_END}>
              {i18n.format(t('shared:continue'), 'capitalize')}
            </PrimaryButton>
          </Flex>
        )}
      </ModalShell>
    ),
    getTopPortalEl()
  )
}

interface PipetteMountOptionProps extends StyleProps {
  isSelected: boolean
  onClick: () => void
  children: ReactNode
}
function PipetteMountOption(props: PipetteMountOptionProps): JSX.Element {
  const { isSelected, onClick, children, ...styleProps } = props
  return (
    <Flex
      onClick={onClick}
      css={isSelected ? SELECTED_OPTIONS_STYLE : UNSELECTED_OPTIONS_STYLE}
      role="radio"
      {...styleProps}
    >
      {children}
    </Flex>
  )
}
