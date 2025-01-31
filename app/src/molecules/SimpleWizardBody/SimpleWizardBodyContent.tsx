import { useSelector } from 'react-redux'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_ABSOLUTE,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import SuccessIcon from '/app/assets/images/icon_success.png'
import { getIsOnDevice } from '/app/redux/config'

import { Skeleton } from '/app/atoms/Skeleton'

import type { ReactNode } from 'react'
import type { RobotType } from '@opentrons/shared-data'

interface Props {
  iconColor: string
  header: string
  isSuccess: boolean
  children?: ReactNode
  subHeader?: string | JSX.Element
  isPending?: boolean
  robotType?: RobotType
  /**
   *  this prop is to change justifyContent of OnDeviceDisplay buttons
   *  TODO(jr, 8/9/23): this SHOULD be refactored so the
   *  buttons' justifyContent is specified at the parent level
   */
  justifyContentForOddButton?: string
}

const BACKGROUND_SIZE = '47rem'

const HEADER_STYLE = css`
  ${TYPOGRAPHY.h1Default};
  margin-top: ${SPACING.spacing24};
  margin-bottom: ${SPACING.spacing8};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 2rem;
    font-weight: 700;
    line-height: ${SPACING.spacing40};
  }
`
const SUBHEADER_STYLE = css`
  ${TYPOGRAPHY.pRegular};
  margin-left: 6.25rem;
  margin-right: 6.25rem;
  margin-bottom: ${SPACING.spacing32};
  text-align: ${TYPOGRAPHY.textAlignCenter};
  height: 1.75rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: ${TYPOGRAPHY.fontSize28};
    line-height: ${TYPOGRAPHY.lineHeight36};
    margin-left: 4.5rem;
    margin-right: 4.5rem;
  }
`

const FLEX_SPACING_STYLE = css`
  height: 1.75rem;
  margin-bottom: ${SPACING.spacing32};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 0rem;
  }
`

export function SimpleWizardBodyContent(props: Props): JSX.Element {
  const {
    iconColor,
    children,
    header,
    subHeader,
    isSuccess,
    isPending,
    robotType = FLEX_ROBOT_TYPE,
  } = props
  const isOnDevice = useSelector(getIsOnDevice)

  const BUTTON_STYLE = css`
    width: 100%;
    justify-content: ${JUSTIFY_FLEX_END};
    padding-right: ${SPACING.spacing32};
    padding-bottom: ${SPACING.spacing32};

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      justify-content: ${props.justifyContentForOddButton ??
      JUSTIFY_SPACE_BETWEEN};
      padding-bottom: ${SPACING.spacing32};
      padding-left: ${SPACING.spacing32};
    }
  `

  const ICON_POSITION_STYLE = css`
    justify-content: ${JUSTIFY_CENTER};

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      justify-content: ${JUSTIFY_FLEX_START};
      margin-top: ${isSuccess ? SPACING.spacing32 : '8.1875rem'};
    }
  `

  return (
    <>
      <Flex
        width="100%"
        alignItems={ALIGN_CENTER}
        css={ICON_POSITION_STYLE}
        flexDirection={DIRECTION_COLUMN}
        flex="1 0 auto"
      >
        {isPending ? (
          <Flex
            gridGap={SPACING.spacing24}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Skeleton
              width="6.25rem"
              height="6.25rem"
              backgroundSize={BACKGROUND_SIZE}
            />
            <Skeleton
              width="18rem"
              height="1.125rem"
              backgroundSize={BACKGROUND_SIZE}
            />
          </Flex>
        ) : (
          <>
            {isSuccess ? (
              <img
                width={robotType === FLEX_ROBOT_TYPE ? '250px' : '160px'}
                height={robotType === FLEX_ROBOT_TYPE ? '208px' : '120px'}
                src={SuccessIcon}
                alt="Success Icon"
              />
            ) : (
              <Icon
                name="ot-alert"
                size={isOnDevice ? '3.75rem' : '2.5rem'}
                color={iconColor}
                aria-label="ot-alert"
              />
            )}
            <LegacyStyledText css={HEADER_STYLE}>{header}</LegacyStyledText>
            {subHeader != null ? (
              <LegacyStyledText css={SUBHEADER_STYLE}>
                {subHeader}
              </LegacyStyledText>
            ) : (
              <Flex aria-label="flex_spacing" css={FLEX_SPACING_STYLE} />
            )}
          </>
        )}
      </Flex>
      <Flex
        position={POSITION_ABSOLUTE}
        bottom={0}
        right={0}
        css={BUTTON_STYLE}
      >
        {children}
      </Flex>
    </>
  )
}
