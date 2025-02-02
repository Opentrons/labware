// common styling props you can apply to any primitive component
// props are string type for flexibility, but try to use constants for safety

import pick from 'lodash/pick'

import type * as Types from './types'

import type { CSSObject } from 'styled-components'

type Text = string | number

const COLOR_PROPS = ['color', 'backgroundColor', 'opacity'] as const

const TYPOGRAPHY_PROPS = [
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textDecoration',
  'textOverflow',
] as const

const SPACING_PROPS = [
  'margin',
  'marginX',
  'marginY',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const

const BORDER_PROPS = [
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'boxShadow',
] as const

const FLEXBOX_PROPS = [
  'flex',
  'alignItems',
  'justifyContent',
  'flexDirection',
  'flexGrow',
  'flexWrap',
  'alignSelf',
  'whiteSpace',
  'gap',
] as const

const GRID_PROPS = [
  'columnGap',
  'gridGap',
  'gridTemplateAreas',
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridArea',
  'gridRow',
  'gridColumn',
] as const

const LAYOUT_PROPS = [
  'display',
  'size',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'overflow',
  'overflowX',
  'overflowY',
  'whiteSpace',
  'wordSpacing',
  'cursor',
  'overflowWrap',
] as const

const POSITION_PROPS = [
  'position',
  'zIndex',
  'top',
  'right',
  'bottom',
  'left',
  'transform',
  'transformOrigin',
  'filter',
] as const

const TRANSITION_PROPS = ['transition'] as const

export const STYLE_PROPS = [
  ...COLOR_PROPS,
  ...TYPOGRAPHY_PROPS,
  ...SPACING_PROPS,
  ...BORDER_PROPS,
  ...FLEXBOX_PROPS,
  ...GRID_PROPS,
  ...LAYOUT_PROPS,
  ...POSITION_PROPS,
  ...TRANSITION_PROPS,
]

const colorStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, COLOR_PROPS) as CSSObject
}

const typographyStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, TYPOGRAPHY_PROPS) as CSSObject
}

const spacingStyles = (props: Types.StyleProps): CSSObject => {
  const { marginX, marginY, paddingX, paddingY, ...styles } = pick(
    props,
    SPACING_PROPS
  )

  if (marginX != null) {
    styles.marginRight = styles.marginRight ?? marginX
    styles.marginLeft = styles.marginLeft ?? marginX
  }
  if (marginY != null) {
    styles.marginTop = styles.marginTop ?? marginY
    styles.marginBottom = styles.marginBottom ?? marginY
  }
  if (paddingX != null) {
    styles.paddingRight = styles.paddingRight ?? paddingX
    styles.paddingLeft = styles.paddingLeft ?? paddingX
  }
  if (paddingY != null) {
    styles.paddingTop = styles.paddingTop ?? paddingY
    styles.paddingBottom = styles.paddingBottom ?? paddingY
  }

  return styles as CSSObject
}

const borderStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, BORDER_PROPS) as CSSObject
}

const flexboxStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, FLEXBOX_PROPS) as CSSObject
}

const gridStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, GRID_PROPS) as CSSObject
}

const layoutStyles = (props: Types.StyleProps): CSSObject => {
  const { size, ...styles } = pick(props, LAYOUT_PROPS) as CSSObject

  if (size != null) {
    styles.width = styles.width ?? ((size as unknown) as typeof styles.width)
    styles.height = styles.height ?? ((size as unknown) as typeof styles.height)
  }

  return styles
}

const positionStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, POSITION_PROPS) as CSSObject
}

const transitionStyles = (props: Types.StyleProps): CSSObject => {
  return pick(props, TRANSITION_PROPS)
}

export const styleProps = (props: Types.StyleProps): CSSObject => ({
  ...colorStyles(props),
  ...typographyStyles(props),
  ...spacingStyles(props),
  ...borderStyles(props),
  ...flexboxStyles(props),
  ...gridStyles(props),
  ...layoutStyles(props),
  ...positionStyles(props),
  ...transitionStyles(props),
})

export const isntStyleProp = (prop: string | Text): boolean =>
  !STYLE_PROPS.includes(prop as typeof STYLE_PROPS[number])
