// app info card with version and updated
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import uuidv1 from 'uuid/v4'

import {
  ALIGN_CENTER,
  ALIGN_START,
  Banner,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DropdownMenu,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING_AUTO,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  useMountEffect,
} from '@opentrons/components'

import { TertiaryButton, ToggleButton } from '/app/atoms/buttons'
import { ExternalLink } from '/app/atoms/Link/ExternalLink'
import { Divider } from '/app/atoms/structure'
import { LANGUAGES } from '/app/i18n'
import {
  CURRENT_VERSION,
  getAvailableShellUpdate,
  checkShellUpdate,
} from '/app/redux/shell'
import {
  ALERT_APP_UPDATE_AVAILABLE,
  getAlertIsPermanentlyIgnored,
  alertPermanentlyIgnored,
  alertUnignored,
} from '/app/redux/alerts'
import {
  useTrackEvent,
  ANALYTICS_APP_UPDATE_NOTIFICATIONS_TOGGLED,
  ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_SETTINGS,
} from '/app/redux/analytics'
import { getAppLanguage, updateConfigValue } from '/app/redux/config'
import { UpdateAppModal } from '/app/organisms/Desktop/UpdateAppModal'
import { PreviousVersionModal } from '/app/organisms/Desktop/AppSettings/PreviousVersionModal'
import { ConnectRobotSlideout } from '/app/organisms/Desktop/AppSettings/ConnectRobotSlideout'
import { getTopPortalEl } from '/app/App/portal'

import type { Dispatch, State } from '/app/redux/types'

const SOFTWARE_SYNC_URL = 'https://support.opentrons.com/s/'
const GITHUB_LINK =
  'https://github.com/Opentrons/opentrons/blob/edge/app-shell/build/release-notes.md'

const ENABLE_APP_UPDATE_NOTIFICATIONS = 'Enable app update notifications'
const uuid: () => string = uuidv1

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation(['app_settings', 'shared', 'branded'])
  const dispatch = useDispatch<Dispatch>()
  const trackEvent = useTrackEvent()
  const [
    showPreviousVersionModal,
    setShowPreviousVersionModal,
  ] = useState<boolean>(false)
  const updateAvailable = Boolean(useSelector(getAvailableShellUpdate))

  const appLanguage = useSelector(getAppLanguage)
  const currentLanguageOption = LANGUAGES.find(lng => lng.value === appLanguage)
  let transactionId = ''
  useEffect(() => {
    transactionId = uuid()
  }, [])
  const handleDropdownClick = (value: string): void => {
    dispatch(updateConfigValue('language.appLanguage', value))
    trackEvent({
      name: ANALYTICS_LANGUAGE_UPDATED_DESKTOP_APP_SETTINGS,
      properties: {
        language: value,
        transactionId,
      },
    })
  }

  const [showUpdateBanner, setShowUpdateBanner] = useState<boolean>(
    updateAvailable
  )
  const [showConnectRobotSlideout, setShowConnectRobotSlideout] = useState(
    false
  )

  // may be enabled, disabled, or unknown (because config is loading)
  const updateAlertEnabled = useSelector((s: State) => {
    const ignored = getAlertIsPermanentlyIgnored(s, ALERT_APP_UPDATE_AVAILABLE)
    return ignored !== null ? !ignored : null
  })
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false)
  const handleToggle = (): void => {
    if (updateAlertEnabled !== null) {
      dispatch(
        updateAlertEnabled
          ? alertPermanentlyIgnored(ALERT_APP_UPDATE_AVAILABLE)
          : alertUnignored(ALERT_APP_UPDATE_AVAILABLE)
      )

      trackEvent({
        name: ANALYTICS_APP_UPDATE_NOTIFICATIONS_TOGGLED,
        // this looks weird, but the control is a toggle, which makes the next
        // "enabled" setting `!enabled`. Therefore the next "ignored" setting is
        // `!!enabled`, or just `enabled`
        properties: { updatesIgnored: updateAlertEnabled },
      })
    }
  }

  useMountEffect(() => {
    dispatch(checkShellUpdate())
  })
  return (
    <>
      <Box
        height="calc(100vh - 8.5rem)"
        paddingX={SPACING.spacing16}
        paddingY={SPACING.spacing24}
      >
        {showUpdateBanner && (
          <Box
            marginBottom={SPACING.spacing16}
            id="GeneralSettings_updatebanner"
          >
            <Banner
              type="warning"
              onCloseClick={() => {
                setShowUpdateBanner(false)
              }}
            >
              {t('branded:opentrons_app_update_available_variation')}
              <Link
                textDecoration={TYPOGRAPHY.textDecorationUnderline}
                role="button"
                onClick={() => {
                  setShowUpdateModal(true)
                }}
                marginLeft={SPACING.spacing4}
              >
                {t('view_update')}
              </Link>
            </Banner>
          </Box>
        )}
        <Box>
          <Flex
            flexDirection={DIRECTION_ROW}
            alignItems={updateAvailable ? ALIGN_CENTER : ALIGN_START}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            gridGap={SPACING.spacing16}
          >
            {showConnectRobotSlideout && (
              <ConnectRobotSlideout
                isExpanded={showConnectRobotSlideout}
                onCloseClick={() => {
                  setShowConnectRobotSlideout(false)
                }}
              />
            )}
            <Box width="65%">
              <LegacyStyledText
                css={TYPOGRAPHY.h3SemiBold}
                paddingBottom={SPACING.spacing8}
              >
                {t('software_version')}
              </LegacyStyledText>
              <LegacyStyledText
                as="p"
                paddingBottom={SPACING.spacing8}
                id="GeneralSettings_currentVersion"
              >
                {CURRENT_VERSION}
              </LegacyStyledText>
              <LegacyStyledText as="p">
                {t('shared:view_latest_release_notes')}
                <Link
                  external
                  href={GITHUB_LINK}
                  css={TYPOGRAPHY.linkPSemiBold}
                  id="GeneralSettings_GitHubLink"
                >{` ${t('shared:github')}`}</Link>
              </LegacyStyledText>
            </Box>
            {updateAvailable ? (
              <TertiaryButton
                disabled={!updateAvailable}
                marginLeft={SPACING_AUTO}
                onClick={() => {
                  setShowUpdateModal(true)
                }}
                id="GeneralSettings_softwareUpdate"
              >
                {t('view_software_update')}
              </TertiaryButton>
            ) : (
              <LegacyStyledText
                fontSize={TYPOGRAPHY.fontSizeLabel}
                lineHeight={TYPOGRAPHY.lineHeight12}
                color={COLORS.grey60}
                paddingY={SPACING.spacing24}
              >
                {t('up_to_date')}
              </LegacyStyledText>
            )}
          </Flex>
          <Box width="70%">
            <LegacyStyledText as="p" paddingY={SPACING.spacing8}>
              {t('manage_versions')}
            </LegacyStyledText>
          </Box>
          <Box>
            <Flex flexDirection={DIRECTION_COLUMN}>
              <Link
                role="button"
                css={TYPOGRAPHY.linkPSemiBold}
                onClick={() => {
                  setShowPreviousVersionModal(true)
                }}
                id="GeneralSettings_previousVersionLink"
              >
                {t('restore_previous')}
              </Link>
              <ExternalLink
                href={SOFTWARE_SYNC_URL}
                id="GeneralSettings_appAndRobotSync"
              >
                {t('branded:versions_sync')}
              </ExternalLink>
            </Flex>
          </Box>
        </Box>
        <Divider marginY={SPACING.spacing24} />
        <LegacyStyledText
          css={TYPOGRAPHY.h3SemiBold}
          paddingBottom={SPACING.spacing8}
        >
          {t('update_alerts')}
        </LegacyStyledText>
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <LegacyStyledText as="p">
            {t('branded:receive_alert')}
          </LegacyStyledText>
          <ToggleButton
            label={ENABLE_APP_UPDATE_NOTIFICATIONS}
            marginRight={SPACING.spacing16}
            disabled={updateAlertEnabled === null}
            toggledOn={updateAlertEnabled === true}
            onClick={handleToggle}
            id="GeneralSettings_softwareUpdateAlerts"
          />
        </Flex>
        <Divider marginY={SPACING.spacing24} />
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <LegacyStyledText
            css={TYPOGRAPHY.h3SemiBold}
            paddingBottom={SPACING.spacing8}
          >
            {t('connect_ip')}
          </LegacyStyledText>
          <TertiaryButton
            marginLeft={SPACING_AUTO}
            id="GeneralSettings_setUpConnection"
            onClick={() => {
              setShowConnectRobotSlideout(true)
            }}
          >
            {t('setup_connection')}
          </TertiaryButton>
        </Flex>
        <Divider marginY={SPACING.spacing24} />
        {currentLanguageOption != null ? (
          <>
            <Flex
              flexDirection={DIRECTION_ROW}
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              gridGap={SPACING.spacing24}
            >
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                <LegacyStyledText
                  css={TYPOGRAPHY.h3SemiBold}
                  paddingBottom={SPACING.spacing8}
                >
                  {t('app_language_preferences')}
                </LegacyStyledText>
                <LegacyStyledText as="p">
                  {t('app_language_description')}
                </LegacyStyledText>
              </Flex>
              <DropdownMenu
                filterOptions={LANGUAGES}
                currentOption={currentLanguageOption}
                onClick={handleDropdownClick}
                title={t('language')}
                width="9.5rem"
              />
            </Flex>
            <Divider marginY={SPACING.spacing24} />
          </>
        ) : null}
      </Box>
      {showUpdateModal
        ? createPortal(
            <UpdateAppModal
              closeModal={() => {
                setShowUpdateModal(false)
              }}
            />,
            getTopPortalEl()
          )
        : null}
      {showPreviousVersionModal ? (
        <PreviousVersionModal
          closeModal={() => {
            setShowPreviousVersionModal(false)
          }}
        />
      ) : null}
    </>
  )
}
