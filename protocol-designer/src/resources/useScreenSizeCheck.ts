import { useState, useEffect } from 'react'

const BREAKPOINT_HEIGHT = 650
const BREAKPOINT_WIDTH = 768

export const useScreenSizeCheck = (): boolean => {
  const [isValidSize, setValidSize] = useState<boolean>(
    window.innerWidth > BREAKPOINT_WIDTH &&
      window.innerHeight > BREAKPOINT_HEIGHT
  )

  useEffect(() => {
    const handleResize = (): void => {
      setValidSize(
        window.innerWidth > BREAKPOINT_WIDTH &&
          window.innerHeight > BREAKPOINT_HEIGHT
      )
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isValidSize
}
