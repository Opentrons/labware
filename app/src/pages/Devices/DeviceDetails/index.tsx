import * as React from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import {
  Box,
  Flex,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  OVERFLOW_SCROLL,
  SPACING,
  COLORS,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'

import { useRobot, useSyncRobotClock } from '../../../organisms/Devices/hooks'
import { InstrumentsAndModules } from '../../../organisms/Devices/InstrumentsAndModules'
import { RecentProtocolRuns } from '../../../organisms/Devices/RecentProtocolRuns'
import { RobotOverview } from '../../../organisms/Devices/RobotOverview'
import { getScanning, OPENTRONS_USB } from '../../../redux/discovery'
import { appShellRequestor } from '../../../redux/shell/remote'

import type { DesktopRouteParams } from '../../../App/types'

export function DeviceDetails(): JSX.Element | null {
  const { robotName } = useParams<DesktopRouteParams>()
  const robot = useRobot(robotName)
  const isScanning = useSelector(getScanning)

  useSyncRobotClock(robotName)

  if (robot == null && isScanning) return null

  return robot != null ? (
    <ApiHostProvider
      key={robot.name}
      hostname={robot.ip ?? null}
      requestor={robot?.ip === OPENTRONS_USB ? appShellRequestor : undefined}
    >
      <Box
        minWidth="36rem"
        height="100%"
        overflow={OVERFLOW_SCROLL}
        paddingX={SPACING.spacing16}
        paddingTop={SPACING.spacing16}
        paddingBottom={SPACING.spacing48}
      >
        <Flex
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.white}
          border={`1px solid ${String(COLORS.medGreyEnabled)}`}
          borderRadius="3px"
          flexDirection={DIRECTION_COLUMN}
          marginBottom={SPACING.spacing16}
          paddingX={SPACING.spacing16}
          paddingBottom={SPACING.spacing4}
          width="100%"
        >
          <RobotOverview robotName={robotName} />
          <InstrumentsAndModules robotName={robotName} />
        </Flex>
        <RecentProtocolRuns robotName={robotName} />
      </Box>
    </ApiHostProvider>
  ) : (
    // temp, non-user-facing error screen pending design. only seen in on device mode when a local robot is not discovered
    // prettier-ignore
    /* eslint-disable */
    <div style={{ fontFamily: 'courier', marginLeft: '8px' }}>
      <br />
      <div>
      Can't find robot!
      </div>
      <br />
      <br />
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWX0KNMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKd:o0KOKWMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0l:ldd::kXNWMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNOlcclc:cdxooKWMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWWMMMMMMMMMMMMMMMMMMMMMMWXkc;cl::clc:cxXMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWK00XWMMMMMMMMMMMMMX0KWMMN0dclodc;:cccdKWMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWWXOxk0XWMMMXKOxk0XNKkXMN0d:;:llllc:lkNMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWO; .dOONWO,. .oOONWWNkl;,,colll::dKWMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNd'..,ONk0Xd,.. 'kXk0MNkc;::;;:::::cxXMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNOlcxOKX0xOKxdkkOKX0OXNx:,,:cc:;,';lONMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWx...ckkxxO000kkO00kddO0Oo;''',::;lkXWMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM0,..lKX0OXXXKOx0XXKl..ckxxkd:,';dXWMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWo..cXMX0NMMN0OXMWXl..;x0WMWXOxONMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM0,.,OMK0WMMN00XMMXc.,kWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNl..dWNKXXXKKKNMM0;.lNMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMk'.cXMMMWWWWMMMMk'.dWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK;.,kNWWMMMMMMMWo..xMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWWWWXc..c0XXXXXXXXX0:.'kWWWWWWWWWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWKxxxx:..:dkkkkkkkkkd;';oxxxxxxxx0WMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMXxoodkOO0000000000000000000OdooxXMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkodOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkodOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkodOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkodOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkodOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW0dokNMMMMMMMMMMMMMMMMMMMMMNkooOWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMKkk0NMMMMMMMMMMMMMMMMMMMMMW0kkKWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMWWWWMMMMMMMMMMMMMMMMMMMMMMMWWWWMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
    </div>
  )
}
