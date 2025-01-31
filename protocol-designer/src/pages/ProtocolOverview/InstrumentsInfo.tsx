import { useTranslation } from 'react-i18next'

import {
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  ListItemDescriptor,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getPipetteSpecsV2, FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { LINK_BUTTON_STYLE } from '../../atoms'

import type { PipetteName, RobotType } from '@opentrons/shared-data'
import type { AdditionalEquipmentEntities } from '@opentrons/step-generation'
import type { PipetteOnDeck } from '../../step-forms'

interface InstrumentsInfoProps {
  robotType: RobotType
  pipettesOnDeck: PipetteOnDeck[]
  additionalEquipment: AdditionalEquipmentEntities
  setShowEditInstrumentsModal: (showEditInstrumentsModal: boolean) => void
}

export function InstrumentsInfo({
  robotType,
  pipettesOnDeck,
  additionalEquipment,
  setShowEditInstrumentsModal,
}: InstrumentsInfoProps): JSX.Element {
  const { t } = useTranslation(['protocol_overview', 'shared'])
  const leftPipette = pipettesOnDeck.find(pipette => pipette.mount === 'left')
  const rightPipette = pipettesOnDeck.find(pipette => pipette.mount === 'right')
  const isGripperAttached = Object.values(additionalEquipment).some(
    equipment => equipment?.name === 'gripper'
  )

  const has96Channel = leftPipette?.name === 'p1000_96' && rightPipette == null

  const pipetteInfo = (pipette?: PipetteOnDeck): JSX.Element => {
    const pipetteName =
      pipette != null
        ? getPipetteSpecsV2(pipette.name as PipetteName)?.displayName
        : t('na')
    const tipsInfo =
      pipette?.tiprackLabwareDef != null
        ? pipette.tiprackLabwareDef.map(labware => labware.metadata.displayName)
        : t('na')

    if (pipetteName === t('na') || tipsInfo === t('na')) {
      return (
        <StyledText desktopStyle="bodyDefaultRegular">{t('na')}</StyledText>
      )
    }

    return (
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText desktopStyle="bodyDefaultRegular">{pipetteName}</StyledText>
        {pipette != null && pipette.tiprackLabwareDef.length > 0
          ? pipette?.tiprackLabwareDef.map(labware => (
              <StyledText
                key={labware.metadata.displayName}
                desktopStyle="bodyDefaultRegular"
              >
                {labware.metadata.displayName}
              </StyledText>
            ))
          : null}
      </Flex>
    )
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <StyledText desktopStyle="headingSmallBold">
          {t('instruments')}
        </StyledText>
        <Flex padding={SPACING.spacing4}>
          <Btn
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            onClick={() => {
              setShowEditInstrumentsModal(true)
            }}
            css={LINK_BUTTON_STYLE}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('edit')}
            </StyledText>
          </Btn>
        </Flex>
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <ListItem type="noActive" key={`ProtocolOverview_robotType`}>
          <ListItemDescriptor
            type="large"
            description={
              <Flex minWidth="13.75rem">
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  color={COLORS.grey60}
                >
                  {t('robotType')}
                </StyledText>
              </Flex>
            }
            content={
              <StyledText desktopStyle="bodyDefaultRegular">
                {robotType === FLEX_ROBOT_TYPE
                  ? t('shared:opentrons_flex')
                  : t('shared:ot2')}
              </StyledText>
            }
          />
        </ListItem>
        <ListItem type="noActive" key={`ProtocolOverview_left`}>
          <ListItemDescriptor
            type="large"
            description={
              <Flex minWidth="13.75rem">
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  color={COLORS.grey60}
                >
                  {has96Channel ? t('left_right_mount') : t('left_mount')}
                </StyledText>
              </Flex>
            }
            content={pipetteInfo(leftPipette)}
          />
        </ListItem>
        {!has96Channel ? (
          <ListItem type="noActive" key={`ProtocolOverview_right`}>
            <ListItemDescriptor
              type="large"
              description={
                <Flex minWidth="13.75rem">
                  <StyledText
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                  >
                    {t('right_mount')}
                  </StyledText>
                </Flex>
              }
              content={pipetteInfo(rightPipette)}
            />
          </ListItem>
        ) : null}
        {robotType === FLEX_ROBOT_TYPE ? (
          <ListItem type="noActive" key={`ProtocolOverview_gripper`}>
            <ListItemDescriptor
              type="large"
              description={
                <Flex minWidth="13.75rem">
                  <StyledText
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                  >
                    {t('extension')}
                  </StyledText>
                </Flex>
              }
              content={
                <StyledText desktopStyle="bodyDefaultRegular">
                  {isGripperAttached ? t('gripper') : t('na')}
                </StyledText>
              }
            />
          </ListItem>
        ) : null}
      </Flex>
    </Flex>
  )
}
