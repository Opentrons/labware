import { it, describe, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { GEN1, GEN2, LEFT, RIGHT } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { InstructionStep } from '../InstructionStep'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof InstructionStep>) => {
  return renderWithProviders(<InstructionStep {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('InstructionStep', () => {
  let props: ComponentProps<typeof InstructionStep>
  beforeEach(() => {
    props = {
      children: <div>children</div>,
      direction: 'attach',
      mount: LEFT,
      channels: 1,
      diagram: 'screws',
      displayCategory: GEN1,
    }
  })
  it('renders the correct image for attaching a gen 1 single channel screw on left mount', () => {
    render(props)
    screen.getByText('children')
    screen.getByAltText('attach-left-single-GEN1-screws')
  })
  it('renders the correct image for attaching a gen 2 single channel tab on left mount', () => {
    props = {
      ...props,
      diagram: 'tab',
      displayCategory: GEN2,
    }
    render(props)
    screen.getByText('children')
    screen.getByAltText('attach-left-single-GEN2-tab')
  })
  it('renders the correct image for detaching a gen 2 8 channel tab on right mount', () => {
    props = {
      ...props,
      direction: 'detach',
      mount: RIGHT,
      channels: 8,
      diagram: 'tab',
      displayCategory: GEN2,
    }
    render(props)
    screen.getByText('children')
    screen.getByAltText('detach-right-multi-GEN2-tab')
  })
})
