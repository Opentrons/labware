import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import debounce from 'lodash/debounce'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  ALIGN_STRETCH,
  COLORS,
  DIRECTION_COLUMN,
  FLEX_NONE,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_SPACE_EVENLY,
  Link,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import logoSvg from '/app/assets/images/logo_nav.svg'
import logoSvgThree from '/app/assets/images/logo_nav_three.svg'

import { NAV_BAR_WIDTH } from './constants'

import type { MouseEvent } from 'react'
import type { RouteProps } from './types'

const SALESFORCE_HELP_LINK = 'https://support.opentrons.com/s/'
const PROJECT: string = _OPENTRONS_PROJECT_
const DEBOUNCE_DURATION_MS = 300

const NavbarLink = styled(NavLink)`
  color: ${COLORS.white};
  align-self: ${ALIGN_STRETCH};
  background-color: ${COLORS.black90};

  &:hover {
    background-color: ${COLORS.black80};
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 3px ${COLORS.blue50};
    outline: none;
    background-color: ${COLORS.grey60};
  }

  &:focus-visible.active {
    box-shadow: none;
    outline: none;
  }

  &:active {
    background-color: ${COLORS.black90};
  }

  &.active {
    background-color: ${COLORS.black70};
  }
  &.active:has(svg) {
    background-color: ${COLORS.black90};
  }
`
const NavIconLink = styled(Link)`
  &.active > svg {
    color: ${COLORS.grey30};
    background-color: ${COLORS.black70};
  }
`
const IconLink = styled(Link)`
  &.active > svg {
    color: ${COLORS.grey30};
    background-color: ${COLORS.black70};
  }
`

const NavbarIcon = styled(Icon)`
  width: 2rem;
  height: 2rem;
  padding: ${SPACING.spacing6};
  border-radius: 50%;
  color: ${COLORS.grey30};
  background-color: ${COLORS.transparent};

  &:hover {
    background-color: ${COLORS.black80};
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 3px ${COLORS.blue50};
    outline: none;
    background-color: ${COLORS.grey60};
  }

  &:active {
    color: ${COLORS.grey30};
    background-color: ${COLORS.black90};
  }

  &.active {
    color: ${COLORS.grey30};
    background-color: ${COLORS.black70};
  }
`

const LogoImg = styled('img')`
  align-self: ${ALIGN_CENTER};
  margin: ${SPACING.spacing24} 0;
`

export function Navbar({ routes }: { routes: RouteProps[] }): JSX.Element {
  const { t } = useTranslation('top_navigation')
  const navigate = useNavigate()
  const navRoutes = routes.filter(
    ({ navLinkTo }: RouteProps) => navLinkTo != null
  )
  const debouncedNavigate = useCallback(
    debounce((path: string) => {
      navigate(path)
    }, DEBOUNCE_DURATION_MS),
    [navigate]
  )

  return (
    <Flex
      backgroundColor={COLORS.black90}
      css={TYPOGRAPHY.h3Regular}
      flexDirection={DIRECTION_COLUMN}
      flex={FLEX_NONE}
      width={NAV_BAR_WIDTH}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        flex={FLEX_NONE}
        alignItems={ALIGN_FLEX_START}
        alignSelf={ALIGN_STRETCH}
      >
        <LogoImg
          src={PROJECT === 'ot3' ? logoSvgThree : logoSvg}
          alt="opentrons logo"
        />
        {navRoutes.map(({ name, navLinkTo }: RouteProps) => (
          <NavbarLink key={name} to={navLinkTo as string}>
            <LegacyStyledText
              as="h3"
              margin={`${SPACING.spacing8} 0 ${SPACING.spacing8} ${SPACING.spacing12}`}
            >
              {t(name)}
            </LegacyStyledText>
          </NavbarLink>
        ))}
      </Flex>
      <Flex
        marginBottom={SPACING.spacing8}
        alignSelf={ALIGN_STRETCH}
        justifyContent={JUSTIFY_SPACE_EVENLY}
      >
        <NavIconLink
          role="button"
          data-testid="Navbar_settingsLink"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.preventDefault()
            debouncedNavigate('/app-settings')
          }}
        >
          <NavbarIcon name="gear" />
        </NavIconLink>
        <IconLink href={SALESFORCE_HELP_LINK} external>
          <NavbarIcon
            data-testid="Navbar_helpLink"
            name="question-mark-circle"
          />
        </IconLink>
      </Flex>
    </Flex>
  )
}
