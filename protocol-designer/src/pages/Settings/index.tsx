import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link as LinkComponent,
  ListItem,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { AnnouncementModal, DOC_URL } from '../../organisms'
import {
  actions as analyticsActions,
  selectors as analyticsSelectors,
} from '../../analytics'
import {
  actions as tutorialActions,
  selectors as tutorialSelectors,
} from '../../tutorial'
import { ToggleButton } from '../../atoms/ToggleButton'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { actions as featureFlagActions } from '../../feature-flags'
import { getFeatureFlagData } from '../../feature-flags/selectors'
import type { FlagTypes } from '../../feature-flags'

const HOT_KEY_FLAG = 'OT_PD_ENABLE_HOT_KEYS_DISPLAY'
const PRIVACY_POLICY_URL = 'https://opentrons.com/privacy-policy'
const EULA_URL = 'https://opentrons.com/eula'

export function Settings(): JSX.Element {
  const dispatch = useDispatch()
  const { t } = useTranslation(['feature_flags', 'shared'])
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(
    false
  )
  const { hasOptedIn } = useSelector(analyticsSelectors.getHasOptedIn)
  const flags = useSelector(getFeatureFlagData)
  const canClearHintDismissals = useSelector(
    tutorialSelectors.getCanClearHintDismissals
  )

  const pdVersion = process.env.OT_PD_VERSION

  const prereleaseModeEnabled = flags.PRERELEASE_MODE === true

  const allFlags = Object.keys(flags) as FlagTypes[]

  const getDescription = (flag: FlagTypes): string => {
    return flag === 'OT_PD_DISABLE_MODULE_RESTRICTIONS'
      ? t(`feature_flags:${flag}.description_1`)
      : t(`feature_flags:${flag}.description`)
  }

  const setFeatureFlags = (
    flags: Partial<Record<FlagTypes, boolean | null | undefined>>
  ): void => {
    dispatch(featureFlagActions.setFeatureFlags(flags))
  }

  const toFlagRow = (flagName: FlagTypes): JSX.Element => {
    return (
      <Flex key={flagName} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t(`feature_flags:${flagName}.title`)}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            {getDescription(flagName)}
          </StyledText>
        </Flex>
        <ToggleButton
          label={`Settings_${flagName}`}
          toggledOn={Boolean(flags[flagName])}
          onClick={() => {
            setFeatureFlags({
              [flagName as string]: !flags[flagName],
            })
          }}
        />
      </Flex>
    )
  }

  const prereleaseFlagRows = allFlags
    .filter(flag => flag !== 'OT_PD_ENABLE_HOT_KEYS_DISPLAY')
    .map(toFlagRow)

  return (
    <>
      {showAnnouncementModal ? (
        <AnnouncementModal
          isViewReleaseNotes={showAnnouncementModal}
          onClose={() => {
            setShowAnnouncementModal(false)
          }}
        />
      ) : null}
      <Flex
        backgroundColor={COLORS.grey10}
        width="100%"
        minHeight="calc(100vh - 56px)"
        height="100%"
        padding={`${SPACING.spacing80} 17rem`}
      >
        <Flex
          backgroundColor={COLORS.white}
          padding={SPACING.spacing40}
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing40}
          borderRadius={BORDERS.borderRadius8}
          width="100%"
        >
          <StyledText desktopStyle="headingLargeBold">
            {t('shared:settings')}
          </StyledText>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
              <StyledText desktopStyle="bodyLargeSemiBold">
                {t('shared:app_info')}
              </StyledText>
              <ListItem
                padding={SPACING.spacing16}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                type="noActive"
              >
                <Flex flexDirection={DIRECTION_COLUMN}>
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('shared:pd_version')}
                  </StyledText>
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {pdVersion}
                  </StyledText>
                </Flex>
                <Flex gridGap={SPACING.spacing16} alignItems={ALIGN_CENTER}>
                  <LinkComponent
                    css={LINK_BUTTON_STYLE}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                    href={DOC_URL}
                    external
                    padding={SPACING.spacing4}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('shared:software_manual')}
                    </StyledText>
                  </LinkComponent>

                  <Btn
                    css={LINK_BUTTON_STYLE}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                    onClick={() => {
                      setShowAnnouncementModal(true)
                    }}
                    data-testid="AnnouncementModal_viewReleaseNotesButton"
                    padding={SPACING.spacing4}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('shared:release_notes')}
                    </StyledText>
                  </Btn>
                </Flex>
              </ListItem>
            </Flex>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
              <StyledText desktopStyle="bodyLargeSemiBold">
                {t('shared:user_settings')}
              </StyledText>
              <ListItem
                padding={SPACING.spacing16}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                type="noActive"
              >
                <Flex flexDirection={DIRECTION_COLUMN}>
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('shared:hints')}
                  </StyledText>
                  <Flex color={COLORS.grey60}>
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('shared:show_hints_and_tips')}
                    </StyledText>
                  </Flex>
                </Flex>
                <Btn
                  disabled={!canClearHintDismissals}
                  textDecoration={
                    canClearHintDismissals
                      ? TYPOGRAPHY.textDecorationUnderline
                      : 'none'
                  }
                  onClick={() =>
                    dispatch(tutorialActions.clearAllHintDismissals())
                  }
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {canClearHintDismissals
                      ? t('shared:reset')
                      : t('shared:no_hints_to_restore')}
                  </StyledText>
                </Btn>
              </ListItem>
              <ListItem
                padding={SPACING.spacing16}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                type="noActive"
              >
                <Flex flexDirection={DIRECTION_COLUMN}>
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('OT_PD_ENABLE_HOT_KEYS_DISPLAY.title')}
                  </StyledText>
                  <Flex color={COLORS.grey60}>
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('OT_PD_ENABLE_HOT_KEYS_DISPLAY.description')}
                    </StyledText>
                  </Flex>
                </Flex>
                <ToggleButton
                  label="Settings_hotKeys"
                  toggledOn={Boolean(flags[HOT_KEY_FLAG])}
                  onClick={() => {
                    setFeatureFlags({
                      OT_PD_ENABLE_HOT_KEYS_DISPLAY: !flags[HOT_KEY_FLAG],
                    })
                  }}
                />
              </ListItem>
            </Flex>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
              <StyledText desktopStyle="bodyLargeSemiBold">
                {t('shared:privacy')}
              </StyledText>
              <ListItem
                padding={SPACING.spacing16}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                type="noActive"
                gridGap={SPACING.spacing40}
              >
                <Flex flexDirection={DIRECTION_COLUMN}>
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('shared:shared_analytics')}
                  </StyledText>
                  <StyledText desktopStyle="bodyDefaultRegular">
                    <Trans
                      t={t}
                      i18nKey="shared:we_are_improving"
                      components={{
                        link1: (
                          <LinkComponent
                            external
                            href={PRIVACY_POLICY_URL}
                            color={COLORS.blue50}
                          />
                        ),
                        link2: (
                          <LinkComponent
                            external
                            href={EULA_URL}
                            color={COLORS.blue50}
                          />
                        ),
                      }}
                    />
                  </StyledText>
                </Flex>
                <Btn
                  role="switch"
                  data-testid="analyticsToggle"
                  size="2rem"
                  css={
                    Boolean(hasOptedIn)
                      ? TOGGLE_ENABLED_STYLES
                      : TOGGLE_DISABLED_STYLES
                  }
                  onClick={() =>
                    dispatch(
                      hasOptedIn
                        ? analyticsActions.optOut()
                        : analyticsActions.optIn()
                    )
                  }
                >
                  <Icon
                    name={
                      hasOptedIn ? 'ot-toggle-input-on' : 'ot-toggle-input-off'
                    }
                    height="1rem"
                  />
                </Btn>
              </ListItem>
            </Flex>
          </Flex>
          {prereleaseModeEnabled ? (
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
              <StyledText desktopStyle="bodyLargeSemiBold">
                {t('shared:developer_ff')}
              </StyledText>
              <ListItem
                type="noActive"
                padding={SPACING.spacing16}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing16}
              >
                {prereleaseFlagRows}
              </ListItem>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </>
  )
}

const TOGGLE_DISABLED_STYLES = css`
  color: ${COLORS.grey50};

  &:hover {
    color: ${COLORS.grey55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`

const TOGGLE_ENABLED_STYLES = css`
  color: ${COLORS.blue50};

  &:hover {
    color: ${COLORS.blue55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`
