import { Component } from 'react'
import type { RefCallback } from 'react'

interface ClickOutsideChildParams {
  ref: RefCallback<Element>
}
export interface ClickOutsideProps {
  onClickOutside: ((e: MouseEvent) => void) | undefined | null
  children: (params: ClickOutsideChildParams) => JSX.Element
}

// TODO: BC: 2019-05-10 this would be much cleaner as a custom hook
export class ClickOutside extends Component<ClickOutsideProps> {
  // TODO(mc, 2019-04-19): switch to ref object
  wrapperRef: Element | null

  constructor(props: ClickOutsideProps) {
    super(props)
    this.wrapperRef = null
  }

  componentDidMount(): void {
    document.addEventListener('mousedown', this.handleClickOutside)
  }

  componentWillUnmount(): void {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }

  setWrapperRef: (el: Element | null) => void = el => {
    this.wrapperRef = el
  }

  handleClickOutside = (event: MouseEvent): void => {
    const clickedElem = event.target

    if (!(clickedElem instanceof Node)) {
      // NOTE: this is some flow type checking funkiness
      // TODO Ian 2018-05-24 use assert.
      console.warn(
        'expected clicked element to be Node - something went wrong in ClickOutside'
      )
      return
    }

    if (
      this.props.onClickOutside &&
      this.wrapperRef &&
      !this.wrapperRef.contains(clickedElem)
    ) {
      this.props.onClickOutside(event)
    }
  }

  render(): JSX.Element {
    return this.props.children({ ref: this.setWrapperRef })
  }
}
