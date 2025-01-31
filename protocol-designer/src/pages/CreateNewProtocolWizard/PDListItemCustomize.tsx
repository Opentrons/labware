import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DropdownMenu,
  Flex,
  JUSTIFY_FLEX_END,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING,
  StyledText,
  Tag,
  TYPOGRAPHY,
  WRAP,
} from '@opentrons/components'

import { useResponsiveBreakpoints } from '../../resources/useResponsiveBreakpoints'
import type { DropdownMenuProps, TagProps } from '@opentrons/components'

interface PDListItemCustomizeProps {
  header: string
  leftHeaderItem?: JSX.Element
  onClick?: () => void
  linkText?: string
  label?: string
  dropdown?: DropdownMenuProps
  tag?: TagProps
}

export function PDListItemCustomize({
  header,
  leftHeaderItem,
  onClick,
  linkText,
  label,
  dropdown,
  tag,
}: PDListItemCustomizeProps): JSX.Element {
  const responsiveType = useResponsiveBreakpoints()
  const isLargeScreen = responsiveType === 'xl' || responsiveType === 'lg'
  const flexSize = responsiveType === 'xl' ? '0 0 1.5' : '0 0 1'

  const renderDropdownAndTag = (): JSX.Element => (
    <>
      {label != null && (
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {label}
        </StyledText>
      )}
      {dropdown != null && (
        <Flex paddingBottom={SPACING.spacing8}>
          <DropdownMenu {...dropdown} menuPlacement="bottom" />
        </Flex>
      )}
      {tag != null && <Tag {...tag} />}
    </>
  )

  const renderLinkButton = (): JSX.Element | null =>
    onClick != null && linkText != null ? (
      <Link
        role="button"
        onClick={onClick}
        css={css`
          padding: ${SPACING.spacing4};
          text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
          color: ${COLORS.grey60};
          &:hover {
            color: ${COLORS.grey40};
          }
        `}
      >
        <StyledText desktopStyle="bodyDefaultRegular">{linkText}</StyledText>
      </Link>
    ) : null

  return (
    <Flex
      width="100%"
      alignItems={ALIGN_CENTER}
      padding={SPACING.spacing12}
      gridGap={SPACING.spacing16}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      flexWrap={isLargeScreen ? undefined : WRAP}
    >
      <Flex
        gridGap={SPACING.spacing16}
        alignItems={ALIGN_CENTER}
        flex={flexSize}
        width="100%"
      >
        {leftHeaderItem != null && <Flex size="3.75rem">{leftHeaderItem}</Flex>}
        <StyledText desktopStyle="bodyDefaultSemiBold">{header}</StyledText>
      </Flex>

      <Flex
        flexWrap={isLargeScreen ? undefined : WRAP}
        alignItems={ALIGN_CENTER}
        justifyContent={
          responsiveType === 'md' || responsiveType === 'sm'
            ? JUSTIFY_SPACE_BETWEEN
            : JUSTIFY_FLEX_END
        }
        width="100%"
        gridGap={SPACING.spacing16}
      >
        {responsiveType !== 'xs' && (
          <Flex
            flex={flexSize}
            gridGap={SPACING.spacing8}
            alignItems={ALIGN_CENTER}
            justifyContent={
              isLargeScreen ? JUSTIFY_FLEX_END : JUSTIFY_FLEX_START
            }
            width="max-content"
          >
            {renderDropdownAndTag()}
          </Flex>
        )}
        {renderLinkButton()}
      </Flex>
    </Flex>
  )
}
