import { Portal } from '../../../App/portal'
import { ToggleButton } from '../../../atoms/buttons'
import { Divider } from '../../../atoms/structure'
import { StyledText } from '../../../atoms/text'
import { UNREACHABLE } from '../../../redux/discovery'
import type { ResetConfigRequest } from '../../../redux/robot-admin/types'
import {
  updateSetting,
  getRobotSettings,
  fetchSettings,
} from '../../../redux/robot-settings'
import type {
  RobotSettings,
  RobotSettingsField,
} from '../../../redux/robot-settings/types'
import type { State, Dispatch } from '../../../redux/types'
import { useIsOT3, useIsRobotBusy, useRobot } from '../hooks'
import {
  DisableHoming,
  DisplayRobotName,
  FactoryReset,
  LegacySettings,
  OpenJupyterControl,
  RobotInformation,
  RobotServerVersion,
  ShortTrashBin,
  Troubleshooting,
  UpdateRobotSoftware,
  UseOlderAspirateBehavior,
  UseOlderProtocol,
} from './AdvancedTab'
import { FactoryResetModal } from './AdvancedTab/AdvancedTabSlideouts/FactoryResetModal'
import { FactoryResetSlideout } from './AdvancedTab/AdvancedTabSlideouts/FactoryResetSlideout'
import { RenameRobotSlideout } from './AdvancedTab/AdvancedTabSlideouts/RenameRobotSlideout'
import { UsageSettings } from './AdvancedTab/UsageSettings'
import { UpdateBuildroot } from './UpdateBuildroot'
import {
  Box,
  SPACING,
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  TYPOGRAPHY,
} from '@opentrons/components'
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'

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
  ] = React.useState<boolean>(false)
  const [
    showFactoryResetSlideout,
    setShowFactoryResetSlideout,
  ] = React.useState<boolean>(false)
  const [
    showFactoryResetModal,
    setShowFactoryResetModal,
  ] = React.useState<boolean>(false)
  const [
    showSoftwareUpdateModal,
    setShowSoftwareUpdateModal,
  ] = React.useState<boolean>(false)

  const isRobotBusy = useIsRobotBusy({ poll: true })

  const robot = useRobot(robotName)
  const isOT3 = useIsOT3(robotName)
  const ipAddress = robot?.ip != null ? robot.ip : ''
  const settings = useSelector<State, RobotSettings>((state: State) =>
    getRobotSettings(state, robotName)
  )
  const reachable = robot?.status !== UNREACHABLE

  const [isRobotReachable, setIsRobotReachable] = React.useState<boolean>(
    reachable
  )
  const [resetOptions, setResetOptions] = React.useState<ResetConfigRequest>({})
  const findSettings = (id: string): RobotSettingsField | undefined =>
    settings?.find(s => s.id === id)

  const updateIsExpanded = (
    isExpanded: boolean,
    type: 'factoryReset' | 'renameRobot'
  ): void => {
    if (type === 'factoryReset') {
      setShowFactoryResetSlideout(isExpanded)
    } else {
      setShowRenameRobotSlideout(isExpanded)
    }
  }

  const updateResetStatus = (
    isReachable: boolean,
    options?: ResetConfigRequest
  ): void => {
    if (options != null) setResetOptions(options)
    setShowFactoryResetModal(true)
    setIsRobotReachable(isReachable ?? false)
  }

  const dispatch = useDispatch<Dispatch>()

  React.useEffect(() => {
    dispatch(fetchSettings(robotName))
  }, [dispatch, robotName])

  React.useEffect(() => {
    updateRobotStatus(isRobotBusy)
  }, [isRobotBusy, updateRobotStatus])

  return (
    <>
      {showSoftwareUpdateModal &&
      robot != null &&
      robot.status !== UNREACHABLE ? (
        <UpdateBuildroot
          robot={robot}
          close={() => setShowSoftwareUpdateModal(false)}
        />
      ) : null}
      <Box>
        {showRenameRobotSlideout && (
          <RenameRobotSlideout
            isExpanded={showRenameRobotSlideout}
            onCloseClick={() => setShowRenameRobotSlideout(false)}
            robotName={robotName}
          />
        )}
        {showFactoryResetSlideout && (
          <FactoryResetSlideout
            isExpanded={showFactoryResetSlideout}
            onCloseClick={() => setShowFactoryResetSlideout(false)}
            robotName={robotName}
            updateResetStatus={updateResetStatus}
          />
        )}
        {showFactoryResetModal && (
          <Portal level="top">
            <FactoryResetModal
              closeModal={() => setShowFactoryResetModal(false)}
              isRobotReachable={isRobotReachable}
              robotName={robotName}
              resetOptions={resetOptions}
            />
          </Portal>
        )}
        <DisplayRobotName
          robotName={robotName}
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy}
        />
        <Divider marginY={SPACING.spacing16} />
        <RobotServerVersion robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <RobotInformation robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <UsageSettings
          settings={findSettings('enableDoorSafetySwitch')}
          robotName={robotName}
          isRobotBusy={isRobotBusy}
        />
        <Divider marginY={SPACING.spacing16} />
        <DisableHoming
          settings={findSettings('disableHomeOnBoot')}
          robotName={robotName}
          isRobotBusy={isRobotBusy}
        />
        <Divider marginY={SPACING.spacing16} />
        <OpenJupyterControl robotIp={ipAddress} />
        <Divider marginY={SPACING.spacing16} />
        <UpdateRobotSoftware
          robotName={robotName}
          isRobotBusy={isRobotBusy}
          onUpdateStart={() => setShowSoftwareUpdateModal(true)}
        />
        <Troubleshooting robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <FactoryReset
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy}
        />
        {isOT3 ? null : (
          <>
            <Divider marginY={SPACING.spacing16} />
            <UseOlderProtocol
              settings={findSettings('disableFastProtocolUpload')}
              robotName={robotName}
              isRobotBusy={isRobotBusy}
            />
            <Divider marginY={SPACING.spacing16} />
            <LegacySettings
              settings={findSettings('deckCalibrationDots')}
              robotName={robotName}
              isRobotBusy={isRobotBusy}
            />
            <Divider marginY={SPACING.spacing16} />
            <ShortTrashBin
              settings={findSettings('shortFixedTrash')}
              robotName={robotName}
              isRobotBusy={isRobotBusy}
            />
            <Divider marginY={SPACING.spacing16} />
            <UseOlderAspirateBehavior
              settings={findSettings('useOldAspirationFunctions')}
              robotName={robotName}
              isRobotBusy={isRobotBusy}
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

  const handleClick: React.MouseEventHandler<Element> = () => {
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
        <StyledText css={TYPOGRAPHY.pSemiBold} paddingBottom={SPACING.spacing4}>
          {title}
        </StyledText>
        <StyledText as="p">{description}</StyledText>
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
