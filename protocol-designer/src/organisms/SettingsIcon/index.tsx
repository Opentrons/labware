import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { css } from 'styled-components'

import {
  BORDERS,
  Btn,
  COLORS,
  CURSOR_POINTER,
  Flex,
  Icon,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import { getFileMetadata } from '../../file-data/selectors'

export const SettingsIcon = (): JSX.Element => {
  const location = useLocation()
  const navigate = useNavigate()
  const metadata = useSelector(getFileMetadata)

  const handleNavigate = (): void => {
    if (metadata?.created != null && location.pathname === '/settings') {
      navigate(-1)
    } else if (location.pathname !== '/settings') {
      navigate('/settings')
    } else {
      navigate('/')
    }
  }

  return (
    <Flex
      data-testid="SettingsIcon"
      borderRadius={BORDERS.borderRadiusFull}
      backgroundColor={
        location.pathname === '/settings' ? COLORS.grey35 : COLORS.transparent
      }
      cursor={CURSOR_POINTER}
      justifyContent={JUSTIFY_CENTER}
    >
      <Btn
        onClick={handleNavigate}
        css={GEAR_ICON_STYLE}
        data-testid="SettingsIconButton"
      >
        <Flex justifyContent={JUSTIFY_CENTER}>
          <Icon size="1rem" name="gear" />
        </Flex>
      </Btn>
    </Flex>
  )
}

const GEAR_ICON_STYLE = css`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: ${COLORS.grey60};

  &:hover {
    background-color: ${COLORS.grey30};
  }

  &:active {
    color: ${COLORS.grey60};
    background-color: ${COLORS.grey35};
  }

  &:focus-visible {
    position: relative;
    outline: none;

    /* blue ring */
    &::after {
      content: '';
      position: absolute;
      top: -0.5rem;
      left: -0.5rem;
      right: -0.5rem;
      bottom: -0.5rem;

      border: 3px solid ${COLORS.blue50};
      border-radius: 50%;
      pointer-events: none;
      box-sizing: content-box;
    }
    background-color: ${COLORS.grey35};
  }
`
