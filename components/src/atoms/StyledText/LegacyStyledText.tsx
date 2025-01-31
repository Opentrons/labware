import styled, { css } from 'styled-components'
import { Text } from '../../primitives'
import { TYPOGRAPHY, RESPONSIVENESS } from '../../ui-style-constants'

import type { ComponentProps, ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'

export interface LegacyProps extends ComponentProps<typeof Text> {
  children?: ReactNode
}

const styleMap: { [tag: string]: FlattenSimpleInterpolation } = {
  h1: css`
    ${TYPOGRAPHY.h1Default};
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level1Header};
    }
  `,
  h2: css`
    ${TYPOGRAPHY.h2Regular}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level2HeaderRegular};
    }
  `,
  h3: css`
    ${TYPOGRAPHY.h3Regular}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level3HeaderRegular};
    }
  `,
  h4: css`
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level4HeaderRegular};
    }
  `,
  h6: TYPOGRAPHY.h6Default,
  p: css`
    ${TYPOGRAPHY.pRegular}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.bodyTextRegular}
    }
  `,
  label: css`
    ${TYPOGRAPHY.labelRegular}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.smallBodyTextRegular}
    }
  `,
  h2SemiBold: css`
    ${TYPOGRAPHY.h2SemiBold}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level2HeaderSemiBold}
    }
  `,
  h3SemiBold: css`
    ${TYPOGRAPHY.h3SemiBold}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.level3HeaderSemiBold}
    }
  `,
  h4SemiBold: TYPOGRAPHY.level4HeaderSemiBold,
  h6SemiBold: TYPOGRAPHY.h6SemiBold,
  pSemiBold: css`
    ${TYPOGRAPHY.pSemiBold}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      ${TYPOGRAPHY.bodyTextSemiBold}
    }
  `,
  labelSemiBold: css`
    ${TYPOGRAPHY.labelSemiBold}
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      font-size: ${TYPOGRAPHY.fontSize20};
      line-height: ${TYPOGRAPHY.lineHeight24};
    }
  `,
  h2Bold: TYPOGRAPHY.level2HeaderBold,
  h3Bold: TYPOGRAPHY.level3HeaderBold,
  h4Bold: TYPOGRAPHY.level4HeaderBold,
  pBold: TYPOGRAPHY.bodyTextBold,
  labelBold: TYPOGRAPHY.smallBodyTextBold,
}

export const LegacyStyledText: (props: LegacyProps) => JSX.Element = styled(
  Text
)<LegacyProps>`
  ${props => {
    let fontWeight = ''
    if (props.fontWeight === TYPOGRAPHY.fontWeightSemiBold) {
      fontWeight = 'SemiBold'
    } else if (props.fontWeight === TYPOGRAPHY.fontWeightBold) {
      fontWeight = 'Bold'
    }
    return styleMap[`${props.as}${fontWeight}`]
  }}
`
