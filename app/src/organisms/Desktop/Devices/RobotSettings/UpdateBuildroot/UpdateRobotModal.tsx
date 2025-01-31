import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  Banner,
  BORDERS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_SPACE_BETWEEN,
  Modal,
  NewPrimaryBtn,
  NewSecondaryBtn,
  SPACING,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import {
  getRobotUpdateDisplayInfo,
  robotUpdateChangelogSeen,
  OT2_BALENA,
  UPGRADE,
  REINSTALL,
  DOWNGRADE,
  getRobotUpdateVersion,
} from '/app/redux/robot-update'
import { ExternalLink } from '/app/atoms/Link/ExternalLink'
import { ReleaseNotes } from '/app/molecules/ReleaseNotes'
import { useIsRobotBusy } from '/app/redux-resources/robots'
import { useDispatchStartRobotUpdate } from '/app/redux/robot-update/hooks'

import type { State, Dispatch } from '/app/redux/types'
import type { RobotSystemType } from '/app/redux/robot-update/types'

export const RELEASE_NOTES_URL_BASE =
  'https://github.com/Opentrons/opentrons/releases/tag/v'

const UpdateAppBanner = styled(Banner)`
  border: none;
`
export const FOOTER_BUTTON_STYLE = css`
  text-transform: lowercase;
  padding-left: ${SPACING.spacing16};
  padding-right: ${SPACING.spacing16};
  border-radius: ${BORDERS.borderRadius8};
  margin-top: ${SPACING.spacing16};
  margin-bottom: ${SPACING.spacing16};

  &:first-letter {
    text-transform: uppercase;
  }
`
type UpdateType = typeof UPGRADE | typeof DOWNGRADE | typeof REINSTALL | null

export interface UpdateRobotModalProps {
  robotName: string
  releaseNotes: string
  systemType: RobotSystemType
  updateType: UpdateType
  closeModal: () => void
}

export function UpdateRobotModal({
  robotName,
  releaseNotes,
  systemType,
  updateType,
  closeModal,
}: UpdateRobotModalProps): JSX.Element {
  const dispatch = useDispatch<Dispatch>()
  const { t } = useTranslation('device_settings')
  const [updateButtonProps, updateButtonTooltipProps] = useHoverTooltip()
  // TODO(jh 08-29-2023): revisit reasons that are/are not captured by this selector.
  const { updateFromFileDisabledReason } = useSelector((state: State) => {
    return getRobotUpdateDisplayInfo(state, robotName)
  })
  const dispatchStartRobotUpdate = useDispatchStartRobotUpdate()
  const robotUpdateVersion = useSelector((state: State) => {
    return getRobotUpdateVersion(state, robotName) ?? ''
  })

  const isRobotBusy = useIsRobotBusy()
  const updateDisabled = updateFromFileDisabledReason !== null || isRobotBusy

  let disabledReason: string = ''
  if (updateFromFileDisabledReason)
    disabledReason = t(updateFromFileDisabledReason)
  else if (isRobotBusy) disabledReason = t('robot_busy_protocol')

  useEffect(() => {
    dispatch(robotUpdateChangelogSeen(robotName))
  }, [robotName])

  let heading = ''
  if (updateType === UPGRADE || updateType === DOWNGRADE) {
    if (systemType === OT2_BALENA) {
      heading = t('robot_operating_update_available')
    } else {
      heading = `${robotName} ${t('update_available')}`
    }
  } else if (updateType === REINSTALL) {
    heading = t('robot_up_to_date')
    releaseNotes = t('robot_up_to_date_description')
  }

  const robotUpdateFooter = (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <ExternalLink
        href={`${RELEASE_NOTES_URL_BASE}${robotUpdateVersion}`}
        css={css`
          font-size: 0.875rem;
        `}
        id="SoftwareUpdateReleaseNotesLink"
        marginLeft={SPACING.spacing32}
      >
        {t('release_notes')}
      </ExternalLink>
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_AROUND}>
        <NewSecondaryBtn
          onClick={closeModal}
          marginRight={SPACING.spacing8}
          css={FOOTER_BUTTON_STYLE}
        >
          {updateType === UPGRADE ? t('remind_me_later') : t('not_now')}
        </NewSecondaryBtn>
        <NewPrimaryBtn
          onClick={() => {
            dispatchStartRobotUpdate(robotName)
          }}
          marginRight={SPACING.spacing12}
          css={FOOTER_BUTTON_STYLE}
          disabled={updateDisabled}
          {...updateButtonProps}
        >
          {t('update_robot_now')}
        </NewPrimaryBtn>
        {updateDisabled && (
          <Tooltip tooltipProps={updateButtonTooltipProps}>
            {disabledReason}
          </Tooltip>
        )}
      </Flex>
    </Flex>
  )

  return (
    <Modal
      title={heading}
      onClose={closeModal}
      closeOnOutsideClick={true}
      footer={robotUpdateFooter}
      maxHeight="80%"
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <UpdateAppBanner type="informing" marginBottom={SPACING.spacing8}>
          {t('update_requires_restarting_robot')}
        </UpdateAppBanner>
        <ReleaseNotes source={releaseNotes} />
      </Flex>
    </Modal>
  )
}
