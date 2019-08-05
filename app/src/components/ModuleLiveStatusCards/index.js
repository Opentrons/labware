// @flow
import * as React from 'react'
import { connect } from 'react-redux'

import { getConnectedRobot } from '../../discovery'
import {
  fetchModules,
  getModulesState,
  setTargetTemp,
  type ModuleCommandRequest,
} from '../../robot-api'

import { IntervalWrapper } from '@opentrons/components'

import type { State, Dispatch } from '../../types'
import type { TempDeckModule } from '../../robot-api'
import type { Robot } from '../../discovery'

import TempDeckCard from './TempDeckCard'
import MagDeckCard from './MagDeckCard'
import ThermocyclerCard from './ThermocyclerCard'

const POLL_TEMPDECK_INTERVAL_MS = 1000
const LIVE_STATUS_MODULES = ['magdeck', 'tempdeck', 'thermocycler']

type SP = {|
  _robot: ?Robot,
  liveStatusModules: Array<TempDeckModule | ThermocyclerModule>,
|}

type DP = {|
  _fetchModules: (_robot: Robot) => mixed,
  _sendModuleCommand: (
    _robot: Robot,
    serial: string,
    request: ModuleCommandRequest
  ) => mixed,
|}

type Props = {|
  liveStatusModules: Array<TempDeckModule | ThermocyclerModule>,
  fetchModules: () => mixed,
  sendModuleCommand: (serial: string, request: ModuleCommandRequest) => mixed,
|}

const ModuleLiveStatusCards = (props: Props) => {
  const { liveStatusModules, fetchModules, sendModuleCommand } = props
  // if (liveStatusModules.length === 0) return null

  const stubs = [
    {
      serial: 'dummySerial',
      status: 'idle',
      name: 'thermocycler',
      data: {
        lidTemp: 30,
        currentTemp: 40,
        targetTemp: 90,
        lidTarget: 22,
        totalCycleCount: 10,
        currentCycleIndex: 1,
        totalStepCount: 3,
        currentStepIndex: 1,
      },
    },
  ]
  return (
    <IntervalWrapper
      refresh={fetchModules}
      interval={POLL_TEMPDECK_INTERVAL_MS}
    >
      {/* {liveStatusModules.map(module => { */}
      {stubs.map(module => {
        switch (module.name) {
          case 'tempdeck':
            return (
              <TempDeckCard
                key={module.serial}
                module={module}
                sendModuleCommand={sendModuleCommand}
              />
            )
          case 'thermocycler':
            return (
              <ThermocyclerCard
                key={module.serial}
                module={module}
                sendModuleCommand={sendModuleCommand}
              />
            )
          case 'magdeck':
            return <MagDeckCard key={module.serial} module={module} />
          default:
            return null
        }
      })}
    </IntervalWrapper>
  )
}

function mapStateToProps(state: State): SP {
  const _robot = getConnectedRobot(state)
  const modules = _robot ? getModulesState(state, _robot.name) : []

  const liveStatusModules = modules.filter(m =>
    LIVE_STATUS_MODULES.includes(m.name)
  )

  return {
    _robot,
    liveStatusModules,
  }
}

function mapDispatchToProps(dispatch: Dispatch): DP {
  return {
    _fetchModules: _robot => dispatch(fetchModules(_robot)),
    _sendModuleCommand: (_robot, serial, request) =>
      dispatch(setTargetTemp(_robot, serial, request)),
  }
}

function mergeProps(stateProps: SP, dispatchProps: DP): Props {
  const { _fetchModules, _sendModuleCommand } = dispatchProps
  const { _robot, liveStatusModules } = stateProps

  return {
    liveStatusModules,
    fetchModules: () => _robot && _fetchModules(_robot),
    sendModuleCommand: (serial, request) =>
      _robot && _sendModuleCommand(_robot, serial, request),
  }
}

export default connect<Props, {||}, SP, DP, State, Dispatch>(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(ModuleLiveStatusCards)
