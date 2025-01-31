import { useSelector, useDispatch } from 'react-redux'
import styled, { css } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Banner,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  LegacyStyledText,
  Modal,
} from '@opentrons/components'

import {
  getShellUpdateState,
  getAvailableShellUpdate,
  downloadShellUpdate,
  applyShellUpdate,
} from '/app/redux/shell'

import { ExternalLink } from '/app/atoms/Link/ExternalLink'
import { ReleaseNotes } from '/app/molecules/ReleaseNotes'
import { ProgressBar } from '/app/atoms/ProgressBar'
import { useRemoveActiveAppUpdateToast } from '../Alerts'

import type { Dispatch } from '/app/redux/types'

interface PlaceHolderErrorProps {
  errorMessage?: string
}

const PlaceholderError = ({
  errorMessage,
}: PlaceHolderErrorProps): JSX.Element => {
  const SOMETHING_WENT_WRONG = 'Something went wrong while updating your app.'
  const AN_UNKNOWN_ERROR_OCCURRED = 'An unknown error occurred.'
  const FALLBACK_ERROR_MESSAGE = `If you keep getting this message, try restarting your app and/or
  robot. If this does not resolve the issue please contact Opentrons
  Support.`

  return (
    <>
      {SOMETHING_WENT_WRONG}
      <br />
      <br />
      {errorMessage ?? AN_UNKNOWN_ERROR_OCCURRED}
      <br />
      <br />
      {FALLBACK_ERROR_MESSAGE}
    </>
  )
}
export const RELEASE_NOTES_URL_BASE =
  'https://github.com/Opentrons/opentrons/releases/tag/v'
const UPDATE_ERROR = 'Update Error'

const UpdateAppBanner = styled(Banner)`
  border: none;
`
const UPDATE_PROGRESS_BAR_STYLE = css`
  margin-top: ${SPACING.spacing24};
  border-radius: ${BORDERS.borderRadius8};
  background: ${COLORS.grey30};
  width: 17.12rem;
`
const LEGACY_MODAL_STYLE = css`
  width: 40rem;
  margin-left: 5.336rem;
`

const RESTART_APP_AFTER_TIME = 5000

export interface UpdateAppModalProps {
  closeModal: (arg0: boolean) => void
}

export function UpdateAppModal(props: UpdateAppModalProps): JSX.Element {
  const { closeModal } = props
  const dispatch = useDispatch<Dispatch>()
  const updateState = useSelector(getShellUpdateState)
  const {
    downloaded,
    downloading,
    downloadPercentage,
    error,
    info: updateInfo,
  } = updateState
  let releaseNotesText = updateInfo?.releaseNotes
  if (Array.isArray(releaseNotesText)) {
    // it is unclear to me why/how electron-updater would ever expose
    // release notes this way, but this should never happen...
    // this string representation should always be returned
    releaseNotesText = releaseNotesText[0].note
  }

  const { t } = useTranslation(['app_settings', 'branded'])
  const navigate = useNavigate()
  const { removeActiveAppUpdateToast } = useRemoveActiveAppUpdateToast()
  const availableAppUpdateVersion = useSelector(getAvailableShellUpdate) ?? ''

  if (downloaded)
    setTimeout(() => dispatch(applyShellUpdate()), RESTART_APP_AFTER_TIME)

  const handleRemindMeLaterClick = (): void => {
    navigate('/app-settings/general')
    closeModal(true)
  }

  removeActiveAppUpdateToast()

  const appUpdateFooter = (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      paddingY={SPACING.spacing16}
      borderTop={BORDERS.lineBorder}
      borderColor={COLORS.grey30}
    >
      <ExternalLink
        href={`${RELEASE_NOTES_URL_BASE}${availableAppUpdateVersion}`}
        css={css`
          font-size: 0.875rem;
        `}
        id="SoftwareUpdateReleaseNotesLink"
        marginLeft={SPACING.spacing32}
      >
        {t('release_notes')}
      </ExternalLink>
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_AROUND}>
        <SecondaryButton
          onClick={handleRemindMeLaterClick}
          marginRight={SPACING.spacing8}
        >
          {t('remind_later')}
        </SecondaryButton>
        <PrimaryButton
          onClick={() => dispatch(downloadShellUpdate())}
          marginRight={SPACING.spacing12}
        >
          {t('update_app_now')}
        </PrimaryButton>
      </Flex>
    </Flex>
  )

  return (
    <>
      {error != null ? (
        <Modal
          title={UPDATE_ERROR}
          onClose={() => {
            closeModal(true)
          }}
          css={LEGACY_MODAL_STYLE}
        >
          <PlaceholderError errorMessage={error.message} />
        </Modal>
      ) : null}
      {(downloading || downloaded) && error == null ? (
        <Modal
          title={t('branded:opentrons_app_update')}
          css={LEGACY_MODAL_STYLE}
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            alignItems={ALIGN_CENTER}
            padding={SPACING.spacing48}
          >
            <LegacyStyledText>
              {downloading ? t('download_update') : t('restarting_app')}
            </LegacyStyledText>
            <ProgressBar
              percentComplete={downloaded ? 100 : downloadPercentage}
              outerStyles={UPDATE_PROGRESS_BAR_STYLE}
            />
          </Flex>
        </Modal>
      ) : null}
      {!downloading && !downloaded && error == null ? (
        <Modal
          title={t('branded:opentrons_app_update_available')}
          onClose={() => {
            closeModal(true)
          }}
          closeOnOutsideClick={true}
          footer={appUpdateFooter}
          maxHeight="80%"
          css={LEGACY_MODAL_STYLE}
        >
          <Flex flexDirection={DIRECTION_COLUMN}>
            <UpdateAppBanner type="informing" marginBottom={SPACING.spacing8}>
              {t('branded:update_requires_restarting_app')}
            </UpdateAppBanner>
            <ReleaseNotes source={releaseNotesText} />
          </Flex>
        </Modal>
      ) : null}
    </>
  )
}
