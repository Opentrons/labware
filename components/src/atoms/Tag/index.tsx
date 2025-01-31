import { css } from 'styled-components'
import { BORDERS, COLORS } from '../../helix-design-system'
import { Flex } from '../../primitives'
import { ALIGN_CENTER, DIRECTION_ROW, FLEX_MAX_CONTENT } from '../../styles'
import { RESPONSIVENESS, SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import { Icon } from '../../icons'
import { LegacyStyledText } from '../StyledText'

import type { IconName } from '../../icons'

export type TagType = 'default' | 'interactive' | 'branded'

export interface TagProps {
  /** Tag content */
  text: string
  /** name constant of the text color and the icon color to display */
  type: TagType
  /** iconLocation */
  iconPosition?: 'left' | 'right'
  /** Tagicon */
  iconName?: IconName
  shrinkToContent?: boolean
}

const defaultColors = {
  backgroundColor: `${COLORS.black90}${COLORS.opacity20HexCode}`,
  color: COLORS.black90,
}

const TAG_PROPS_BY_TYPE: Record<
  TagType,
  {
    backgroundColor: string
    color: string
  }
> = {
  default: defaultColors,
  interactive: defaultColors,
  branded: {
    backgroundColor: COLORS.blue50,
    color: COLORS.white,
  },
}

export function Tag(props: TagProps): JSX.Element {
  const { iconName, type, text, iconPosition, shrinkToContent = false } = props

  const DEFAULT_CONTAINER_STYLE = css`
    padding: ${SPACING.spacing2} ${SPACING.spacing8};
    border-radius: ${BORDERS.borderRadius4};
    width: ${shrinkToContent ? FLEX_MAX_CONTENT : 'none'};
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      border-radius: ${BORDERS.borderRadius8};
      padding: ${SPACING.spacing8} ${SPACING.spacing12};
    }
  `

  const INTERACTIVE_CONTAINER_STYLE = css`
    ${DEFAULT_CONTAINER_STYLE}
    &:hover {
      background-color: ${COLORS.black90}${COLORS.opacity40HexCode};
    }
    &:focus-visible {
      box-shadow: 0 0 0 3px ${COLORS.blue50};
      outline: none;
    }
  `

  const ICON_STYLE = css`
    width: 0.75rem;
    height: 0.875rem;
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      width: 1.5rem;
      height: 1.5rem;
    }
  `

  const TEXT_STYLE = css`
    ${TYPOGRAPHY.h3Regular}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.bodyTextRegular}
    }
  `

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      flexDirection={DIRECTION_ROW}
      color={TAG_PROPS_BY_TYPE[type].color}
      backgroundColor={TAG_PROPS_BY_TYPE[type].backgroundColor}
      css={
        type === 'interactive'
          ? INTERACTIVE_CONTAINER_STYLE
          : DEFAULT_CONTAINER_STYLE
      }
      gridGap={SPACING.spacing4}
      data-testid={`Tag_${type}`}
    >
      {iconName != null && iconPosition === 'left' ? (
        <Icon
          name={iconName}
          aria-label={`icon_left_${text}`}
          css={ICON_STYLE}
        />
      ) : null}
      <LegacyStyledText css={TEXT_STYLE}>{text}</LegacyStyledText>
      {iconName != null && iconPosition === 'right' ? (
        <Icon
          name={iconName}
          aria-label={`icon_right_${text}`}
          css={ICON_STYLE}
        />
      ) : null}
    </Flex>
  )
}
