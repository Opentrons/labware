import { connectionStore } from './store'
import {
  addNewRobotsToConnectionStore,
  cleanUpUnreachableRobots,
  getHealthyRobotDataForNotifyConnections,
  closeConnectionsForcefullyFor,
  RobotData,
} from './connect'
import { subscribe } from './subscribe'
import { notifyLog } from './notifyLog'

import type { DiscoveryClientRobot } from '@opentrons/discovery-client'
import type { BrowserWindow } from 'electron'
import type { Action, Dispatch } from '../types'

// Manages MQTT broker connections through a connection store. Broker connections are added or removed based on
// health status changes reported by discovery-client. Because a robot may have several IPs, only the first reported IP
// associated with a robot name is added to the connection store. Subscriptions are handled "lazily", in which a component must
// express interest in a topic before a subscription request is made. Unsubscribe requests only occur if the broker
// sends an "unsubscribe" flag. Pending subs and unsubs are used to prevent unnecessary network and broker load.

export function registerNotify(
  dispatch: Dispatch,
  mainWindow: BrowserWindow
): (action: Action) => unknown {
  if (connectionStore.getBrowserWindow() == null) {
    connectionStore.setBrowserWindow(mainWindow)
  }

  return function handleAction(action: Action) {
    switch (action.type) {
      case 'shell:NOTIFY_SUBSCRIBE':
        return subscribe({
          ...action.payload,
        })
    }
  }
}

export function handleNotificationConnectionsFor(
  robots: DiscoveryClientRobot[]
): RobotData[] {
  const reachableRobots = getHealthyRobotDataForNotifyConnections(robots)
  void cleanUpUnreachableRobots(reachableRobots)
  void addNewRobotsToConnectionStore(reachableRobots)

  return reachableRobots
}

export function closeAllNotifyConnections(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(Error('Failed to close all connections within the time limit.'))
    }, 2000)

    notifyLog.debug('Stopping notify service connections')
    const closeConnections = closeConnectionsForcefullyFor(
      connectionStore.getReachableHosts()
    )
    Promise.all(closeConnections).then(resolve).catch(reject)
  })
}
