import { StyledText } from '../../atoms'
import { COLORS } from '../../helix-design-system'
import { Flex, Link } from '../../primitives'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  TEXT_DECORATION_UNDERLINE,
} from '../../styles'
import { SPACING } from '../../ui-style-constants'

const PRIVACY_POLICY_URL = 'https://opentrons.com/privacy-policy'
const EULA_URL = 'https://opentrons.com/eula'

export function EndUserAgreementFooter(): JSX.Element {
  return (
    <Flex
      backgroundColor={COLORS.grey10}
      padding={SPACING.spacing24}
      width="100%"
      alignItems={ALIGN_CENTER}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
    >
      <StyledText desktopStyle="captionRegular">
        By continuing, you agree to the Opentrons{' '}
        <Link
          external
          href={PRIVACY_POLICY_URL}
          color={COLORS.black90}
          textDecoration={TEXT_DECORATION_UNDERLINE}
        >
          privacy policy
        </Link>{' '}
        and{' '}
        <Link
          external
          href={EULA_URL}
          color={COLORS.black90}
          textDecoration={TEXT_DECORATION_UNDERLINE}
        >
          end user license agreement
        </Link>
      </StyledText>
      <StyledText desktopStyle="captionRegular">
        Copyright © 2024 Opentrons
      </StyledText>
    </Flex>
  )
}
