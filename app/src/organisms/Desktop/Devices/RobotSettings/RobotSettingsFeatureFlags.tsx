import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ToggleButton } from '/app/atoms/buttons'
import {
  updateSetting,
  getRobotSettings,
  fetchSettings,
} from '/app/redux/robot-settings'

import type { MouseEventHandler } from 'react'
import type { State, Dispatch } from '/app/redux/types'
import type {
  RobotSettings,
  RobotSettingsField,
} from '/app/redux/robot-settings/types'

interface RobotSettingsFeatureFlagsProps {
  robotName: string
}

const NON_FEATURE_FLAG_SETTINGS = [
  'enableDoorSafetySwitch',
  'enableOEMMode',
  'disableHomeOnBoot',
  'deckCalibrationDots',
  'shortFixedTrash',
  'useOldAspirationFunctions',
  'disableFastProtocolUpload',
  'disableStatusBar',
]

export function RobotSettingsFeatureFlags({
  robotName,
}: RobotSettingsFeatureFlagsProps): JSX.Element {
  const settings = useSelector<State, RobotSettings>((state: State) =>
    getRobotSettings(state, robotName)
  )
  const featureFlags = settings.filter(
    ({ id }) => !NON_FEATURE_FLAG_SETTINGS.includes(id)
  )

  const dispatch = useDispatch<Dispatch>()

  useEffect(() => {
    dispatch(fetchSettings(robotName))
  }, [dispatch, robotName])

  return (
    <>
      {featureFlags.map(field => (
        <FeatureFlagToggle
          key={field.id}
          settingField={field}
          robotName={robotName}
        />
      ))}
    </>
  )
}

interface FeatureFlagToggleProps {
  settingField: RobotSettingsField
  robotName: string
}

export function FeatureFlagToggle({
  settingField,
  robotName,
}: FeatureFlagToggleProps): JSX.Element | null {
  const dispatch = useDispatch<Dispatch>()
  const { value, id, title, description } = settingField

  if (id == null) return null

  const handleClick: MouseEventHandler<Element> = () => {
    dispatch(updateSetting(robotName, id, !value))
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginBottom={SPACING.spacing16}
    >
      <Box width="70%">
        <LegacyStyledText
          css={TYPOGRAPHY.pSemiBold}
          paddingBottom={SPACING.spacing4}
        >
          {title}
        </LegacyStyledText>
        <LegacyStyledText as="p">{description}</LegacyStyledText>
      </Box>
      <ToggleButton
        label={title}
        toggledOn={value === true}
        onClick={handleClick}
      />
    </Flex>
  )
}
