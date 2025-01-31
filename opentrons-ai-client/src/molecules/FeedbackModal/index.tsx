import {
  Modal,
  Flex,
  SPACING,
  ALIGN_FLEX_END,
  SecondaryButton,
  StyledText,
  PrimaryButton,
  InputField,
} from '@opentrons/components'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { feedbackModalAtom, tokenAtom } from '../../resources/atoms'
import { useState } from 'react'
import type { AxiosRequestConfig } from 'axios'
import {
  STAGING_FEEDBACK_END_POINT,
  PROD_FEEDBACK_END_POINT,
  LOCAL_FEEDBACK_END_POINT,
} from '../../resources/constants'
import { useApiCall } from '../../resources/hooks'
import { useTrackEvent } from '../../resources/hooks/useTrackEvent'

export function FeedbackModal(): JSX.Element {
  const { t } = useTranslation('protocol_generator')
  const trackEvent = useTrackEvent()

  const [feedbackValue, setFeedbackValue] = useState<string>('')
  const [, setShowFeedbackModal] = useAtom(feedbackModalAtom)
  const [token] = useAtom(tokenAtom)
  const { callApi } = useApiCall()

  const handleSendFeedback = async (): Promise<void> => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      const getEndpoint = (): string => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return PROD_FEEDBACK_END_POINT
          case 'development':
            return LOCAL_FEEDBACK_END_POINT
          default:
            return STAGING_FEEDBACK_END_POINT
        }
      }

      const url = getEndpoint()

      const config = {
        url,
        method: 'POST',
        headers,
        data: {
          feedbackText: feedbackValue,
          fake: false,
        },
      }
      await callApi(config as AxiosRequestConfig)
      trackEvent({
        name: 'feedback-sent',
        properties: {
          feedback: feedbackValue,
        },
      })
      setShowFeedbackModal(false)
    } catch (err: any) {
      console.error(`error: ${err.message}`)
      throw err
    }
  }

  return (
    <Modal
      title={t(`send_feedback_to_opentrons`)}
      onClose={() => {
        setShowFeedbackModal(false)
      }}
      footer={
        <Flex
          padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
          gridGap={SPACING.spacing8}
          justifyContent={ALIGN_FLEX_END}
        >
          <SecondaryButton
            onClick={() => {
              setShowFeedbackModal(false)
            }}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t(`cancel`)}
            </StyledText>
          </SecondaryButton>
          <PrimaryButton
            disabled={feedbackValue === ''}
            onClick={async () => {
              await handleSendFeedback()
            }}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t(`send_feedback`)}
            </StyledText>
          </PrimaryButton>
        </Flex>
      }
    >
      <InputField
        title={t(`send_feedback_input_title`)}
        size="medium"
        value={feedbackValue}
        onChange={event => {
          setFeedbackValue(event.target.value as string)
        }}
      ></InputField>
    </Modal>
  )
}
