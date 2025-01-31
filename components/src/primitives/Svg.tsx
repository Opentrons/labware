import styled from 'styled-components'

import { styleProps, isntStyleProp } from './style-props'

import type { ComponentProps } from 'react'
import type { StyleProps, PrimitiveComponent } from './types'

export interface SvgProps extends StyleProps {
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

const SVG_VERSION = '1.1'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const SVG_PROPS = ['svgWidth', 'svgHeight', '_cssWidth', '_cssHeight']

/**
 * SVG primitive
 *
 * @component
 */
export const Svg: PrimitiveComponent<'svg', SvgProps> = styled.svg
  .withConfig({
    shouldForwardProp: p => {
      return (
        // do not forward style-props or Svg-props to the underlying <svg>
        (isntStyleProp(p) && !SVG_PROPS.includes(p)) ||
        // unlike other primitives, allow width and height to be forwarded
        p === 'width' ||
        p === 'height'
      )
    },
  })
  .attrs(
    (props: SvgProps): ComponentProps<PrimitiveComponent<'svg'>> => ({
      version: SVG_VERSION,
      xmlns: SVG_NAMESPACE,
      // map the explicit svgWidth/Height props to width/height attrs
      width: props.svgWidth,
      height: props.svgHeight,
      // map width and height style props to internal style props
      _cssWidth: props.width,
      _cssHeight: props.height,
    })
  )`
  ${(props: Partial<SvgProps>) => {
    const { width, height, ...otherProps } = props

    // replace width and height attrs with internal style props
    return styleProps({
      ...otherProps,
      width: otherProps._cssWidth,
      height: otherProps._cssHeight,
    })
  }}
`
