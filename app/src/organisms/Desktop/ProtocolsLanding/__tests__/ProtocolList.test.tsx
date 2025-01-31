import { BrowserRouter } from 'react-router-dom'
import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getProtocolsDesktopSortKey } from '/app/redux/config'
import {
  storedProtocolData,
  storedProtocolDataTwo,
} from '/app/redux/protocol-storage/__fixtures__'
import { ProtocolList } from '../ProtocolList'
import { useSortedProtocols } from '../hooks'
import { EmptyStateLinks } from '../EmptyStateLinks'
import { ProtocolCard } from '../ProtocolCard'

import type { ComponentProps } from 'react'

vi.mock('../hooks')
vi.mock('/app/redux/protocol-storage')
vi.mock('/app/redux/config')
vi.mock('../EmptyStateLinks')
vi.mock('../ProtocolCard')

const render = (props: ComponentProps<typeof ProtocolList>) => {
  return renderWithProviders(
    <BrowserRouter>
      <ProtocolList {...props} />
    </BrowserRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('ProtocolList', () => {
  let props: ComponentProps<typeof ProtocolList>

  beforeEach(() => {
    props = {
      storedProtocols: [storedProtocolData, storedProtocolDataTwo],
    }
    vi.mocked(ProtocolCard).mockReturnValue(<div>mock protocol card</div>)
    vi.mocked(EmptyStateLinks).mockReturnValue(
      <div>mock empty state links</div>
    )
    when(vi.mocked(useSortedProtocols))
      .calledWith('alphabetical', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolData, storedProtocolDataTwo])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('alphabetical')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the heading, correct info for 2 protocols, and in alphabetical order', () => {
    render(props)

    screen.getByRole('heading', { name: 'Protocols' })
    screen.getByText('Sort by')
    screen.getByText('Alphabetical')
    screen.getByRole('button', { name: 'Import' })
    screen.getByText('mock empty state links')
    const cards = screen.getAllByText('mock protocol card')
    expect(cards.length).toBe(2)
  })

  it('renders and clicks on import button and opens slideout', () => {
    render(props)
    const btn = screen.getByRole('button', { name: 'Import' })
    fireEvent.click(btn)
    screen.getByText('Import a Protocol')
  })

  it('renders Alphabetical button and clicking on it open overflow menu and can select alphabetical', () => {
    render(props)
    fireEvent.click(screen.getByTestId('ProtocolList_SortByMenu'))
    const alphabetical = screen.getByRole('button', { name: 'Alphabetical' })
    screen.getByRole('button', { name: 'Most recent updates' })
    screen.getByRole('button', { name: 'Reverse alphabetical' })
    screen.getByRole('button', { name: 'Oldest updates' })
    fireEvent.click(alphabetical)
    expect(vi.mocked(useSortedProtocols)).toHaveBeenCalledWith('alphabetical', [
      storedProtocolData,
      storedProtocolDataTwo,
    ])
  })

  it('renders Alphabetical button and clicking on it open overflow menu and can select reverse', () => {
    when(vi.mocked(useSortedProtocols))
      .calledWith('reverse', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolDataTwo, storedProtocolData])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('reverse')

    render(props)
    fireEvent.click(screen.getByTestId('ProtocolList_SortByMenu'))
    screen.getByRole('button', { name: 'Alphabetical' })
    screen.getByRole('button', { name: 'Most recent updates' })
    const reverse = screen.getByRole('button', { name: 'Reverse alphabetical' })
    screen.getByRole('button', { name: 'Oldest updates' })
    fireEvent.click(reverse)
    screen.getByText('Reverse alphabetical')
  })

  it('renders Alphabetical button and clicking on it open overflow menu and can select recent', () => {
    when(vi.mocked(useSortedProtocols))
      .calledWith('recent', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolData, storedProtocolDataTwo])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('recent')

    render(props)
    fireEvent.click(screen.getByTestId('ProtocolList_SortByMenu'))
    screen.getByRole('button', { name: 'Alphabetical' })
    const recent = screen.getByRole('button', { name: 'Most recent updates' })
    screen.getByRole('button', { name: 'Reverse alphabetical' })
    screen.getByRole('button', { name: 'Oldest updates' })
    fireEvent.click(recent)
    screen.getByText('Most recent updates')
  })

  it('renders Alphabetical button and clicking on it open overflow menu and can select oldest', () => {
    when(vi.mocked(useSortedProtocols))
      .calledWith('oldest', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolDataTwo, storedProtocolData])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('oldest')

    render(props)
    fireEvent.click(screen.getByTestId('ProtocolList_SortByMenu'))
    screen.getByRole('button', { name: 'Alphabetical' })
    screen.getByRole('button', { name: 'Most recent updates' })
    screen.getByRole('button', { name: 'Reverse alphabetical' })
    const oldest = screen.getByRole('button', { name: 'Oldest updates' })
    fireEvent.click(oldest)
    screen.getByText('Oldest updates')
  })

  it('renders Alphabetical as the sort key when alphabetical was selected last time', () => {
    render(props)
    screen.getByText('Alphabetical')
  })

  it('renders Oldest updates as the sort key when oldest was selected last time', () => {
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('oldest')
    render(props)
    screen.getByText('Oldest updates')
  })

  it('renders Flex as the sort key when flex was selected last time', () => {
    when(vi.mocked(useSortedProtocols))
      .calledWith('flex', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolData, storedProtocolDataTwo])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('flex')
    render(props)
    screen.getByText('Flex protocols first')
  })

  it('renders ot2 as the sort key when ot2 was selected last time', () => {
    when(vi.mocked(useSortedProtocols))
      .calledWith('ot2', [storedProtocolData, storedProtocolDataTwo])
      .thenReturn([storedProtocolData, storedProtocolDataTwo])
    vi.mocked(getProtocolsDesktopSortKey).mockReturnValue('ot2')
    render(props)
    screen.getByText('OT-2 protocols first')
  })
})
