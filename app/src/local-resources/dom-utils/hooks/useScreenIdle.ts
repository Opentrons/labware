import { useState, useEffect, useRef } from 'react'
import { SLEEP_NEVER_MS } from '/app/local-resources/dom-utils'

const USER_EVENTS: Array<keyof DocumentEventMap> = [
  'click',
  'dblclick',
  'keypress',
  'mousemove',
  'pointerover',
  'pointerenter',
  'pointerdown',
  'pointermove',
  'pointerout',
  'pointerleave',
  'scroll',
  'touchmove',
  'touchstart',
  'mousedown',
]

const DEFAULT_OPTIONS = {
  events: USER_EVENTS,
  initialState: true,
}

/**
 * React hook to check user events
 *
 * @param {number} idleTime (idle time)
 * @param {object} options (events that the app need to check, initialState: initial state true => idle)
 * @returns {boolean}
 */
export function useScreenIdle(
  idleTime: number,
  options?: Partial<{
    events: Array<keyof DocumentEventMap>
    initialState: boolean
  }>
): boolean {
  const { events, initialState } = { ...DEFAULT_OPTIONS, ...options }
  const [idle, setIdle] = useState<boolean>(initialState)
  const idleTimer = useRef<number>()

  useEffect(() => {
    const handleEvents = (): void => {
      setIdle(false)

      if (idleTimer.current != null) {
        window.clearTimeout(idleTimer.current)
      }

      // See RQA-3813 and associated PR.
      if (idleTime !== SLEEP_NEVER_MS) {
        idleTimer.current = window.setTimeout(() => {
          setIdle(true)
        }, idleTime)
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleEvents)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleEvents)
      })
    }
  }, [events, idleTime])

  return idle
}
