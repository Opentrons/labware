import { useForm, FormProvider } from 'react-hook-form'
import { DIRECTION_COLUMN, Flex, SPACING } from '@opentrons/components'

import { useAtom } from 'jotai'
import { useRef, useEffect } from 'react'
import {
  chatDataAtom,
  feedbackModalAtom,
  scrollToBottomAtom,
  updateProtocolChatAtom,
  createProtocolChatAtom,
} from '../../resources/atoms'
import { ChatDisplay } from '../../molecules/ChatDisplay'
import { ChatFooter } from '../../molecules/ChatFooter'
import styled from 'styled-components'
import { FeedbackModal } from '../../molecules/FeedbackModal'
import { useNavigate } from 'react-router-dom'

export interface InputType {
  userPrompt: string
}

export function Chat(): JSX.Element | null {
  const methods = useForm<InputType>({
    defaultValues: {
      userPrompt: '',
    },
  })

  const [chatData] = useAtom(chatDataAtom)
  const scrollRef = useRef<HTMLSpanElement | null>(null)
  const [showFeedbackModal] = useAtom(feedbackModalAtom)
  const [scrollToBottom] = useAtom(scrollToBottomAtom)
  const navigate = useNavigate()
  const [updateProtocolChat] = useAtom(updateProtocolChatAtom)
  const [createProtocolChat] = useAtom(createProtocolChatAtom)

  // Redirect to home page if there is no prompt (user has refreshed the page)
  useEffect(() => {
    if (updateProtocolChat.prompt === '' && createProtocolChat.prompt === '') {
      navigate('/')
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current != null)
      scrollRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
  }, [chatData.length, scrollToBottom])

  return (
    <FormProvider {...methods}>
      <Flex
        padding={`${SPACING.spacing40} ${SPACING.spacing40} ${SPACING.spacing20}`}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing12}
        width="100%"
      >
        <Flex
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing24}
        >
          <ChatDataContainer>
            {chatData.length > 0
              ? chatData.map((chat, index) => (
                  <ChatDisplay
                    key={`prompt-from_${chat.role}_${index}`}
                    chat={chat}
                    chatId={`${chat.role}_${index}`}
                  />
                ))
              : null}
          </ChatDataContainer>
        </Flex>
        <ChatFooter />
        <span ref={scrollRef} />
        {showFeedbackModal ? <FeedbackModal /> : null}
      </Flex>
    </FormProvider>
  )
}

const ChatDataContainer = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  width: 100%;
`
