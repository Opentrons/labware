import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useCloseOnOutsideClick(
  ref: RefObject<HTMLInputElement>,
  onClose: () => void
): void {
  const handleClick = (e: MouseEvent): void => {
    // @ts-expect-error node and event target types are mismatched
    if (ref.current != null && !ref.current.contains(e.target)) {
      onClose()
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  })
}
