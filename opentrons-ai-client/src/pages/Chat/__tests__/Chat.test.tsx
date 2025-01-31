import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { PromptGuide } from '../../../molecules/PromptGuide'
import { ChatFooter } from '../../../molecules/ChatFooter'
import { Chat } from '../index'
import type { NavigateFunction } from 'react-router-dom'

vi.mock('../../../molecules/PromptGuide')
vi.mock('../../../molecules/ChatFooter')
// Note (kk:05/20/2024) to avoid TypeError: scrollRef.current.scrollIntoView is not a function
window.HTMLElement.prototype.scrollIntoView = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<Chat />, {
    i18nInstance: i18n,
  })
}

describe('Chat', () => {
  beforeEach(() => {
    vi.mocked(PromptGuide).mockReturnValue(<div>mock PromptGuide</div>)
    vi.mocked(ChatFooter).mockReturnValue(<div>mock ChatFooter</div>)
  })

  it('should render footer', () => {
    render()
    screen.getByText('mock ChatFooter')
  })

  it('should navigate to home if chatData is empty', () => {
    render()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it.skip('should not show the feedback modal when loading the page', () => {
    render()
    screen.getByText('Send feedback to Opentrons')
    screen.getByText('Share why the response was not helpful')
    screen.getByText('Cancel')
    screen.getByText('Send feedback')
  })
})
