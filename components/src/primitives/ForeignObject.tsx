import styled from 'styled-components'

import { styleProps, isntStyleProp } from './style-props'

import type { ComponentProps } from 'react'
import type { StyleProps, PrimitiveComponent } from './types'

export interface ForeignObjectProps extends StyleProps {
  /** attach a width attribute to the <svg> element */
  svgWidth?: string | number
  /** attach a height attribute to the <svg> element */
  svgHeight?: string | number
  /**
   * internal helper prop to remap width style-prop to CSS
   * @internal
   */
  _cssWidth?: string | number
  /**
   * internal helper prop to remap height style-prop to CSS
   * @internal
   */
  _cssHeight?: string | number
}

const SVG_PROPS = ['x', 'y', 'svgWidth', 'svgHeight', '_cssWidth', '_cssHeight']

/**
 * Foreign Object styled atomic component
 *
 * @component
 */
export const ForeignObject: PrimitiveComponent<
  'foreignObject',
  ForeignObjectProps
> = styled.foreignObject
  .withConfig({
    shouldForwardProp: p => {
      return (
        // do not forward style-props or Svg-props to the underlying <svg>
        (isntStyleProp(p) && !SVG_PROPS.includes(p)) ||
        // unlike other components; allow x, y, width, and height to be forwarded
        p === 'width' ||
        p === 'height' ||
        p === 'x' ||
        p === 'y'
      )
    },
  })
  .attrs(
    (props: ForeignObjectProps): ComponentProps<PrimitiveComponent<'svg'>> => ({
      // map the explicit svgWidth/Height props to width/height attrs
      width: props.svgWidth,
      height: props.svgHeight,
      // map width and height style props to internal style props
      _cssWidth: props.width,
      _cssHeight: props.height,
    })
  )`
  ${(props: Partial<ForeignObjectProps>) => {
    const { width, height, ...otherProps } = props

    // replace width and height attrs with internal style props
    return styleProps({
      ...otherProps,
      width: otherProps._cssWidth,
      height: otherProps._cssHeight,
    })
  }}
`
