import { useEffect, useRef } from 'react'

import type { MutableRefObject } from 'react'
/**
 * React hook to call a function on an interval; copied from:
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * @template T (type of the input value)
 * @param {() => unknown} callback (function to call on an interval)
 * @param {number | null} delay (interval delay, or null to stop interval)
 * @param {boolean} [immediate=false] (trigger the callback immediately before starting the interval)
 * @returns {void}
 */
export function useInterval(
  callback: () => unknown,
  delay: number | null,
  immediate: boolean = false
): void {
  const savedCallback: MutableRefObject<(() => unknown) | undefined> = useRef()

  // remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // set up the interval
  useEffect(() => {
    const tick = (): unknown => savedCallback.current && savedCallback.current()
    if (delay !== null && delay > 0) {
      if (immediate) tick()
      const id = setInterval(tick, delay)
      return () => {
        clearInterval(id)
      }
    }
  }, [delay, immediate])
}
