/* eslint-disable @typescript-eslint/no-dynamic-delete */
import mqtt from 'mqtt'

import { createLogger } from './log'

import type { BrowserWindow } from 'electron'
import type { NotifyTopic } from '@opentrons/app/src/redux/shell/types'
import type { Action, Dispatch } from './types'

// TODO(jh, 2024-01-22): refactor the ODD connection store to manage a single client only.

// Manages MQTT broker connections via a connection store, establishing a connection to the broker only if a connection does not
// already exist, and disconnects from the broker when the app is not subscribed to any topics for the given broker.
// A redundant connection to the same broker results in the older connection forcibly closing, which we want to avoid.
// However, redundant subscriptions are permitted and result in the broker sending the retained message for that topic.
// To mitigate redundant connections, the connection manager eagerly adds the host, removing the host if the connection fails.

interface ConnectionStore {
  [hostname: string]: {
    client: mqtt.MqttClient | null
    subscriptions: Record<NotifyTopic, number>
  }
}

const connectionStore: ConnectionStore = {}
const log = createLogger('notify')
// MQTT is somewhat particular about the clientId format and will connect erratically if an unexpected string is supplied.
// This clientId is derived from the mqttjs library.
const CLIENT_ID = 'odd-' + Math.random().toString(16).slice(2, 8)

const connectOptions: mqtt.IClientOptions = {
  clientId: CLIENT_ID,
  port: 1883,
  keepalive: 60,
  protocolVersion: 5,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true,
}

/**
 * @property {number} qos: "Quality of Service", "at least once". Because we use React Query, which does not trigger
  a render update event if duplicate data is received, we can avoid the additional overhead 
  to guarantee "exactly once" delivery. 
 * @property {number} rh: "Retain Handling" enabled. Upon successful subscription, 
  the client will receive the most recent message held by the broker if one is availble.
 */
const subscribeOptions: mqtt.IClientSubscribeOptions = {
  qos: 2,
}

export function registerNotify(
  dispatch: Dispatch,
  mainWindow: BrowserWindow
): (action: Action) => unknown {
  return function handleAction(action: Action) {
    switch (action.type) {
      case 'shell:NOTIFY_SUBSCRIBE':
        return subscribe({
          ...action.payload,
          browserWindow: mainWindow,
          hostname: '127.0.0.1',
        })

      case 'shell:NOTIFY_UNSUBSCRIBE':
        return unsubscribe({
          ...action.payload,
          browserWindow: mainWindow,
          hostname: '127.0.0.1',
        })
    }
  }
}

interface NotifyParams {
  browserWindow: BrowserWindow
  hostname: string
  topic: NotifyTopic
}

function subscribe(notifyParams: NotifyParams): Promise<void> {
  const { hostname, topic, browserWindow } = notifyParams
  // true if no subscription (and therefore connection) to host exists
  if (connectionStore[hostname] == null) {
    connectionStore[hostname] = {
      client: null,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      subscriptions: { [topic]: 1 } as Record<NotifyTopic, number>,
    }
    return connectAsync(`mqtt://${hostname}`)
      .then(client => {
        log.info(`Successfully connected to ${hostname}`)
        connectionStore[hostname].client = client
        establishListeners({ ...notifyParams, client })
        return new Promise<void>(() => {
          client.subscribe(topic, subscribeOptions, (error, result) => {
            if (error != null) {
              log.warn(`Failed to subscribe on ${hostname} to topic: ${topic}`)
              browserWindow.webContents.send(
                'notify',
                `${hostname}:${topic}:ECONNFAILED`
              )
              handleDecrementSubscriptionCount(hostname, topic)
            } else {
              log.info(
                `Successfully subscribed on ${hostname} to topic: ${topic}`
              )
            }
          })
        })
      })
      .catch(() => {
        log.warn(`Failed to connect to ${hostname}`)
        browserWindow.webContents.send(
          'notify',
          `${hostname}:${topic}:ECONNFAILED`
        )
        if (hostname in connectionStore) delete connectionStore[hostname]
      })
  }
  // true if a connection AND subscription to host already exists.
  else {
    connectionStore[hostname].subscriptions[topic] += 1
    const { client } = connectionStore[hostname]
    return new Promise<void>(() => {
      client?.subscribe(topic, subscribeOptions)
    })
  }
}

function unsubscribe(notifyParams: NotifyParams): Promise<void> {
  const { hostname, topic } = notifyParams
  return new Promise<void>(() => {
    if (hostname in connectionStore) {
      const { client } = connectionStore[hostname]
      client?.unsubscribe(topic, {}, (error, result) => {
        if (error != null) {
          log.warn(`Failed to unsubscribe on ${hostname} from topic: ${topic}`)
        } else {
          log.info(
            `Successfully unsubscribed on ${hostname} from topic: ${topic}`
          )
          handleDecrementSubscriptionCount(hostname, topic)
        }
      })
    } else {
      log.info(
        `Attempted to unsubscribe from unconnected hostname: ${hostname}`
      )
    }
  })
}

function connectAsync(brokerURL: string): Promise<mqtt.Client> {
  const client = mqtt.connect(brokerURL, connectOptions)

  return new Promise((resolve, reject) => {
    // Listeners added to client to trigger promise resolution
    const promiseResolutionListeners: {
      [key: string]: (...args: any[]) => void
    } = {
      connect: () => {
        removePromiseResolutionListeners()
        return resolve(client)
      },
      error: (error: Error | string) => {
        removePromiseResolutionListeners()
        const clientEndPromise = new Promise((resolve, reject) =>
          client.end(true, {}, () => resolve(error))
        )
        return clientEndPromise.then(() => reject(error))
      },
      end: () => promiseResolutionListeners.error("Couldn't connect to server"),
    }

    function removePromiseResolutionListeners(): void {
      Object.keys(promiseResolutionListeners).forEach(eventName => {
        client.removeListener(eventName, promiseResolutionListeners[eventName])
      })
    }

    Object.keys(promiseResolutionListeners).forEach(eventName => {
      client.on(eventName, promiseResolutionListeners[eventName])
    })
  })
}

function handleDecrementSubscriptionCount(
  hostname: string,
  topic: NotifyTopic
): void {
  const { client, subscriptions } = connectionStore[hostname]
  if (topic in subscriptions) {
    subscriptions[topic] -= 1
    if (subscriptions[topic] <= 0) {
      delete subscriptions[topic]
    }
  }

  if (Object.keys(subscriptions).length <= 0) {
    client?.end()
  }
}

interface ListenerParams {
  client: mqtt.MqttClient
  browserWindow: BrowserWindow
  topic: NotifyTopic
  hostname: string
}

function establishListeners({
  client,
  browserWindow,
  hostname,
  topic,
}: ListenerParams): void {
  client.on('message', (topic, message, packet) => {
    browserWindow.webContents.send(
      'notify',
      `${hostname}:${topic}:${message.toString()}`
    )
    log.debug(`Received message: ${hostname}:${topic}:${message.toString()}`)
  })

  client.on('reconnect', () => {
    log.info(`Attempting to reconnect to ${hostname}`)
  })
  // handles transport layer errors only
  client.on('error', error => {
    log.warn(`Error - ${error.name}: ${error.message}`)
    browserWindow.webContents.send('notify', `${hostname}:${topic}:ECONNFAILED`)
    client.end()
  })

  client.on('end', () => {
    log.info(`Closed connection to ${hostname}`)
    if (hostname in connectionStore) delete connectionStore[hostname]
  })

  client.on('disconnect', packet =>
    log.warn(
      `Disconnected from ${hostname} with code ${
        packet.reasonCode ?? 'undefined'
      }`
    )
  )
}

export function closeAllNotifyConnections(): Promise<unknown[]> {
  log.debug('Stopping notify service connections')
  const closeConnections = Object.values(connectionStore).map(({ client }) => {
    return new Promise((resolve, reject) => {
      client?.end(true, {}, () => resolve(null))
    })
  })
  return Promise.all(closeConnections)
}
