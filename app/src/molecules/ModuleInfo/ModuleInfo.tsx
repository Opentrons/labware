import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  RobotCoordsForeignObject,
  SPACING,
  TYPOGRAPHY,
  LegacyStyledText,
} from '@opentrons/components'
import {
  getModuleDisplayName,
  getModuleDef2,
  MAGNETIC_BLOCK_V1,
} from '@opentrons/shared-data'

import { useRunHasStarted } from '/app/resources/runs'
import type { ModuleModel } from '@opentrons/shared-data'
import type { PhysicalPort } from '/app/redux/modules/api-types'

export interface ModuleInfoProps {
  moduleModel: ModuleModel
  isAttached: boolean
  physicalPort: PhysicalPort | null
  runId?: string
}

export const ModuleInfo = (props: ModuleInfoProps): JSX.Element => {
  const { moduleModel, physicalPort, isAttached, runId = null } = props
  const moduleDef = getModuleDef2(moduleModel)
  const {
    xDimension,
    yDimension,
    labwareInterfaceYDimension,
    labwareInterfaceXDimension,
  } = moduleDef.dimensions
  const { t } = useTranslation('protocol_setup')

  const runHasStarted = useRunHasStarted(runId)
  let connectionStatus = t('no_usb_port_yet')
  if (moduleModel === MAGNETIC_BLOCK_V1) {
    connectionStatus = t('no_usb_required')
  }
  if (physicalPort === null && isAttached) {
    connectionStatus = t('usb_connected_no_port_info')
  } else if (physicalPort != null && isAttached) {
    const portDisplay =
      physicalPort?.hubPort != null
        ? `${physicalPort.port}.${physicalPort.hubPort}`
        : physicalPort?.port
    connectionStatus = t('usb_port_connected', { port: portDisplay })
  }

  return (
    <RobotCoordsForeignObject
      x={0}
      y={0}
      height={labwareInterfaceYDimension ?? yDimension}
      width={labwareInterfaceXDimension ?? xDimension}
      flexProps={{
        padding: SPACING.spacing16,
        backgroundColor: `${COLORS.white}${COLORS.opacity90HexCode}`,
      }}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing2}
        justifyContent={JUSTIFY_CENTER}
      >
        {!runHasStarted && moduleModel !== MAGNETIC_BLOCK_V1 ? (
          <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
            <Icon
              name={isAttached ? 'ot-check' : 'alert-circle'}
              color={isAttached ? COLORS.green50 : COLORS.yellow50}
              key="icon"
              size="10px"
              marginRight={SPACING.spacing4}
            />

            <LegacyStyledText
              color={COLORS.grey50}
              fontSize={TYPOGRAPHY.fontSizeCaption}
            >
              {!isAttached ? t('module_not_connected') : t('module_connected')}
            </LegacyStyledText>
          </Flex>
        ) : null}
        <LegacyStyledText
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          color={COLORS.grey50}
          fontSize={TYPOGRAPHY.fontSizeLabel}
        >
          {getModuleDisplayName(moduleModel)}
        </LegacyStyledText>
        <LegacyStyledText
          color={COLORS.grey50}
          fontSize={TYPOGRAPHY.fontSizeH6}
          fontStyle={
            runHasStarted
              ? TYPOGRAPHY.fontStyleNormal
              : TYPOGRAPHY.fontStyleItalic
          }
        >
          {runHasStarted
            ? t('connection_info_not_available')
            : connectionStatus}
        </LegacyStyledText>
      </Flex>
    </RobotCoordsForeignObject>
  )
}
