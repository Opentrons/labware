import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { css } from 'styled-components'

import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  ModalHeader,
  ModalShell,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { useErrorName } from '../hooks'
import { OddModal } from '/app/molecules/OddModal'
import { getModalPortalEl, getTopPortalEl } from '/app/App/portal'
import { ERROR_KINDS } from '../constants'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { StepInfo } from './StepInfo'
import { getErrorKind } from '../utils'

import type { ReactNode } from 'react'
import type { LabwareDefinition2, RobotType } from '@opentrons/shared-data'
import type { IconProps } from '@opentrons/components'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'
import type { ERUtilsResults, useRetainedFailedCommandBySource } from '../hooks'
import type { ErrorRecoveryFlowsProps } from '..'
import type { DesktopSizeType, ErrorKind } from '../types'

export function useErrorDetailsModal(): {
  showModal: boolean
  toggleModal: () => void
} {
  const [showModal, setShowModal] = useState(false)

  const toggleModal = (): void => {
    setShowModal(!showModal)
  }

  return { showModal, toggleModal }
}

type ErrorDetailsModalProps = Omit<
  ErrorRecoveryFlowsProps,
  'unvalidatedFailedCommand'
> &
  ERUtilsResults & {
    toggleModal: () => void
    isOnDevice: boolean
    robotType: RobotType
    desktopType: DesktopSizeType
    failedCommand: ReturnType<typeof useRetainedFailedCommandBySource>
    allRunDefs: LabwareDefinition2[]
  }

export function ErrorDetailsModal(props: ErrorDetailsModalProps): JSX.Element {
  const { failedCommand, toggleModal, isOnDevice } = props
  const errorKind = getErrorKind(failedCommand)
  const errorName = useErrorName(errorKind)

  const isNotificationErrorKind = (): boolean => {
    switch (errorKind) {
      case ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE:
      case ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING:
      case ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING:
      case ERROR_KINDS.TIP_NOT_DETECTED:
      case ERROR_KINDS.GRIPPER_ERROR:
      case ERROR_KINDS.STALL_OR_COLLISION:
        return true
      default:
        return false
    }
  }

  const modalHeader: OddModalHeaderBaseProps = {
    title: errorName,
    hasExitIcon: true,
  }

  const buildModal = (): JSX.Element => {
    if (isOnDevice) {
      return createPortal(
        <ErrorDetailsModalODD
          {...props}
          toggleModal={toggleModal}
          modalHeader={modalHeader}
        >
          {isNotificationErrorKind() ? (
            <NotificationBanner errorKind={errorKind} />
          ) : null}
        </ErrorDetailsModalODD>,
        getTopPortalEl()
      )
    } else {
      return createPortal(
        <ErrorDetailsModalDesktop
          {...props}
          toggleModal={toggleModal}
          modalHeader={modalHeader}
        >
          {isNotificationErrorKind() ? (
            <NotificationBanner errorKind={errorKind} />
          ) : null}
        </ErrorDetailsModalDesktop>,
        getModalPortalEl()
      )
    }
  }

  return buildModal()
}

type ErrorDetailsModalType = ErrorDetailsModalProps & {
  children: ReactNode
  modalHeader: OddModalHeaderBaseProps
  toggleModal: () => void
  desktopType: DesktopSizeType
}

export function ErrorDetailsModalDesktop(
  props: ErrorDetailsModalType
): JSX.Element {
  const { children, modalHeader, toggleModal, desktopType } = props
  const { t } = useTranslation('error_recovery')

  const buildIcon = (): IconProps => {
    return {
      name: 'information',
      color: COLORS.grey60,
      size: SPACING.spacing20,
      marginRight: SPACING.spacing8,
    }
  }

  const buildHeader = (): JSX.Element => {
    return (
      <ModalHeader
        onClose={toggleModal}
        title={t('error_details')}
        icon={buildIcon()}
        color={COLORS.black90}
        backgroundColor={COLORS.white}
      />
    )
  }

  return (
    <ModalShell
      header={buildHeader()}
      css={
        desktopType === 'desktop-small'
          ? DESKTOP_MODAL_STYLE_SMALL
          : DESKTOP_MODAL_STYLE_LARGE
      }
    >
      <Flex
        padding={SPACING.spacing24}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
      >
        <StyledText desktopStyle="headingSmallBold">
          {modalHeader.title}
        </StyledText>
        {children}
        <Flex css={DESKTOP_STEP_INFO_STYLE}>
          <StepInfo {...props} desktopStyle="bodyDefaultRegular" />
        </Flex>
      </Flex>
    </ModalShell>
  )
}

export function ErrorDetailsModalODD(
  props: ErrorDetailsModalType
): JSX.Element {
  const { children, modalHeader, toggleModal } = props

  return (
    <OddModal
      header={modalHeader}
      onOutsideClick={toggleModal}
      zIndex={15}
      gridGap={SPACING.spacing32}
    >
      <Flex gridGap={SPACING.spacing24} flexDirection={DIRECTION_COLUMN}>
        {children}
        <Flex
          gridGap={SPACING.spacing16}
          backgroundColor={COLORS.grey35}
          borderRadius={BORDERS.borderRadius8}
          padding={`${SPACING.spacing16} ${SPACING.spacing20}`}
        >
          <StepInfo {...props} desktopStyle="bodyDefaultRegular" />
        </Flex>
      </Flex>
    </OddModal>
  )
}

export function NotificationBanner({
  errorKind,
}: {
  errorKind: ErrorKind
}): JSX.Element {
  const buildContent = (): JSX.Element => {
    switch (errorKind) {
      case ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE:
      case ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING:
      case ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING:
        return <OverpressureBanner />
      case ERROR_KINDS.TIP_NOT_DETECTED:
        return <TipNotDetectedBanner />
      case ERROR_KINDS.GRIPPER_ERROR:
        return <GripperErrorBanner />
      case ERROR_KINDS.STALL_OR_COLLISION:
        return <StallErrorBanner />
      default:
        console.error('Handle error kind notification banners explicitly.')
        return <div />
    }
  }

  return buildContent()
}

export function OverpressureBanner(): JSX.Element {
  const { t } = useTranslation('error_recovery')

  return (
    <InlineNotification
      type="alert"
      heading={t('overpressure_is_usually_caused')}
      message={t('if_issue_persists_overpressure')}
    />
  )
}

export function TipNotDetectedBanner(): JSX.Element {
  const { t } = useTranslation('error_recovery')

  return (
    <InlineNotification
      type="alert"
      heading={t('tip_presence_errors_are_caused')}
      message={t('if_issue_persists_tip_not_detected')}
    />
  )
}

export function GripperErrorBanner(): JSX.Element {
  const { t } = useTranslation('error_recovery')

  return (
    <InlineNotification
      type="alert"
      heading={t('gripper_errors_occur_when')}
      message={t('if_issue_persists_gripper_error')}
    />
  )
}

export function StallErrorBanner(): JSX.Element {
  const { t } = useTranslation('error_recovery')

  return (
    <InlineNotification
      type="alert"
      heading={t('stall_or_collision_detected_when')}
      message={t('the_robot_must_return_to_home_position')}
    />
  )
}

// TODO(jh, 07-24-24): Using shared height/width constants for intervention modal sizing and the ErrorDetailsModal sizing
// would be ideal.
const DESKTOP_STEP_INFO_STYLE = css`
  background-color: ${COLORS.grey30};
  grid-gap: ${SPACING.spacing10};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing6} ${SPACING.spacing24} ${SPACING.spacing6}
    ${SPACING.spacing12};
`

const DESKTOP_MODAL_STYLE_BASE = css`
  width: 47rem;
`

const DESKTOP_MODAL_STYLE_SMALL = css`
  ${DESKTOP_MODAL_STYLE_BASE}
  height: 26rem;
`
const DESKTOP_MODAL_STYLE_LARGE = css`
  ${DESKTOP_MODAL_STYLE_BASE}
  height: 31rem;
`
