import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_ADD_CUSTOM_LABWARE,
} from '/app/redux/analytics'
import { renderWithProviders } from '/app/__testing-utils__'
import { AddCustomLabwareSlideout } from '..'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/custom-labware')
vi.mock('/app/local-resources/labware')
vi.mock('/app/redux/analytics')
vi.mock('/app/redux/shell/remote', () => ({
  remote: {
    getFilePathFrom: vi.fn(),
  },
}))

let mockTrackEvent: any

const render = (props: ComponentProps<typeof AddCustomLabwareSlideout>) => {
  return renderWithProviders(
    <MemoryRouter>
      <AddCustomLabwareSlideout {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('AddCustomLabwareSlideout', () => {
  const props: ComponentProps<typeof AddCustomLabwareSlideout> = {
    isExpanded: true,
    onCloseClick: vi.fn(() => null),
  }
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
  })

  it('renders correct title and labware cards and clicking on button triggers analytics event', () => {
    render(props)
    screen.getByText('Import a Custom Labware Definition')
    screen.getByText('Or choose a file from your computer to upload.')
    const btn = screen.getByRole('button', { name: 'Upload' })
    fireEvent.click(btn)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_ADD_CUSTOM_LABWARE,
      properties: {},
    })
  })

  it('renders drag and drop section', () => {
    render(props)
    screen.getByRole('button', { name: 'browse' })
  })
})
