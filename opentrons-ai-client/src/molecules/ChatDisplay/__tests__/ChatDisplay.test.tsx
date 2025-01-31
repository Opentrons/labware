import type * as React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'

import { ChatDisplay } from '../index'
import { useForm, FormProvider } from 'react-hook-form'

const mockUseTrackEvent = vi.fn()

vi.mock('../../../resources/hooks/useTrackEvent', () => ({
  useTrackEvent: () => mockUseTrackEvent,
}))

vi.mock('../../../hooks/useTrackEvent', () => ({
  useTrackEvent: () => mockUseTrackEvent,
}))

const RenderChatDisplay = (props: React.ComponentProps<typeof ChatDisplay>) => {
  const methods = useForm({
    defaultValues: {},
  })

  return (
    <FormProvider {...methods}>
      <ChatDisplay {...props} />
    </FormProvider>
  )
}

const render = (props: React.ComponentProps<typeof ChatDisplay>) => {
  return renderWithProviders(<RenderChatDisplay {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ChatDisplay', () => {
  let props: React.ComponentProps<typeof ChatDisplay>

  beforeEach(() => {
    props = {
      chat: {
        role: 'assistant',
        reply: 'mock text from the backend',
        requestId: '12351234',
      },
      chatId: 'mockId',
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should display response from the backend and label', () => {
    render(props)
    screen.getByText('OpentronsAI')
    screen.getByText('mock text from the backend')
    // ToDO (kk:04/16/2024) activate the following when jsdom's issue is solved
    // const display = screen.getByTextId('ChatDisplay_from_backend')
    // expect(display).toHaveStyle(`background-color: ${COLORS.grey30}`)
  })
  it('should display input from use and label', () => {
    props = {
      chat: {
        role: 'user',
        reply: 'mock text from user input',
        requestId: '12351234',
      },
      chatId: 'mockId',
    }
    render(props)
    screen.getByText('You')
    screen.getByText('mock text from user input')
    // ToDO (kk:04/16/2024) activate the following when jsdom's issue is solved
    // const display = screen.getByTextId('ChatDisplay_from_user')
    // expect(display).toHaveStyle(`background-color: ${COLORS.blue}`)
  })

  it('should call trackEvent when regenerate button is clicked', () => {
    render(props)
    // eslint-disable-next-line testing-library/no-node-access, @typescript-eslint/non-nullable-type-assertion-style
    const regeneratePath = document.querySelector(
      '[aria-roledescription="reload"]'
    ) as Element
    fireEvent.click(regeneratePath)

    expect(mockUseTrackEvent).toHaveBeenCalledWith({
      name: 'regenerate-protocol',
      properties: {},
    })
  })

  it('should call trackEvent when download button is clicked', () => {
    props.chat = {
      ...props.chat,
      role: 'assistant',
      reply:
        '```python\ndef run(protocol):\n    print("hello")\n print("protocol")\n return True\n```',
    }
    URL.createObjectURL = vi.fn()
    window.URL.revokeObjectURL = vi.fn()
    HTMLAnchorElement.prototype.click = vi.fn()

    render(props)
    // eslint-disable-next-line testing-library/no-node-access, @typescript-eslint/non-nullable-type-assertion-style
    const downloadPath = document.querySelector(
      '[aria-roledescription="download"]'
    ) as Element
    fireEvent.click(downloadPath)

    expect(mockUseTrackEvent).toHaveBeenCalledWith({
      name: 'download-protocol',
      properties: {},
    })
  })

  it('should not call trackEvent when download button is clicked', () => {
    URL.createObjectURL = vi.fn()
    window.URL.revokeObjectURL = vi.fn()
    HTMLAnchorElement.prototype.click = vi.fn()

    render(props)
    // eslint-disable-next-line testing-library/no-node-access, @typescript-eslint/non-nullable-type-assertion-style
    const downloadPath = document.querySelector(
      '[aria-roledescription="download"]'
    ) as Element
    fireEvent.click(downloadPath)

    expect(mockUseTrackEvent).not.toHaveBeenCalledWith({
      name: 'download-protocol',
      properties: {},
    })
  })

  it('should call trackEvent when copy button is clicked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {},
      },
    })

    render(props)
    // eslint-disable-next-line testing-library/no-node-access, @typescript-eslint/non-nullable-type-assertion-style
    const copyPath = document.querySelector(
      '[aria-roledescription="content-copy"]'
    ) as Element
    fireEvent.click(copyPath)

    await waitFor(() => {
      expect(mockUseTrackEvent).toHaveBeenCalledWith({
        name: 'copy-protocol',
        properties: {},
      })
    })
  })
})
