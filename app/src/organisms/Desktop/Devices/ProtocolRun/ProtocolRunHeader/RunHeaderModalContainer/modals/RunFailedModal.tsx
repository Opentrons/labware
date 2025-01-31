import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  OVERFLOW_AUTO,
  OVERFLOW_WRAP_ANYWHERE,
  PrimaryButton,
  SPACING,
  Modal,
  LegacyStyledText,
  TYPOGRAPHY,
  DISPLAY_FLEX,
} from '@opentrons/components'

import { useDownloadRunLog } from '../../../../hooks'
import { RUN_STATUS_SUCCEEDED } from '@opentrons/api-client'

import type { MouseEventHandler } from 'react'
import type { RunStatus } from '@opentrons/api-client'
import type { ModalProps } from '@opentrons/components'
import type { RunCommandError } from '@opentrons/shared-data'
import type { UseRunErrorsResult } from '../../hooks'

// Note(kk:08/07/2023)
// This modal and run failed modal for Touchscreen app will be merged into one component like EstopModals.

export interface UseRunFailedModalResult {
  showRunFailedModal: boolean
  toggleModal: () => void
}

export function useRunFailedModal(
  runErrors: UseRunErrorsResult
): UseRunFailedModalResult {
  const [showRunFailedModal, setShowRunFailedModal] = useState(false)

  const toggleModal = (): void => {
    setShowRunFailedModal(!showRunFailedModal)
  }

  const showModal =
    showRunFailedModal &&
    (runErrors.commandErrorList != null ||
      runErrors.highestPriorityError != null)

  return { showRunFailedModal: showModal, toggleModal }
}

interface RunFailedModalProps {
  robotName: string
  runId: string
  toggleModal: () => void
  runStatus: RunStatus | null
  runErrors: UseRunErrorsResult
}

// TODO(jh, 09-09-24): Consider cleaning up component after the server-side commandErrorList changes are completed.
export function RunFailedModal({
  robotName,
  runId,
  toggleModal,
  runStatus,
  runErrors,
}: RunFailedModalProps): JSX.Element | null {
  const { commandErrorList, highestPriorityError } = runErrors

  const { i18n, t } = useTranslation(['run_details', 'shared', 'branded'])
  const modalProps: ModalProps = {
    type: runStatus === RUN_STATUS_SUCCEEDED ? 'warning' : 'error',
    title:
      commandErrorList == null || commandErrorList?.length === 0
        ? t('run_failed_modal_title')
        : runStatus === RUN_STATUS_SUCCEEDED
        ? t('warning_details')
        : t('error_details'),
    onClose: () => {
      toggleModal()
    },
    closeOnOutsideClick: true,
    childrenPadding: SPACING.spacing24,
    width: '31.25rem',
  }
  const { downloadRunLog } = useDownloadRunLog(robotName, runId)

  const handleClick = (): void => {
    toggleModal()
  }

  const handleDownloadClick: MouseEventHandler<HTMLAnchorElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    downloadRunLog()
  }

  interface ErrorContentProps {
    errors: RunCommandError[]
    isSingleError: boolean
  }
  const ErrorContent = ({
    errors,
    isSingleError,
  }: ErrorContentProps): JSX.Element => {
    return (
      <Flex flexDirection={DIRECTION_COLUMN}>
        <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {isSingleError
            ? t('error_info', {
                errorType: errors[0].errorType,
                errorCode: errors[0].errorCode,
              })
            : runStatus === RUN_STATUS_SUCCEEDED
            ? t(errors.length > 1 ? 'no_of_warnings' : 'no_of_warning', {
                count: errors.length,
              })
            : t(errors.length > 1 ? 'no_of_errors' : 'no_of_error', {
                count: errors.length,
              })}
        </LegacyStyledText>
        <Flex css={ERROR_MESSAGE_STYLE}>
          {' '}
          {errors.map((error, index) => (
            <LegacyStyledText
              as="p"
              textAlign={TYPOGRAPHY.textAlignLeft}
              key={index}
            >
              {' '}
              {isSingleError
                ? error.detail
                : `${error.errorCode}: ${error.detail}`}
            </LegacyStyledText>
          ))}
        </Flex>
      </Flex>
    )
  }

  return (
    <Modal {...modalProps}>
      <Flex flexDirection={DIRECTION_COLUMN}>
        <ErrorContent
          errors={
            highestPriorityError != null
              ? [highestPriorityError]
              : commandErrorList != null && commandErrorList.length > 0
              ? commandErrorList
              : []
          }
          isSingleError={!!highestPriorityError}
        />
        <LegacyStyledText as="p">
          {t('branded:run_failed_modal_description_desktop')}
        </LegacyStyledText>
        <Flex
          marginTop={SPACING.spacing32}
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
        >
          <Link css={TYPOGRAPHY.linkPSemiBold} onClick={handleDownloadClick}>
            <Flex gridGap={SPACING.spacing2} alignItems={ALIGN_CENTER}>
              <Icon name="download" size="1rem" />
              {i18n.format(t('download_run_log'), 'titleCase')}
            </Flex>
          </Link>
          <PrimaryButton onClick={handleClick}>
            {i18n.format(t('shared:close'), 'capitalize')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}

const ERROR_MESSAGE_STYLE = css`
  display: ${DISPLAY_FLEX};
  flex-direction: ${DIRECTION_COLUMN};
  max-height: 9.5rem;
  overflow-y: ${OVERFLOW_AUTO};
  margin-top: ${SPACING.spacing8};
  margin-bottom: ${SPACING.spacing16};
  padding: ${`${SPACING.spacing8} ${SPACING.spacing12}`};
  background-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius8};
  overflow-wrap: ${OVERFLOW_WRAP_ANYWHERE};

  ::-webkit-scrollbar-thumb {
    background: ${COLORS.grey40};
  }
`
