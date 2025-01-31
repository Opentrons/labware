import {
  Icon,
  Flex,
  Box,
  LegacyStyledText,
  DIRECTION_COLUMN,
  SPACING,
  COLORS,
  ALIGN_CENTER,
  RESPONSIVENESS,
} from '@opentrons/components'

export type ModalContentMixedType =
  | 'icon'
  | 'image'
  | 'spinner'
  | 'no-media'
  | undefined

export type ModalContentMixedIcons = 'error' | 'caution' | 'neutral'

export const MODAL_CONTENT_MIXED_ICONS: Record<
  ModalContentMixedIcons,
  string
> = {
  neutral: COLORS.grey50,
  caution: COLORS.yellow50,
  error: COLORS.red50,
}

interface ModalContentMixedIconProps {
  type: 'icon'
  iconType: ModalContentMixedIcons
}

interface ModalContentMixedImageProps {
  type: 'image'
  imageUrl: string
  imageAltText: string
  imageAriaLabel: string
}

interface ModalContentMixedSpinnerProps {
  type: 'spinner'
}

interface ModalContentMixedNoMediaProps {
  type: 'no-media' | undefined
}

type ModalContentMixedMandatoryHeadlineProps =
  | ModalContentMixedIconProps
  | ModalContentMixedImageProps

type ModalContentMixedNoMandatoryHeadlineProps =
  | ModalContentMixedSpinnerProps
  | ModalContentMixedNoMediaProps

interface ModalContentMixedTextProps {
  headline: string
  subText?: string
}

export type ModalContentMixedProps =
  | (ModalContentMixedMandatoryHeadlineProps & ModalContentMixedTextProps)
  | (ModalContentMixedNoMandatoryHeadlineProps &
      Partial<ModalContentMixedTextProps>)
export function ModalContentMixed(props: ModalContentMixedProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      alignItems={ALIGN_CENTER}
      padding={SPACING.spacing40}
    >
      <ModalContentMixedMedia {...props} />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        css={`
          gap: ${SPACING.spacing8};

          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing4};
          }
        `}
      >
        {props.headline != null ? (
          <LegacyStyledText
            oddStyle="level3HeaderBold"
            desktopStyle="headingSmallBold"
          >
            {props.headline}
          </LegacyStyledText>
        ) : null}
        {props.subText != null ? (
          <LegacyStyledText
            oddStyle="level4HeaderRegular"
            desktopStyle="bodyDefaultRegular"
            color={COLORS.grey60}
          >
            {props.subText}
          </LegacyStyledText>
        ) : null}
      </Flex>
    </Flex>
  )
}

function ModalContentMixedMedia(
  props:
    | ModalContentMixedMandatoryHeadlineProps
    | ModalContentMixedNoMandatoryHeadlineProps
): JSX.Element {
  switch (props?.type) {
    case 'icon':
      return <ModalContentMixedIcon {...props} />
    case 'spinner':
      return <ModalContentMixedSpinner {...props} />
    case 'image':
      return <ModalContentMixedImage {...props} />
    case 'no-media':
    case undefined:
      return <></>
  }
}

function ModalContentMixedIcon(props: ModalContentMixedIconProps): JSX.Element {
  return (
    <Box
      marginBottom={SPACING.spacing24}
      css={`
        width: ${SPACING.spacing40};
        margin-bottom: ${SPACING.spacing16};
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          width: ${SPACING.spacing60};
          margin-bottom: ${SPACING.spacing24};
        }
      `}
    >
      <Icon
        name="ot-alert"
        color={MODAL_CONTENT_MIXED_ICONS[props.iconType]}
        size="100%"
      />
    </Box>
  )
}

function ModalContentMixedSpinner(
  props: ModalContentMixedSpinnerProps
): JSX.Element {
  return (
    <Box
      marginBottom={SPACING.spacing16}
      width="80px"
      css={`
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          width: 100px;
          margin-bottom: ${SPACING.spacing24};
        }
      `}
    >
      <Icon name="ot-spinner" color={COLORS.grey60} width="100%" spin />
    </Box>
  )
}

function ModalContentMixedImage(
  props: ModalContentMixedImageProps
): JSX.Element {
  return (
    <img
      src={props.imageUrl}
      aria-label={props.imageAriaLabel}
      alt={props.imageAltText}
      css={`
        height: 150px;
        margin-bottom: ${SPACING.spacing16};
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          height: 180px;
          margin-bottom: ${SPACING.spacing24};
        }
      `}
    />
  )
}
