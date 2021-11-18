import * as React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Text,
  Flex,
  Icon,
  SPACING_2,
  SPACING_3,
  SPACING_7,
  SIZE_1,
  DIRECTION_ROW,
  ALIGN_START,
  FONT_WEIGHT_SEMIBOLD,
  FONT_SIZE_BODY_1,
  C_WHITE,
  COLOR_SUCCESS,
  COLOR_WARNING,
} from '@opentrons/components'
import { protocolHasModules } from '@opentrons/shared-data'
import { Divider } from '../../../atoms/structure'
import { getConnectedRobot } from '../../../redux/discovery/selectors'
import { getProtocolCalibrationComplete } from '../../../redux/calibration/selectors'
import { useProtocolDetails } from '../../RunDetails/hooks'
import { CollapsibleStep } from './CollapsibleStep'
import { ProceedToRunCta } from './ProceedToRunCta'
import { LabwareSetup } from './LabwareSetup'
import { ModuleSetup } from './ModuleSetup'
import { RobotCalibration } from './RobotCalibration'
import type { State } from '../../../redux/types'

const ROBOT_CALIBRATION_STEP_KEY = 'robot_calibration_step' as const
const MODULE_SETUP_KEY = 'module_setup_step' as const
const LABWARE_SETUP_KEY = 'labware_setup_step' as const

const INITIAL_EXPAND_DELAY_MS = 700

export type StepKey =
  | typeof ROBOT_CALIBRATION_STEP_KEY
  | typeof MODULE_SETUP_KEY
  | typeof LABWARE_SETUP_KEY

export function RunSetupCard(): JSX.Element | null {
  const { t } = useTranslation('protocol_setup')
  const { protocolData } = useProtocolDetails()
  const robot = useSelector((state: State) => getConnectedRobot(state))
  const robotName = robot?.name != null ? robot?.name : ''
  const calibrationStatus = useSelector((state: State) => {
    return getProtocolCalibrationComplete(state, robotName)
  })
  const [expandedStepKey, setExpandedStepKey] = React.useState<StepKey | null>(
    null
  )
  const [stepsKeysInOrder, setStepKeysInOrder] = React.useState<StepKey[]>(
    [ROBOT_CALIBRATION_STEP_KEY, LABWARE_SETUP_KEY]
  )
  React.useEffect(() => {
    if (protocolHasModules(protocolData as JsonProtocolFile)) {
      setStepKeysInOrder([ ROBOT_CALIBRATION_STEP_KEY, MODULE_SETUP_KEY, LABWARE_SETUP_KEY ])
    }
    let initialExpandedStepKey: StepKey = ROBOT_CALIBRATION_STEP_KEY
    if (calibrationStatus.complete) {
      initialExpandedStepKey = stepsKeysInOrder[stepsKeysInOrder.findIndex(v => v === ROBOT_CALIBRATION_STEP_KEY) + 1]
    }
    const initialExpandTimer = setTimeout(() => setExpandedStepKey(initialExpandedStepKey), INITIAL_EXPAND_DELAY_MS);
    return () => clearTimeout(initialExpandTimer);
  }, [protocolData])

  if (
    protocolData == null ||
    robot == null ||
    ('metadata' in protocolData && Object.keys(protocolData).length === 1)
  )
    return null

  const StepDetailMap: Record<
    StepKey,
    { stepInternals: JSX.Element; description: string }
  > = {
    [ROBOT_CALIBRATION_STEP_KEY]: {
      stepInternals: (
        <RobotCalibration
          robot={robot}
          nextStep={stepsKeysInOrder[stepsKeysInOrder.findIndex(v => v === ROBOT_CALIBRATION_STEP_KEY) + 1]}
          expandStep={nextStep => setExpandedStepKey(nextStep)}
          calibrationStatus={calibrationStatus}
        />
      ),
      description: t(`${ROBOT_CALIBRATION_STEP_KEY}_description`),
    },
    [MODULE_SETUP_KEY]: {
      stepInternals: (
        <ModuleSetup
          expandLabwareSetupStep={() => setExpandedStepKey(LABWARE_SETUP_KEY)}
          robotName={robot.name}
        />
      ),
      description: t(`${MODULE_SETUP_KEY}_description`, {
        count:
          'modules' in protocolData
            ? Object.keys(protocolData.modules).length
            : 0,
      }),
    },
    [LABWARE_SETUP_KEY]: {
      stepInternals: <LabwareSetup />,
      description: t(`${LABWARE_SETUP_KEY}_description`),
    },
  }
  return (
    <Card
      width="100%"
      marginTop={SPACING_3}
      paddingY={SPACING_3}
      backgroundColor={C_WHITE}
    >
      <Text
        as="h2"
        paddingX={SPACING_3}
        fontWeight={FONT_WEIGHT_SEMIBOLD}
        id={'RunSetupCard_setupForRun'}
      >
        {t('setup_for_run')}
      </Text>
      {stepsKeysInOrder.map((stepKey, index) => (
        <React.Fragment key={stepKey}>
          <Divider marginY={SPACING_3} />
          <CollapsibleStep
            expanded={stepKey === expandedStepKey}
            label={t('step', { index: index + 1 })}
            title={t(`${stepKey}_title`)}
            description={StepDetailMap[stepKey].description}
            toggleExpanded={() =>
              stepKey === expandedStepKey
                ? setExpandedStepKey(null)
                : setExpandedStepKey(stepKey)
            }
            rightAlignedNode={
              stepKey === ROBOT_CALIBRATION_STEP_KEY ? (
                <Flex
                  flexDirection={DIRECTION_ROW}
                  alignItems={ALIGN_START}
                  marginLeft={SPACING_7}
                >
                  <Icon
                    size={SIZE_1}
                    color={
                      calibrationStatus.complete ? COLOR_SUCCESS : COLOR_WARNING
                    }
                    marginRight={SPACING_2}
                    name={
                      calibrationStatus.complete
                        ? 'check-circle'
                        : 'alert-circle'
                    }
                    id={'RunSetupCard_calibrationIcon'}
                  />
                  <Text
                    fontSize={FONT_SIZE_BODY_1}
                    id={'RunSetupCard_calibrationText'}
                  >
                    {calibrationStatus.complete
                      ? t('calibration_ready')
                      : t('calibration_needed')}
                  </Text>
                </Flex>
              ) : null
            }
          >
            {StepDetailMap[stepKey].stepInternals}
          </CollapsibleStep>
        </React.Fragment>
      ))}
      <Divider marginY={SPACING_3} />
      <ProceedToRunCta />
    </Card>
  )
}
