import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
  LegacyStyledText,
} from '@opentrons/components'

import { Divider } from '/app/atoms/structure'
import { ToggleButton } from '/app/atoms/buttons'
import {
  DeviceReset,
  DisplayRobotName,
  EnableStatusLight,
  EnableErrorRecoveryMode,
  FactoryMode,
  GantryHoming,
  LegacySettings,
  OpenJupyterControl,
  RobotInformation,
  RobotServerVersion,
  ShortTrashBin,
  Troubleshooting,
  UpdateRobotSoftware,
  UsageSettings,
  UseOlderAspirateBehavior,
} from './AdvancedTab'
import {
  useRobot,
  useIsFlex,
  useIsRobotBusy,
} from '/app/redux-resources/robots'
import {
  updateSetting,
  getRobotSettings,
  fetchSettings,
} from '/app/redux/robot-settings'
import { RenameRobotSlideout } from './AdvancedTab/AdvancedTabSlideouts/RenameRobotSlideout'
import { DeviceResetSlideout } from './AdvancedTab/AdvancedTabSlideouts/DeviceResetSlideout'
import { DeviceResetModal } from './AdvancedTab/AdvancedTabSlideouts/DeviceResetModal'
import { FactoryModeSlideout } from './AdvancedTab/AdvancedTabSlideouts/FactoryModeSlideout'
import { handleUpdateBuildroot } from './UpdateBuildroot'
import { getRobotSerialNumber, UNREACHABLE } from '/app/redux/discovery'
import { getTopPortalEl } from '/app/App/portal'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'

import type { MouseEventHandler } from 'react'
import type { State, Dispatch } from '/app/redux/types'
import type {
  RobotSettings,
  RobotSettingsField,
} from '/app/redux/robot-settings/types'
import type { ResetConfigRequest } from '/app/redux/robot-admin/types'

interface RobotSettingsAdvancedProps {
  robotName: string
  updateRobotStatus: (isRobotBusy: boolean) => void
}

export function RobotSettingsAdvanced({
  robotName,
  updateRobotStatus,
}: RobotSettingsAdvancedProps): JSX.Element {
  const [
    showRenameRobotSlideout,
    setShowRenameRobotSlideout,
  ] = useState<boolean>(false)
  const [
    showDeviceResetSlideout,
    setShowDeviceResetSlideout,
  ] = useState<boolean>(false)
  const [showDeviceResetModal, setShowDeviceResetModal] = useState<boolean>(
    false
  )
  const [
    showFactoryModeSlideout,
    setShowFactoryModeSlideout,
  ] = useState<boolean>(false)

  const isRobotBusy = useIsRobotBusy({ poll: true })
  const isEstopNotDisengaged = useIsEstopNotDisengaged(robotName)

  const robot = useRobot(robotName)
  const isFlex = useIsFlex(robotName)
  const ipAddress = robot?.ip != null ? robot.ip : ''
  const settings = useSelector<State, RobotSettings>((state: State) =>
    getRobotSettings(state, robotName)
  )
  const reachable = robot?.status !== UNREACHABLE
  const sn = robot?.status != null ? getRobotSerialNumber(robot) : null

  const [isRobotReachable, setIsRobotReachable] = useState<boolean>(reachable)
  const [resetOptions, setResetOptions] = useState<ResetConfigRequest>({})
  const findSettings = (id: string): RobotSettingsField | undefined =>
    settings?.find(s => s.id === id)

  const updateIsExpanded = (
    isExpanded: boolean,
    type: 'deviceReset' | 'renameRobot'
  ): void => {
    if (type === 'deviceReset') {
      setShowDeviceResetSlideout(isExpanded)
    } else {
      setShowRenameRobotSlideout(isExpanded)
    }
  }

  const updateResetStatus = (
    isReachable: boolean,
    options?: ResetConfigRequest
  ): void => {
    if (options != null) setResetOptions(options)
    setShowDeviceResetModal(true)
    setIsRobotReachable(isReachable ?? false)
  }

  const dispatch = useDispatch<Dispatch>()

  useEffect(() => {
    dispatch(fetchSettings(robotName))
  }, [dispatch, robotName])

  useEffect(() => {
    updateRobotStatus(isRobotBusy)
  }, [isRobotBusy, updateRobotStatus])

  return (
    <>
      <Box>
        {showRenameRobotSlideout && (
          <RenameRobotSlideout
            isExpanded={showRenameRobotSlideout}
            onCloseClick={() => {
              setShowRenameRobotSlideout(false)
            }}
            robotName={robotName}
          />
        )}
        {showFactoryModeSlideout && (
          <FactoryModeSlideout
            isExpanded={showFactoryModeSlideout}
            isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            onCloseClick={() => {
              setShowFactoryModeSlideout(false)
            }}
            robotName={robotName}
            sn={sn}
          />
        )}
        {showDeviceResetSlideout && (
          <DeviceResetSlideout
            isExpanded={showDeviceResetSlideout}
            onCloseClick={() => {
              setShowDeviceResetSlideout(false)
            }}
            robotName={robotName}
            updateResetStatus={updateResetStatus}
          />
        )}
        {showDeviceResetModal &&
          createPortal(
            <DeviceResetModal
              closeModal={() => {
                setShowDeviceResetModal(false)
              }}
              isRobotReachable={isRobotReachable}
              robotName={robotName}
              resetOptions={resetOptions}
            />,
            getTopPortalEl()
          )}
        <DisplayRobotName
          robotName={robotName}
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />
        <Divider marginY={SPACING.spacing16} />
        <RobotServerVersion robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <RobotInformation robotName={robotName} />
        {isFlex ? null : (
          <>
            <Divider marginY={SPACING.spacing16} />
            <UsageSettings
              settings={findSettings('enableDoorSafetySwitch')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
          </>
        )}
        <Divider marginY={SPACING.spacing16} />
        <GantryHoming
          settings={findSettings('disableHomeOnBoot')}
          robotName={robotName}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />

        {isFlex ? (
          <>
            <Divider marginY={SPACING.spacing16} />
            <EnableStatusLight
              robotName={robotName}
              isEstopNotDisengaged={isEstopNotDisengaged}
            />
          </>
        ) : null}
        {isFlex ? (
          <>
            <Divider marginY={SPACING.spacing16} />
            <EnableErrorRecoveryMode isRobotBusy={isRobotBusy} />
          </>
        ) : null}
        <Divider marginY={SPACING.spacing16} />
        <OpenJupyterControl
          robotIp={ipAddress}
          isEstopNotDisengaged={isEstopNotDisengaged}
        />
        <Divider marginY={SPACING.spacing16} />
        <UpdateRobotSoftware
          robotName={robotName}
          isRobotBusy={isRobotBusy}
          onUpdateStart={() => {
            handleUpdateBuildroot(robot)
          }}
        />
        <Divider marginY={SPACING.spacing16} />
        {isFlex ? (
          <>
            <FactoryMode
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
              setShowFactoryModeSlideout={setShowFactoryModeSlideout}
              sn={sn}
            />
            <Divider marginY={SPACING.spacing16} />
          </>
        ) : null}
        <Troubleshooting robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <DeviceReset
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />
        {isFlex ? null : (
          <>
            <Divider marginY={SPACING.spacing16} />
            <LegacySettings
              settings={findSettings('deckCalibrationDots')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
            <Divider marginY={SPACING.spacing16} />
            <ShortTrashBin
              settings={findSettings('shortFixedTrash')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
            <Divider marginY={SPACING.spacing16} />
            <UseOlderAspirateBehavior
              settings={findSettings('useOldAspirationFunctions')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
          </>
        )}
      </Box>
    </>
  )
}

interface FeatureFlagToggleProps {
  settingField: RobotSettingsField
  robotName: string
  isRobotBusy: boolean
}

export function FeatureFlagToggle({
  settingField,
  robotName,
  isRobotBusy,
}: FeatureFlagToggleProps): JSX.Element | null {
  const dispatch = useDispatch<Dispatch>()
  const { value, id, title, description } = settingField

  if (id == null) return null

  const handleClick: MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
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
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
