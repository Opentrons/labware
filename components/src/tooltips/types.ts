import type { CSSProperties, RefCallback } from 'react'

import type { Instance, Options, Modifier } from '@popperjs/core/lib/types'

import type { UseHoverOptions, HoverHandlers } from '../interaction-enhancers'

export type Placement = Options['placement']

export type Strategy = Options['strategy']

export type PopperInstance = Instance

export type PopperOptions = Options

export type PopperModifer<T> = Modifier<T>

export type HandleStateUpdate = (
  placement: Placement,
  styles: {
    popper?: CSSProperties
    arrow?: CSSProperties
  }
) => void

export interface UsePopperOptions {
  target: Element | null
  tooltip: HTMLElement | null
  arrow: HTMLElement | null
  onStateUpdate: HandleStateUpdate
  placement?: Placement | null
  strategy?: Strategy | null
  offset?: number
}

export type UsePopperResult = Instance | null

export interface UseTooltipOptions {
  placement?: Placement
  strategy?: Strategy
  offset?: number
}

export interface UseTooltipResultTargetProps {
  ref: RefCallback<Element | null>
  'aria-describedby': string
}

export interface UseTooltipResultTooltipProps {
  id: string
  ref: RefCallback<HTMLElement | null>
  placement: Placement | null
  style: CSSProperties
  arrowRef: RefCallback<HTMLElement | null>
  arrowStyle: CSSProperties
}

export type UseTooltipResult = [
  UseTooltipResultTargetProps,
  UseTooltipResultTooltipProps
]

export type UseHoverTooltipOptions = Partial<
  UseTooltipOptions & UseHoverOptions
>

export interface UseHoverTooltipTargetProps
  extends UseTooltipResultTargetProps,
    HoverHandlers {}

export type UseHoverTooltipResult = [
  UseHoverTooltipTargetProps,
  UseTooltipResultTooltipProps & { visible: boolean }
]
