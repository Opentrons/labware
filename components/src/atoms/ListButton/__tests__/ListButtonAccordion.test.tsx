import { describe, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'

import { ListButtonAccordion } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ListButtonAccordion>) =>
  renderWithProviders(<ListButtonAccordion {...props} />)

describe('ListButtonAccordion', () => {
  let props: ComponentProps<typeof ListButtonAccordion>

  beforeEach(() => {
    props = {
      children: <div>mock ListButtonAccordion content</div>,
      headline: 'mock headline',
      isExpanded: true,
    }
  })

  it('should render non nested accordion', () => {
    render(props)
    screen.getByText('mock headline')
    screen.getByText('mock ListButtonAccordion content')
  })
  it('should render non nested accordion with main headline', () => {
    props.isNested = true
    props.mainHeadline = 'mock main headline'
    render(props)
    screen.getByText('mock main headline')
    screen.getByText('mock headline')
    screen.getByText('mock ListButtonAccordion content')
  })
})
