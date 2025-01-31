import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getPipetteSpecsV2 } from '@opentrons/shared-data'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { getLabwareDefsByURI } from '../../labware-defs/selectors'
import type { PipetteMount, PipetteName } from '@opentrons/shared-data'

interface PipetteInfoItemProps {
  mount: PipetteMount
  pipetteName: PipetteName
  tiprackDefURIs: string[]
  editClick: () => void
  cleanForm: () => void
}

export function PipetteInfoItem(props: PipetteInfoItemProps): JSX.Element {
  const { mount, pipetteName, tiprackDefURIs, editClick, cleanForm } = props
  const { t, i18n } = useTranslation('create_new_protocol')
  const allLabware = useSelector(getLabwareDefsByURI)
  const is96Channel = pipetteName === 'p1000_96'

  return (
    <ListItem type="noActive">
      <Flex
        padding={SPACING.spacing12}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        width="100%"
      >
        <Flex gridGap={SPACING.spacing4} flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {i18n.format(
              t('pipette', {
                mount: is96Channel ? t('left_right') : mount,
              }),
              'titleCase'
            )}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {getPipetteSpecsV2(pipetteName)?.displayName}
          </StyledText>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            {tiprackDefURIs.map((uri, index) => (
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
                key={`${uri}_${index}`}
              >
                {allLabware[uri].metadata.displayName}
              </StyledText>
            ))}
          </Flex>
        </Flex>
        <Flex
          gridGap={SPACING.spacing16}
          textDecoration={TYPOGRAPHY.textDecorationUnderline}
        >
          <Btn
            onClick={editClick}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            css={LINK_BUTTON_STYLE}
            padding={SPACING.spacing4}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('edit')}
            </StyledText>
          </Btn>
          <Btn
            onClick={() => {
              cleanForm()
            }}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            css={LINK_BUTTON_STYLE}
            padding={SPACING.spacing4}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('remove')}
            </StyledText>
          </Btn>
        </Flex>
      </Flex>
    </ListItem>
  )
}
