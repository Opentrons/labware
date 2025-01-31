import { css } from 'styled-components'

import { Icon } from '../icons'
import { Box, Btn, Flex } from '../primitives'
import { LegacyStyledText } from '../atoms'
import { ALIGN_CENTER, JUSTIFY_CENTER, JUSTIFY_SPACE_BETWEEN } from '../styles'
import { SPACING, TYPOGRAPHY } from '../ui-style-constants'
import { COLORS } from '../helix-design-system'

import type { MouseEventHandler, ReactNode } from 'react'
import type { IconProps } from '../icons'

export interface ModalHeaderProps {
  title: ReactNode
  onClose?: MouseEventHandler
  titleElement1?: JSX.Element
  titleElement2?: JSX.Element
  backgroundColor?: string
  color?: string
  icon?: IconProps
  closeButton?: ReactNode
}

const closeIconStyles = css`
  display: flex;
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  border-radius: 0.875rem;
  width: 1.625rem;
  height: 1.625rem;
  &:hover {
    background-color: ${COLORS.grey30};
  }

  &:active {
    background-color: ${COLORS.grey35};
  }
`

export const ModalHeader = (props: ModalHeaderProps): JSX.Element => {
  const {
    icon,
    onClose,
    title,
    titleElement1,
    titleElement2,
    backgroundColor,
    color,
    closeButton,
  } = props
  return (
    <>
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        paddingX={SPACING.spacing24}
        paddingY={SPACING.spacing16}
        backgroundColor={backgroundColor}
        data-testid="Modal_header"
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          {icon != null && <Icon {...icon} data-testid="Modal_header_icon" />}
          {titleElement1}
          {titleElement2}
          {/* TODO (nd: 08/07/2024) Convert to StyledText once designs are resolved */}
          <LegacyStyledText
            as="h3"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            color={color}
          >
            {title}
          </LegacyStyledText>
        </Flex>
        {closeButton != null
          ? closeButton
          : onClose != null && (
              <Btn
                onClick={onClose}
                css={closeIconStyles}
                data-testid={`ModalHeader_icon_close${
                  typeof title === 'string' ? `_${title}` : ''
                }`}
              >
                <Icon
                  name="close"
                  width={SPACING.spacing24}
                  height={SPACING.spacing24}
                  color={color}
                />
              </Btn>
            )}
      </Flex>
      <Box
        borderBottom={`1px solid ${COLORS.grey30}`}
        marginY="0"
        width="100%"
        data-testid="divider"
      />
    </>
  )
}
