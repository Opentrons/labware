import { useRef, useState, useEffect } from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_WRAP_ANYWHERE,
  Overlay,
  POSITION_FIXED,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { Divider } from '../structure'

import type { ReactElement, ReactNode } from 'react'

export interface MultiSlideoutSpecs {
  currentStep: number
  maxSteps: number
}
export interface SlideoutProps {
  title: string | ReactElement
  children: ReactNode
  onCloseClick: () => void
  //  isExpanded is for collapse and expand animation
  isExpanded?: boolean
  footer?: ReactNode
  multiSlideoutSpecs?: MultiSlideoutSpecs
}

const SHARED_STYLE = css`
  z-index: 2;
  @keyframes slidein {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes slideout {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(100%);
    }
  }
  @keyframes overlayin {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.35;
    }
  }
  @keyframes overlayout {
    from {
      opacity: 0.35;
      visibility: visible;
    }
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
`
const EXPANDED_STYLE = css`
  ${SHARED_STYLE}
  animation: slidein 300ms forwards;
`
const COLLAPSED_STYLE = css`
  ${SHARED_STYLE}
  animation: slideout 300ms forwards;
  overflow: hidden;
`
const INITIALLY_COLLAPSED_STYLE = css`
  ${SHARED_STYLE}
  animation: slideout 0ms forwards;
  overflow: hidden;
`
const OVERLAY_IN_STYLE = css`
  ${SHARED_STYLE}
  animation: overlayin 300ms forwards;
  overflow: hidden;
`
const OVERLAY_OUT_STYLE = css`
  ${SHARED_STYLE}
  animation: overlayout 300ms forwards;
  overflow: hidden;
`
const INITIALLY_OVERLAY_OUT_STYLE = css`
  ${SHARED_STYLE}
  animation: overlayout 0ms forwards;
  overflow: hidden;
`

const CLOSE_ICON_STYLE = css`
  border-radius: 50%;

  &:hover {
    background: ${COLORS.grey30};
  }
  &:active {
    background: ${COLORS.grey35};
  }
`

export const Slideout = (props: SlideoutProps): JSX.Element => {
  const {
    isExpanded,
    title,
    onCloseClick,
    children,
    footer,
    multiSlideoutSpecs,
  } = props
  const { t } = useTranslation('shared')
  const slideOutRef = useRef<HTMLDivElement>(null)
  const [isReachedBottom, setIsReachedBottom] = useState<boolean>(false)
  const hasBeenExpanded = useRef<boolean>(isExpanded ?? false)
  const handleScroll = (): void => {
    if (slideOutRef.current == null) return
    const { scrollTop, scrollHeight, clientHeight } = slideOutRef.current
    if (scrollTop + clientHeight === scrollHeight) {
      setIsReachedBottom(true)
    } else {
      setIsReachedBottom(false)
    }
  }

  useEffect(() => {
    handleScroll()
  }, [slideOutRef])

  const handleClose = (): void => {
    hasBeenExpanded.current = true
    onCloseClick()
  }

  const collapsedStyle = hasBeenExpanded.current
    ? COLLAPSED_STYLE
    : INITIALLY_COLLAPSED_STYLE
  const overlayOutStyle = hasBeenExpanded.current
    ? OVERLAY_OUT_STYLE
    : INITIALLY_OVERLAY_OUT_STYLE

  return (
    <>
      <Overlay
        onClick={handleClose}
        css={`
          ${isExpanded ?? false ? OVERLAY_IN_STYLE : overlayOutStyle}
        `}
        backgroundColor={COLORS.black90}
      />
      <Box
        css={isExpanded ?? false ? EXPANDED_STYLE : collapsedStyle}
        cursor="auto"
        position={POSITION_FIXED}
        right="0"
        top="0"
        backgroundColor={COLORS.white}
        boxShadow="0px 3px 6px rgba(0, 0, 0, 0.23)"
        height="100%"
      >
        <Flex
          paddingY={SPACING.spacing16}
          width="19.5rem"
          height="100%"
          flex="0 1 auto"
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          {multiSlideoutSpecs === undefined ? null : (
            <LegacyStyledText
              as="p"
              color={COLORS.grey60}
              alignItems={ALIGN_CENTER}
              paddingX={SPACING.spacing16}
            >
              {t('step', {
                current: multiSlideoutSpecs.currentStep,
                max: multiSlideoutSpecs.maxSteps,
              })}
            </LegacyStyledText>
          )}
          {typeof title === 'string' ? (
            <Flex
              flexDirection={DIRECTION_ROW}
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              alignItems={ALIGN_CENTER}
              paddingX={SPACING.spacing16}
              marginBottom={SPACING.spacing16}
            >
              <LegacyStyledText
                as="h2"
                overflowWrap={OVERFLOW_WRAP_ANYWHERE}
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                data-testid={`Slideout_title_${title}`}
              >
                {title}
              </LegacyStyledText>
              <Flex alignItems={ALIGN_CENTER}>
                <Btn
                  size="1.5rem"
                  onClick={handleClose}
                  aria-label="exit"
                  data-testid={`Slideout_icon_close_${title}`}
                >
                  <Icon name="close" css={CLOSE_ICON_STYLE} />
                </Btn>
              </Flex>
            </Flex>
          ) : (
            <>{title}</>
          )}
          <Divider marginY={0} color={COLORS.grey30} />
          <Box
            padding={SPACING.spacing16}
            flex="1 1 auto"
            overflowY="auto"
            data-testid={`Slideout_body_${
              typeof title === 'string' ? title : ''
            }`}
            ref={slideOutRef}
            onScroll={handleScroll}
          >
            {children}
          </Box>
          {footer != null ? (
            <Box
              paddingTop={SPACING.spacing16}
              paddingX={SPACING.spacing16}
              flex="0 0 auto"
              boxShadow={isReachedBottom ? 'none' : '0px -4px 12px #0000001a'}
              zIndex="3"
            >
              {footer}
            </Box>
          ) : null}
        </Flex>
      </Box>
    </>
  )
}
