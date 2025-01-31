import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'

import { useConditionalConfirm } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEvent } from '/app/redux/analytics'
import { CustomLabwareOverflowMenu } from '../CustomLabwareOverflowMenu'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('/app/redux/analytics')

const mockConfirm = vi.fn()
const mockCancel = vi.fn()
let mockTrackEvent: Mock

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    useConditionalConfirm: vi.fn(() => ({
      confirm: mockConfirm,
      showConfirmation: true,
      cancel: mockCancel,
    })),
  }
})

const render = (
  props: ComponentProps<typeof CustomLabwareOverflowMenu>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<CustomLabwareOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })
}

describe('CustomLabwareOverflowMenu', () => {
  let props: ComponentProps<typeof CustomLabwareOverflowMenu>

  beforeEach(() => {
    props = {
      filename: 'name',
      onDelete: vi.fn(),
    }
    vi.mocked(useConditionalConfirm).mockReturnValue({
      confirm: mockConfirm,
      showConfirmation: true,
      cancel: mockCancel,
    })
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render correct button texts and they are clickable', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('CustomLabwareOverflowMenu_button'))
    screen.getByRole('button', { name: 'Show in folder' })
    screen.getByRole('button', { name: 'Open Labware Creator' })
    screen.getByRole('button', { name: 'Delete' })
  })

  it('should call a mock function when canceling delete a labware definition', async () => {
    render(props)
    fireEvent.click(screen.getByLabelText('CustomLabwareOverflowMenu_button'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    screen.getByText('Delete this labware definition?')
    screen.getByText(
      'This labware definition will be moved to this computer’s trash and may be unrecoverable.'
    )
    screen.getByText(
      'Robots cannot run Python protocols with missing labware definitions.'
    )
    fireEvent.click(screen.getByText('cancel'))
    expect(mockCancel).toHaveBeenCalled()
  })

  it('should call a mock function when deleting a labware definition', async () => {
    render(props)
    fireEvent.click(screen.getByLabelText('CustomLabwareOverflowMenu_button'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    screen.getByText('Delete this labware definition?')
    screen.getByText(
      'This labware definition will be moved to this computer’s trash and may be unrecoverable.'
    )
    screen.getByText(
      'Robots cannot run Python protocols with missing labware definitions.'
    )
    fireEvent.click(screen.getByText('Yes, delete definition'))
    expect(mockConfirm).toHaveBeenCalled()
  })
})
