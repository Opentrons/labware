import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { ExternalLink } from '../ExternalLink'

import type { ComponentProps } from 'react'

const TEST_URL = 'https://opentrons.com'

const render = (props: ComponentProps<typeof ExternalLink>) => {
  return renderWithProviders(<ExternalLink {...props} />)[0]
}

describe('ExternalLink', () => {
  let props: ComponentProps<typeof ExternalLink>

  beforeEach(() => {
    props = {
      href: TEST_URL,
      id: 'test-link',
      children: 'Test Link',
    }
  })

  it('renders external link', () => {
    render(props)

    const link = screen.getByText('Test Link')
    expect(link).toHaveAttribute('href', 'https://opentrons.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveStyle(`color: ${COLORS.blue50}`)
  })

  it('renders open-in-new icon', () => {
    render(props)

    const icon = screen.getByLabelText('open_in_new_icon')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveStyle('width: 0.5rem; height: 0.5rem')
  })
})
