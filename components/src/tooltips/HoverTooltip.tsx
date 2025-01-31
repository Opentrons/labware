import { Component } from 'react'

import { DeprecatedTooltip } from './DeprecatedTooltip'

import type { PropsWithRef } from 'react'
import type { DeprecatedTooltipProps } from './DeprecatedTooltip'

const OPEN_DELAY_MS = 300
const CLOSE_DELAY_MS = 0

interface MouseHandlers {
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export type HoverTooltipHandlers = PropsWithRef<MouseHandlers>

export type HoverTooltipProps = DeprecatedTooltipProps

interface HoverTooltipState {
  isOpen: boolean
}

/**
 * Tooltip component that triggers on `MouseEnter` and `MouseLeave`. See
 * `Tooltip` for full props list.
 *
 * `props.children` is a function that receives the following props object:
 * ```js
 * type HoverTooltipHandlers = {
 *   ref: React.Ref<*>,
 *   onMouseEnter: (React.MouseEvent) => void,
 *   onMouseLeave: (React.MouseEvent) => void,
 * }
 * ```
 *
 * @deprecated Use `Tooltip` and `useHoverTooltip` instead
 */
export class HoverTooltip extends Component<
  HoverTooltipProps,
  HoverTooltipState
> {
  openTimeout: number | null
  closeTimeout: number | null

  constructor(props: HoverTooltipProps) {
    super(props)
    this.openTimeout = null
    this.closeTimeout = null
    this.state = { isOpen: false }
  }

  componentWillUnmount(): void {
    if (this.closeTimeout) clearTimeout(this.closeTimeout)
    if (this.openTimeout) clearTimeout(this.openTimeout)
  }

  delayedOpen: () => void = () => {
    if (this.closeTimeout) clearTimeout(this.closeTimeout)
    this.openTimeout = window.setTimeout(() => {
      this.setState({ isOpen: true })
    }, OPEN_DELAY_MS)
  }

  delayedClose: () => void = () => {
    if (this.openTimeout) clearTimeout(this.openTimeout)
    this.closeTimeout = window.setTimeout(() => {
      this.setState({ isOpen: false })
    }, CLOSE_DELAY_MS)
  }

  render(): JSX.Element {
    return (
      <DeprecatedTooltip
        open={this.state.isOpen}
        childProps={{
          onMouseEnter: this.delayedOpen,
          onMouseLeave: this.delayedClose,
        }}
        {...this.props}
      />
    )
  }
}
