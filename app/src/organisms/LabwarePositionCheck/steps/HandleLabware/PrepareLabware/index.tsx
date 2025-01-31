import styled, { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  RESPONSIVENESS,
  SPACING,
  Flex,
  DIRECTION_ROW,
  JUSTIFY_CENTER,
  TYPOGRAPHY,
  JUSTIFY_FLEX_END,
  PrimaryButton,
  BaseDeck,
  ALIGN_FLEX_START,
} from '@opentrons/components'
import {
  THERMOCYCLER_MODULE_TYPE,
  getModuleType,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'

import { SmallButton } from '/app/atoms/buttons'
import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'
import { selectSelectedLabwareDef } from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

import type { ReactNode } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { State } from '/app/redux/types'
import type {
  LPCWizardState,
  OffsetLocationDetails,
  SelectedLabwareInfo,
} from '/app/redux/protocol-runs'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

const LPC_HELP_LINK_URL =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'

interface PrepareSpaceProps extends LPCWizardContentProps {
  header: ReactNode
  body: ReactNode
  confirmPlacement: () => void
  selectedLwInfo: SelectedLabwareInfo
}

export function PrepareLabware({
  runId,
  header,
  body,
  confirmPlacement,
  selectedLwInfo,
}: PrepareSpaceProps): JSX.Element {
  const { i18n, t } = useTranslation(['labware_position_check', 'shared'])
  const { protocolData, deckConfig } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const isOnDevice = useSelector(getIsOnDevice)
  const labwareDef = useSelector(
    selectSelectedLabwareDef(runId)
  ) as LabwareDefinition2
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const { moduleModel } = offsetLocationDetails

  return (
    <Flex css={PARENT_CONTAINER_STYLE}>
      <Flex css={CONTENT_CONTAINER_STYLE}>
        <Flex css={TITLE_CONTAINER_STYLE}>
          <Title>{header}</Title>
          {body}
        </Flex>
        <Flex css={DECK_CONTAINER_STYLE}>
          <BaseDeck
            robotType={FLEX_ROBOT_TYPE}
            modulesOnDeck={protocolData.modules.map(mod => ({
              moduleModel: mod.model,
              moduleLocation: mod.location,
              nestedLabwareDef: moduleModel != null ? labwareDef : null,
              innerProps:
                moduleModel != null &&
                getModuleType(moduleModel) === THERMOCYCLER_MODULE_TYPE
                  ? { lidMotorState: 'open' }
                  : {},
            }))}
            labwareOnDeck={[
              {
                labwareLocation: offsetLocationDetails,
                definition: labwareDef,
              },
            ].filter(
              () => !('moduleModel' in location && location.moduleModel != null)
            )}
            deckConfig={deckConfig}
          />
        </Flex>
      </Flex>
      {isOnDevice ? (
        <Flex justifyContent={JUSTIFY_FLEX_END}>
          <SmallButton
            buttonText={i18n.format(
              t('shared:confirm_placement'),
              'capitalize'
            )}
            onClick={confirmPlacement}
          />
        </Flex>
      ) : (
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <NeedHelpLink href={LPC_HELP_LINK_URL} />
          <PrimaryButton onClick={confirmPlacement}>
            {i18n.format(t('shared:confirm_placement'), 'capitalize')}
          </PrimaryButton>
        </Flex>
      )}
    </Flex>
  )
}

const PARENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing32};
  height: 24.625rem;
  flex: 1;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 29.5rem;
  }
`

const TITLE_CONTAINER_STYLE = css`
  flex: 2;
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing16};
`

const CONTENT_CONTAINER_STYLE = css`
  flex: 1;
  flex-direction: ${DIRECTION_ROW};
  grid-gap: ${SPACING.spacing40};
`

const DECK_CONTAINER_STYLE = css`
  flex: 3;
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_FLEX_START};
`

const Title = styled.h1`
  ${TYPOGRAPHY.h1Default};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold};
  }
`
