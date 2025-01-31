import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  isntStyleProp,
  JUSTIFY_SPACE_BETWEEN,
  SecondaryButton,
  SPACING,
  StyledText,
  Tabs,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getFileMetadata } from '../../file-data/selectors'
import {
  selectDropdownItem,
  selectTerminalItem,
} from '../../ui/steps/actions/actions'
import { LINE_CLAMP_TEXT_STYLE, NAV_BAR_HEIGHT_REM } from '../../atoms'
import { useKitchen } from '../Kitchen/hooks'
import { LiquidButton } from '../../molecules/LiquidButton'

import type { StyleProps, TabProps } from '@opentrons/components'

interface DesignerNavigationProps {
  hasZoomInSlot?: boolean
  tabs?: TabProps[]
  hasTrashEntity?: boolean
  showLiquidOverflowMenu?: (liquidOverflowMenu: boolean) => void
}
// Note: this navigation is used in design page and liquids page
export function DesignerNavigation({
  hasZoomInSlot,
  tabs = [],
  hasTrashEntity,
  showLiquidOverflowMenu,
}: DesignerNavigationProps): JSX.Element {
  const { t } = useTranslation('starting_deck_state')
  const location = useLocation()
  const metadata = useSelector(getFileMetadata)
  const { makeSnackbar } = useKitchen()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isLiquidsPage = location.pathname === '/liquids'

  const showProtocolEditButtons = !(hasZoomInSlot === true || isLiquidsPage)

  let metadataText = t('edit_protocol')
  if (isLiquidsPage) {
    metadataText = t('add_liquid')
  } else if (hasZoomInSlot === true) {
    metadataText = t('add_hardware_labware')
  }
  return (
    <NavContainer showShadow={!showProtocolEditButtons}>
      {showProtocolEditButtons ? <Tabs tabs={tabs} /> : null}

      <MetadataContainer showProtocolEditButtons={showProtocolEditButtons}>
        <StyledText
          desktopStyle="bodyDefaultSemiBold"
          css={LINE_CLAMP_TEXT_STYLE(1)}
        >
          {metadata?.protocolName != null && metadata?.protocolName !== ''
            ? metadata?.protocolName
            : t('untitled_protocol')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {metadataText}
        </StyledText>
      </MetadataContainer>

      <ButtonGroup>
        {showLiquidOverflowMenu != null ? (
          <LiquidButton showLiquidOverflowMenu={showLiquidOverflowMenu} />
        ) : null}

        {isLiquidsPage ? null : (
          <SecondaryButton
            onClick={() => {
              if (hasTrashEntity === true) {
                navigate('/overview')
                dispatch(selectTerminalItem('__initial_setup__'))
                dispatch(
                  selectDropdownItem({
                    selection: null,
                    mode: 'clear',
                  })
                )
              } else {
                makeSnackbar(t('trash_required') as string)
              }
            }}
          >
            {t('shared:done')}
          </SecondaryButton>
        )}
      </ButtonGroup>
    </NavContainer>
  )
}

const NavContainer = styled(Flex)<{ showShadow: boolean }>`
  z-index: ${props => (props.showShadow === true ? 11 : 0)};
  padding: ${SPACING.spacing12};
  height: ${NAV_BAR_HEIGHT_REM}rem;
  width: 100%;
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  box-shadow: ${props =>
    props.showShadow === true
      ? `0px 1px 3px 0px ${COLORS.black90}${COLORS.opacity20HexCode}`
      : 'none'};
`

interface MetadataProps extends StyleProps {
  showProtocolEditButtons: boolean
}
const MetadataContainer = styled.div.withConfig<MetadataProps>({
  shouldForwardProp: p => isntStyleProp(p) && p !== 'showProtocolEditButtons',
})<MetadataProps>`
  display: flex;
  flex-direction: ${DIRECTION_COLUMN};
  text-align: ${props =>
    props.showProtocolEditButtons
      ? TYPOGRAPHY.textAlignCenter
      : TYPOGRAPHY.textAlignLeft};

  // For screens between 600px and 767px, set width to 88px
  @media only screen and (max-width: 767px) {
    width: 88px;
  }

  // For screens between 768px and 1023px, set width to 256px
  @media only screen and (min-width: 768px) and (max-width: 1023px) {
    width: 256px;
  }

  // For screens larger than or equal to 1024px, set width to 400px
  @media only screen and (min-width: 1024px) {
    width: 400px;
  }
`

const ButtonGroup = styled(Flex)`
  grid-gap: ${SPACING.spacing8};
`
