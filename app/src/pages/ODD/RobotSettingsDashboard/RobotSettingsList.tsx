import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { LANGUAGES, US_ENGLISH_DISPLAY_NAME } from '/app/i18n'
import { getLocalRobot, getRobotApiVersion } from '/app/redux/discovery'
import { getRobotUpdateAvailable } from '/app/redux/robot-update'
import { useErrorRecoverySettingsToggle } from '/app/resources/errorRecovery'
import {
  DEV_INTERNAL_FLAGS,
  getAppLanguage,
  getApplyHistoricOffsets,
  getDevtoolsEnabled,
  getFeatureFlags,
  toggleDevInternalFlag,
  toggleDevtools,
  toggleHistoricOffsets,
  useFeatureFlag,
} from '/app/redux/config'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { getRobotSettings, updateSetting } from '/app/redux/robot-settings'
import { UNREACHABLE } from '/app/redux/discovery/constants'
import { Navigation } from '/app/organisms/ODD/Navigation'
import { useLEDLights } from '/app/resources/robot-settings'
import { useNetworkConnection } from '/app/resources/networking'
import {
  RobotSettingButton,
  OnOffToggle,
} from '/app/organisms/ODD/RobotSettingsDashboard'

import type { Dispatch, State } from '/app/redux/types'
import type { SetSettingOption } from '/app/organisms/ODD/RobotSettingsDashboard'

const HOME_GANTRY_SETTING_ID = 'disableHomeOnBoot'
interface RobotSettingsListProps {
  setCurrentOption: SetSettingOption
}

export function RobotSettingsList(props: RobotSettingsListProps): JSX.Element {
  const { setCurrentOption } = props
  const { t, i18n } = useTranslation([
    'device_settings',
    'app_settings',
    'branded',
  ])
  const isNewLpc = useFeatureFlag('lpcRedesign')
  const dispatch = useDispatch<Dispatch>()
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const networkConnection = useNetworkConnection(robotName)

  const robotServerVersion =
    localRobot?.status != null ? getRobotApiVersion(localRobot) : null

  const allRobotSettings = useSelector((state: State) =>
    getRobotSettings(state, robotName)
  )

  const isHomeGantryOn =
    allRobotSettings.find(({ id }) => id === HOME_GANTRY_SETTING_ID)?.value ??
    false

  const robotUpdateType = useSelector((state: State) => {
    return localRobot != null && localRobot.status !== UNREACHABLE
      ? getRobotUpdateAvailable(state, localRobot)
      : null
  })
  const isUpdateAvailable = robotUpdateType === 'upgrade'
  const devToolsOn = useSelector(getDevtoolsEnabled)
  const historicOffsetsOn = useSelector(getApplyHistoricOffsets)
  const { lightsEnabled, toggleLights } = useLEDLights(robotName)
  const { toggleERSettings, isEREnabled } = useErrorRecoverySettingsToggle()

  const appLanguage = useSelector(getAppLanguage)
  const currentLanguageOption = LANGUAGES.find(lng => lng.value === appLanguage)

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Navigation />
      <Flex paddingX={SPACING.spacing40} flexDirection={DIRECTION_COLUMN}>
        <RobotSettingButton
          settingName={t('network_settings')}
          dataTestId="RobotSettingButton_network_settings"
          settingInfo={networkConnection?.connectionStatus}
          onClick={() => {
            setCurrentOption('NetworkSettings')
          }}
          iconName="wifi"
        />
        <Link to="/robot-settings/rename-robot">
          <RobotSettingButton
            settingName={t('robot_name')}
            settingInfo={robotName}
            onClick={() => {
              setCurrentOption('RobotName')
            }}
            iconName="flex-robot"
          />
        </Link>
        <RobotSettingButton
          settingName={t('robot_system_version')}
          dataTestId="RobotSettingButton_robot_system_version"
          settingInfo={
            robotServerVersion != null
              ? `v${robotServerVersion}`
              : t('robot_settings_advanced_unknown')
          }
          onClick={() => {
            setCurrentOption('RobotSystemVersion')
          }}
          iconName="update"
          rightElement={
            <Flex gridGap={SPACING.spacing40} alignItems={ALIGN_CENTER}>
              {isUpdateAvailable ? (
                <InlineNotification
                  type="alert"
                  heading={i18n.format(
                    t('app_settings:update_available'),
                    'capitalize'
                  )}
                  hug={true}
                />
              ) : null}
              <Icon name="more" size="3rem" color={COLORS.black90} />
            </Flex>
          }
        />
        <RobotSettingButton
          settingName={t('app_settings:language')}
          settingInfo={
            currentLanguageOption != null
              ? currentLanguageOption.name
              : US_ENGLISH_DISPLAY_NAME
          }
          onClick={() => {
            setCurrentOption('LanguageSetting')
          }}
          iconName="language"
        />
        <RobotSettingButton
          settingName={t('display_led_lights')}
          dataTestId="RobotSettingButton_display_led_lights"
          settingInfo={t('display_led_lights_description')}
          iconName="light"
          rightElement={<OnOffToggle isOn={lightsEnabled} />}
          onClick={toggleLights}
        />
        <RobotSettingButton
          settingName={t('touchscreen_sleep')}
          dataTestId="RobotSettingButton_touchscreen_sleep"
          onClick={() => {
            setCurrentOption('TouchscreenSleep')
          }}
          iconName="sleep"
        />
        <RobotSettingButton
          settingName={t('touchscreen_brightness')}
          dataTestId="RobotSettingButton_touchscreen_brightness"
          onClick={() => {
            setCurrentOption('TouchscreenBrightness')
          }}
          iconName="brightness"
        />
        <RobotSettingButton
          settingName={t('app_settings:privacy')}
          dataTestId="RobotSettingButton_privacy"
          settingInfo={t('branded:choose_what_data_to_share')}
          onClick={() => {
            setCurrentOption('Privacy')
          }}
          iconName="privacy"
        />
        {!isNewLpc && (
          <RobotSettingButton
            settingName={t('apply_historic_offsets')}
            dataTestId="RobotSettingButton_apply_historic_offsets"
            settingInfo={t('historic_offsets_description')}
            iconName="reticle"
            rightElement={<OnOffToggle isOn={historicOffsetsOn} />}
            onClick={() => dispatch(toggleHistoricOffsets())}
          />
        )}
        <RobotSettingButton
          settingName={t('app_settings:error_recovery_mode')}
          dataTestId="RobotSettingButton_error_recovery_mode"
          settingInfo={t('app_settings:error_recovery_mode_description')}
          iconName="recovery-alt"
          rightElement={<OnOffToggle isOn={isEREnabled} />}
          onClick={toggleERSettings}
        />
        <RobotSettingButton
          settingName={t('device_reset')}
          dataTestId="RobotSettingButton_device_reset"
          onClick={() => {
            setCurrentOption('DeviceReset')
          }}
          iconName="reset"
        />
        <RobotSettingButton
          settingName={t('gantry_homing')}
          dataTestId="RobotSettingButton_home_gantry_on_restart"
          settingInfo={t('gantry_homing_description')}
          iconName="gantry-homing"
          rightElement={<OnOffToggle isOn={!isHomeGantryOn} />}
          onClick={() =>
            dispatch(
              updateSetting(robotName, HOME_GANTRY_SETTING_ID, !isHomeGantryOn)
            )
          }
        />
        <RobotSettingButton
          settingName={t('app_settings:update_channel')}
          dataTestId="RobotSettingButton_update_channel"
          onClick={() => {
            setCurrentOption('UpdateChannel')
          }}
          iconName="update-channel"
        />
        <RobotSettingButton
          settingName={t('app_settings:enable_dev_tools')}
          dataTestId="RobotSettingButton_enable_dev_tools"
          settingInfo={t('dev_tools_description')}
          iconName="build"
          rightElement={<OnOffToggle isOn={devToolsOn} />}
          onClick={() => dispatch(toggleDevtools())}
        />
        {devToolsOn ? <FeatureFlags /> : null}
      </Flex>
    </Flex>
  )
}

function FeatureFlags(): JSX.Element {
  const { t } = useTranslation('app_settings')
  const devInternalFlags = useSelector(getFeatureFlags)
  const dispatch = useDispatch<Dispatch>()
  return (
    <>
      {DEV_INTERNAL_FLAGS.map(flag => (
        <Btn
          key={flag}
          width="100%"
          marginBottom={SPACING.spacing8}
          backgroundColor={COLORS.grey35}
          padding={`${SPACING.spacing20} ${SPACING.spacing24}`}
          borderRadius={BORDERS.borderRadius16}
          display={DISPLAY_FLEX}
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing24}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
          onClick={() => {
            dispatch(toggleDevInternalFlag(flag))
          }}
        >
          <Flex
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing24}
            alignItems={ALIGN_CENTER}
          >
            <Icon name="alert-circle" size="3rem" color={COLORS.black90} />
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing2}
              alignItems={ALIGN_FLEX_START}
              justifyContent={JUSTIFY_CENTER}
              width="46.25rem"
            >
              <LegacyStyledText
                as="h4"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              >
                {t(`__dev_internal__${flag}`)}
              </LegacyStyledText>
            </Flex>
          </Flex>
          <OnOffToggle isOn={Boolean(devInternalFlags?.[flag])} />
        </Btn>
      ))}
    </>
  )
}
