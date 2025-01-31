import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_AUTO,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  POSITION_STICKY,
  RESPONSIVENESS,
  SPACING,
} from '@opentrons/components'

import { getIsOnDevice } from '/app/redux/config'

import { ModalContentOneColSimpleButtons } from './ModalContentOneColSimpleButtons'
import { TwoColumn } from './TwoColumn'
import { OneColumn } from './OneColumn'
import { OneColumnOrTwoColumn } from './OneColumnOrTwoColumn'
import { ModalContentMixed } from './ModalContentMixed'
import { DescriptionContent } from './DescriptionContent'
import { DeckMapContent } from './DeckMapContent'
import { CategorizedStepContent } from './CategorizedStepContent'

import type { MouseEvent, ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
import type { IconName } from '@opentrons/components'

export {
  ModalContentOneColSimpleButtons,
  TwoColumn,
  OneColumn,
  OneColumnOrTwoColumn,
  ModalContentMixed,
  DescriptionContent,
  DeckMapContent,
  CategorizedStepContent,
}

export type ModalType = 'intervention-required' | 'error'

const BASE_STYLE = {
  position: POSITION_ABSOLUTE,
  alignItems: ALIGN_CENTER,
  justifyContent: JUSTIFY_CENTER,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  padding: '1rem',
  width: '100%',
  height: '100%',
  'data-testid': '__otInterventionModalHeaderBase',
} as const

const BORDER_STYLE_BASE = `6px ${BORDERS.styleSolid}`

const MODAL_BASE_STYLE = {
  backgroundColor: COLORS.white,
  position: POSITION_RELATIVE,
  overflowY: OVERFLOW_AUTO,
  borderRadius: BORDERS.borderRadius8,
  boxShadow: BORDERS.smallDropShadow,
  'data-testid': '__otInterventionModal',
} as const

const MODAL_DESKTOP_STYLE = {
  ...MODAL_BASE_STYLE,
  maxHeight: '100%',
  width: '47rem',
} as const

const MODAL_ODD_STYLE = {
  ...MODAL_BASE_STYLE,
  width: '62rem',
  height: '35.5rem',
} as const

const BASE_HEADER_STYLE = {
  alignItems: ALIGN_CENTER,
  padding: `${SPACING.spacing20} ${SPACING.spacing32}`,
  color: COLORS.white,
  position: POSITION_STICKY,
  top: 0,
  'data-testid': '__otInterventionModalHeader',
} as const

const DESKTOP_HEADER_STYLE = {
  ...BASE_HEADER_STYLE,
  height: '3.25rem',
}

const WRAPPER_STYLE = {
  position: POSITION_ABSOLUTE,
  left: '0',
  right: '0',
  top: '0',
  bottom: '0',
  zIndex: '1',
  backgroundColor: `${COLORS.black90}${COLORS.opacity40HexCode}`,
  cursor: CURSOR_DEFAULT,
  'data-testid': '__otInterventionModalWrapper',
} as const

const INTERVENTION_REQUIRED_COLOR = COLORS.blue50
const ERROR_COLOR = COLORS.red50

export interface InterventionModalProps {
  /** Optional modal title heading. Aligned to the left. */
  titleHeading?: ReactNode
  /** Optional modal heading right of the icon. Aligned right if titleHeading is supplied, otherwise aligned left. **/
  iconHeading?: ReactNode
  /** Optional onClick for the icon heading and icon. */
  iconHeadingOnClick?: () => void
  /** overall style hint */
  type?: ModalType
  /** optional icon name */
  iconName?: IconName | null | undefined
  /* Optional icon size override. */
  iconSize?: string
  /** modal contents */
  children: ReactNode
}

export function InterventionModal({
  type,
  titleHeading,
  iconHeadingOnClick,
  iconName,
  iconHeading,
  children,
  iconSize,
}: InterventionModalProps): JSX.Element {
  const modalType = type ?? 'intervention-required'
  const headerColor =
    modalType === 'error' ? ERROR_COLOR : INTERVENTION_REQUIRED_COLOR
  const border = `${BORDER_STYLE_BASE} ${
    modalType === 'error' ? ERROR_COLOR : INTERVENTION_REQUIRED_COLOR
  }`
  const headerJustifyContent =
    titleHeading != null ? JUSTIFY_SPACE_BETWEEN : undefined

  const isOnDevice = useSelector(getIsOnDevice)
  const modalStyle = isOnDevice ? MODAL_ODD_STYLE : MODAL_DESKTOP_STYLE
  const headerStyle = isOnDevice ? BASE_HEADER_STYLE : DESKTOP_HEADER_STYLE

  return (
    <Flex {...WRAPPER_STYLE}>
      <Flex {...BASE_STYLE} zIndex={10}>
        <Flex
          {...modalStyle}
          flexDirection={DIRECTION_COLUMN}
          border={border}
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
          }}
        >
          <Flex
            {...headerStyle}
            backgroundColor={headerColor}
            justifyContent={headerJustifyContent}
          >
            {titleHeading}
            <Flex alignItems={ALIGN_CENTER} onClick={iconHeadingOnClick}>
              {iconName != null ? (
                <Icon name={iconName} css={buildIconStyle(iconSize)} />
              ) : null}
              {iconHeading != null ? iconHeading : null}
            </Flex>
          </Flex>
          {children}
        </Flex>
      </Flex>
    </Flex>
  )
}

const buildIconStyle = (
  iconSize: string | undefined
): FlattenSimpleInterpolation => css`
  width: ${iconSize ?? SPACING.spacing16};
  height: ${iconSize ?? SPACING.spacing16};
  margin: ${SPACING.spacing4};
  cursor: ${CURSOR_POINTER};

  @media (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    margin: ${SPACING.spacing12};
  }
`
