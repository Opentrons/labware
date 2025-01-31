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
import { THERMOCYCLER_MODULE_TYPE, getModuleType } from '@opentrons/shared-data'

import { getIsOnDevice } from '/app/redux/config'
import { SmallButton } from '/app/atoms/buttons'
import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { ReactNode } from 'react'
import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import type { CheckLabwareStep } from './types'

const LPC_HELP_LINK_URL =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'

const TILE_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing32};
  height: 24.625rem;
  flex: 1;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 29.5rem;
  }
`

const Title = styled.h1`
  ${TYPOGRAPHY.h1Default};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold};
  }
`
interface PrepareSpaceProps extends Omit<CheckLabwareStep, 'section'> {
  section:
    | 'CHECK_LABWARE'
    | 'CHECK_TIP_RACKS'
    | 'PICK_UP_TIP'
    | 'RETURN_TIP'
    | 'CHECK_POSITIONS'
  labwareDef: LabwareDefinition2
  protocolData: CompletedProtocolAnalysis
  confirmPlacement: () => void
  header: ReactNode
  body: ReactNode
  robotType: RobotType
}
export const PrepareSpace = (props: PrepareSpaceProps): JSX.Element | null => {
  const { i18n, t } = useTranslation(['labware_position_check', 'shared'])
  const { location, labwareDef, protocolData, header, body, robotType } = props

  const isOnDevice = useSelector(getIsOnDevice)
  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []

  if (protocolData == null || robotType == null) return null

  return (
    <Flex css={TILE_CONTAINER_STYLE}>
      <Flex flex="1" flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing40}>
        <Flex
          flex="2"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing16}
        >
          <Title>{header}</Title>
          {body}
        </Flex>
        <Flex
          flex="3"
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_FLEX_START}
        >
          <BaseDeck
            robotType={robotType}
            modulesOnDeck={protocolData.modules.map(mod => ({
              moduleModel: mod.model,
              moduleLocation: mod.location,
              nestedLabwareDef:
                'moduleModel' in location && location.moduleModel != null
                  ? labwareDef
                  : null,
              innerProps:
                'moduleModel' in location &&
                location.moduleModel != null &&
                getModuleType(location.moduleModel) === THERMOCYCLER_MODULE_TYPE
                  ? { lidMotorState: 'open' }
                  : {},
            }))}
            labwareOnDeck={[
              {
                labwareLocation: location,
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
            onClick={props.confirmPlacement}
          />
        </Flex>
      ) : (
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <NeedHelpLink href={LPC_HELP_LINK_URL} />
          <PrimaryButton onClick={props.confirmPlacement}>
            {i18n.format(t('shared:confirm_placement'), 'capitalize')}
          </PrimaryButton>
        </Flex>
      )}
    </Flex>
  )
}
