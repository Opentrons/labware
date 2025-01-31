import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { getFootprintDiagram } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { ExpandingTitle } from '../ExpandingTitle'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ExpandingTitle>) => {
  return renderWithProviders(<ExpandingTitle {...props} />)
}

const diagram = getFootprintDiagram({})
const DIAGRAM_TEST_ID = 'expanding_title_diagram'

describe('ExpandingTitle', () => {
  let props: ComponentProps<typeof ExpandingTitle>
  beforeEach(() => {
    props = {
      label: 'Title',
      diagram,
    }
  })

  it('renders correct label and button but does not render diagram initially', () => {
    render(props)

    screen.getByText('Title')
    screen.getByRole('button')
    expect(screen.queryByTestId(DIAGRAM_TEST_ID)).not.toBeInTheDocument()
  })

  it('toggles rendering of diagram when button is clicked', () => {
    render(props)

    const button = screen.getByRole('button')
    fireEvent.click(button)
    screen.getByTestId(DIAGRAM_TEST_ID)
    fireEvent.click(button)
    expect(screen.queryByTestId(DIAGRAM_TEST_ID)).not.toBeInTheDocument()
  })
})
