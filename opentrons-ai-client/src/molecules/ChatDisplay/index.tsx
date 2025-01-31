import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  JUSTIFY_FLEX_START,
  POSITION_RELATIVE,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  StyledText,
  DIRECTION_ROW,
  OVERFLOW_AUTO,
} from '@opentrons/components'

import type { ChatData } from '../../resources/types'
import { useAtom } from 'jotai'
import {
  chatDataAtom,
  feedbackModalAtom,
  regenerateProtocolAtom,
  scrollToBottomAtom,
  createProtocolChatAtom,
  updateProtocolChatAtom,
} from '../../resources/atoms'
import { delay } from 'lodash'
import { useFormContext } from 'react-hook-form'
import { useTrackEvent } from '../../resources/hooks/useTrackEvent'

interface ChatDisplayProps {
  chat: ChatData
  chatId: string
}

const HoverShadow = styled(Flex)`
  alignitems: ${ALIGN_CENTER};
  justifycontent: ${JUSTIFY_CENTER};
  padding: ${SPACING.spacing8};
  transition: box-shadow 0.3s ease;
  border-radius: ${BORDERS.borderRadius8};

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-radius: ${BORDERS.borderRadius8};
  }
`

const StyledIcon = styled(Icon)`
  color: ${COLORS.blue50};
`

export function ChatDisplay({ chat, chatId }: ChatDisplayProps): JSX.Element {
  const { t } = useTranslation('protocol_generator')
  const trackEvent = useTrackEvent()
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [, setRegenerateProtocol] = useAtom(regenerateProtocolAtom)
  const [createProtocolChat] = useAtom(createProtocolChatAtom)
  const [updateProtocolChat] = useAtom(updateProtocolChatAtom)
  const [, setShowFeedbackModal] = useAtom(feedbackModalAtom)
  const { setValue } = useFormContext()
  const [chatdata] = useAtom(chatDataAtom)
  const [scrollToBottom, setScrollToBottom] = useAtom(scrollToBottomAtom)
  const { role, reply, requestId } = chat
  const isUser = role === 'user'

  const setInputFieldToCorrespondingRequest = (): void => {
    let prompt = ''
    if (
      requestId.includes('NewProtocol') ||
      requestId.includes('UpdateProtocol')
    ) {
      setRegenerateProtocol({
        isCreateOrUpdateProtocol: true,
        regenerate: true,
      })
      if (createProtocolChat.prompt !== '') {
        prompt = createProtocolChat.prompt
      } else {
        prompt = updateProtocolChat.prompt
      }
    } else {
      setRegenerateProtocol({
        isCreateOrUpdateProtocol: false,
        regenerate: true,
      })
      prompt =
        chatdata.find(
          chat => chat.role === 'user' && chat.requestId === requestId
        )?.reply ?? ''
    }
    setScrollToBottom(!scrollToBottom)
    setValue('userPrompt', prompt)
    trackEvent({
      name: 'regenerate-protocol',
      properties: {},
    })
  }

  const handleFileDownload = (): void => {
    const lastCodeBlock = document.querySelector(`#${chatId}`)
    const code = lastCodeBlock?.textContent?.trim() ?? ''
    // Don't proceed if code is empty, no need to download as a python file
    if (!code) {
      return
    }
    // Make sure python protocol is valid
    const hasRunFunction = code.includes('def run(')
    const numberOfLines = code.split('\n').length
    if (!hasRunFunction || numberOfLines <= 3) {
      return
    }

    const blobParts: BlobPart[] = [code]

    const file = new File(blobParts, 'OpentronsAI.py', { type: 'text/python' })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')

    document.body.appendChild(a)
    a.href = url
    a.download = 'OpentronsAI.py'
    a.click()
    window.URL.revokeObjectURL(url)

    trackEvent({
      name: 'download-protocol',
      properties: {},
    })
  }

  const handleClickCopy = async (): Promise<void> => {
    const lastCodeBlock = document.querySelector(`#${chatId}`)
    const code = lastCodeBlock?.textContent ?? ''
    await navigator.clipboard.writeText(code)
    setIsCopied(true)
    trackEvent({
      name: 'copy-protocol',
      properties: {},
    })
  }

  useEffect(() => {
    if (isCopied)
      delay(() => {
        setIsCopied(false)
      }, 2000)
  }, [isCopied])

  function CodeText(props: JSX.IntrinsicAttributes): JSX.Element {
    return <CodeWrapper {...props} id={chatId} />
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
      <Flex justifyContent={isUser ? JUSTIFY_FLEX_END : JUSTIFY_FLEX_START}>
        <StyledText paddingTop={SPACING.spacing12}>
          {isUser ? t('you') : t('opentronsai')}
        </StyledText>
      </Flex>
      {/* text should be markdown so this component will have a package or function to parse markdown */}
      <Flex
        padding={`${SPACING.spacing40} ${SPACING.spacing40} ${
          isUser ? SPACING.spacing40 : SPACING.spacing12
        } ${SPACING.spacing40}`}
        backgroundColor={isUser ? COLORS.blue30 : COLORS.grey30}
        data-testid={`ChatDisplay_from_${isUser ? 'user' : 'backend'}`}
        borderRadius={SPACING.spacing12}
        width="100%"
        overflowY={OVERFLOW_AUTO}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        position={POSITION_RELATIVE}
      >
        <Markdown
          components={{
            div: undefined,
            ul: UnnumberedListText,
            h2: HeaderText,
            li: ListItemText,
            p: ParagraphText,
            a: isUser ? ParagraphText : ExternalLink,
            code: CodeText,
          }}
        >
          {reply}
        </Markdown>

        {!isUser ? (
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_FLEX_END}
            gridGap={SPACING.spacing20}
            paddingTop={SPACING.spacing12}
          >
            <HoverShadow
              onClick={() => {
                setInputFieldToCorrespondingRequest()
              }}
            >
              <StyledIcon size={SPACING.spacing20} name="reload" />
            </HoverShadow>
            <HoverShadow
              onClick={() => {
                setShowFeedbackModal(true)
              }}
            >
              <StyledIcon size={SPACING.spacing20} name="thumbs-down" />
            </HoverShadow>
            <HoverShadow
              onClick={async () => {
                await handleClickCopy()
              }}
            >
              <StyledIcon
                size={SPACING.spacing20}
                name={isCopied ? 'check' : 'content-copy'}
              />
            </HoverShadow>
            <HoverShadow
              onClick={() => {
                handleFileDownload()
              }}
            >
              <StyledIcon size={SPACING.spacing20} name="download" />
            </HoverShadow>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}

// Note (05/08/2024) the following styles are temp
function ExternalLink(props: JSX.IntrinsicAttributes): JSX.Element {
  return <a {...props} target="_blank" rel="noopener noreferrer" />
}

function ParagraphText(props: JSX.IntrinsicAttributes): JSX.Element {
  return (
    <LegacyStyledText
      {...props}
      fontSize={TYPOGRAPHY.fontSize20}
      lineHeight={TYPOGRAPHY.lineHeight24}
      css="white-space: pre-wrap;"
    />
  )
}

function HeaderText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="h3" />
}

function ListItemText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="li" marginLeft={SPACING.spacing16} />
}

function UnnumberedListText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="ul" />
}

const CodeWrapper = styled(Flex)`
  display: inline-flex;
  font-family: monospace;
  padding: ${SPACING.spacing4};
  color: ${COLORS.black80};
  background-color: ${COLORS.grey20};
  border-radius: ${BORDERS.borderRadius4};
  overflow: auto;
`
