import { describe, it, beforeEach, vi, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { i18n } from '../../../assets/localization'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { renderWithProviders } from '../../../__testing-utils__'
import { SlotDetailsContainer } from '../../../organisms'
import { StartingDeck } from '../StartingDeck'

import type { ComponentProps } from 'react'

vi.mock('../DeckThumbnail')
vi.mock('OffDeckThumbnail')
vi.mock('../../../organisms')
vi.mock('../../../step-forms/selectors')

vi.mock('../DeckThumbnail', () => ({
  DeckThumbnail: vi.fn(() => <div>mock DeckThumbnail</div>),
}))
vi.mock('../OffdeckThumbnail', () => ({
  OffDeckThumbnail: vi.fn(() => <div>mock OffDeckThumbnail</div>),
}))

const mockSetShowMaterialsListModal = vi.fn()

const render = (props: ComponentProps<typeof StartingDeck>) => {
  return (
    renderWithProviders(<StartingDeck {...props} />), { i18nInstance: i18n }
  )
}

describe('StartingDeck', () => {
  let props: ComponentProps<typeof StartingDeck>

  beforeEach(() => {
    props = {
      robotType: FLEX_ROBOT_TYPE,
      setShowMaterialsListModal: mockSetShowMaterialsListModal,
    }
    vi.mocked(SlotDetailsContainer).mockReturnValue(
      <div>mock SlotDetailsContainer</div>
    )
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
      labware: {},
    })
  })

  it('should render deck view, text and toggle', () => {
    render(props)

    screen.getByText('Protocol Starting Deck')
    screen.getByText('Materials list')
    screen.getByRole('button', { name: 'On deck' })
    screen.getByRole('button', { name: 'Off deck' })
    screen.getByText('mock DeckThumbnail')
  })

  it('should render off deck when clicking toggle button', () => {
    render(props)
    screen.getByText('mock DeckThumbnail')
    fireEvent.click(screen.getByRole('button', { name: 'Off deck' }))
    screen.getByText('mock OffDeckThumbnail')
  })

  it('should call mock function when clicking material list', () => {
    render(props)
    fireEvent.click(screen.getByText('Materials list'))
    expect(mockSetShowMaterialsListModal).toHaveBeenCalled()
  })

  it('should render mock SlotDetailsContainer when hovering', () => {
    render({ ...props })
    screen.getByText('mock SlotDetailsContainer')
  })
})
