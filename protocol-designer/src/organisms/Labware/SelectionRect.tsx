import { useEffect, useRef, useState } from 'react'
import { css } from 'styled-components'

import type { ReactNode, MouseEventHandler } from 'react'
import type { DragRect, GenericRect } from '../../collision-types'

interface SelectionRectProps {
  onSelectionMove?: (e: MouseEvent, arg: GenericRect) => void
  onSelectionDone?: (e: MouseEvent, arg: GenericRect) => void
  svg?: boolean // set true if this is an embedded SVG
  children?: ReactNode
  originXOffset?: number
  originYOffset?: number
}

export function SelectionRect(props: SelectionRectProps): JSX.Element {
  const {
    onSelectionMove,
    onSelectionDone,
    svg,
    children,
    originXOffset = 0,
    originYOffset = 0,
  } = props
  const [positions, setPositions] = useState<DragRect | null>(null)
  const parentRef = useRef<HTMLElement | SVGElement | null>(null)
  const renderRect = (args: DragRect): ReactNode => {
    const { xStart, yStart, xDynamic, yDynamic } = args
    const left = Math.min(xStart, xDynamic)
    const top = Math.min(yStart, yDynamic)
    const width = Math.abs(xDynamic - xStart)
    const height = Math.abs(yDynamic - yStart)
    if (svg) {
      if (!parentRef.current) {
        return null
      }

      const clientRect: DOMRect = parentRef.current.getBoundingClientRect()
      const viewBox: {
        width: number
        height: number
      } = parentRef.current.closest('svg')?.viewBox?.baseVal ?? {
        width: 0,
        height: 0,
      }
      const xScale = viewBox.width / clientRect.width
      const yScale = viewBox.height / clientRect.height

      return (
        <rect
          x={(left - clientRect.left) * xScale - originXOffset}
          y={(top - clientRect.top) * yScale - originYOffset}
          width={width * xScale}
          height={height * yScale}
          css={css`
            fill: #5fd8ee alpha(0.3);
            stroke: #5fd8ee;
            stroke-width: 0.4;
          `}
        />
      )
    }

    return (
      <div
        css={css`
          background-color: #5fd8ee alpha(0.3);
          position: fixed;
          z-index: 1000;
          border-radius: 0;
          border: 1px solid #5fd8ee;
        `}
        style={{
          left: left + 'px',
          top: top + 'px',
          width: width + 'px',
          height: height + 'px',
        }}
      />
    )
  }

  const getRect = (args: DragRect): GenericRect => {
    const { xStart, yStart, xDynamic, yDynamic } = args
    return {
      x0: Math.min(xStart, xDynamic),
      x1: Math.max(xStart, xDynamic),
      y0: Math.min(yStart, yDynamic),
      y1: Math.max(yStart, yDynamic),
    }
  }

  const handleDrag = (e: MouseEvent): void => {
    setPositions(prevPositions => {
      if (prevPositions) {
        const nextRect = {
          ...prevPositions,
          xDynamic: e.clientX,
          yDynamic: e.clientY,
        }
        const rect = getRect(nextRect)
        onSelectionMove && onSelectionMove(e, rect)

        return nextRect
      }
      return prevPositions
    })
  }

  const handleMouseUp = (e: MouseEvent): void => {
    if (!(e instanceof MouseEvent)) {
      return
    }
    const finalRect = positions && getRect(positions)
    setPositions(prevPositions => {
      return prevPositions === positions ? null : prevPositions
    })
    // call onSelectionDone callback with {x0, x1, y0, y1} of final selection rectangle
    onSelectionDone && finalRect && onSelectionDone(e, finalRect)
  }

  const handleMouseDown: MouseEventHandler = e => {
    setPositions({
      xStart: e.clientX,
      xDynamic: e.clientX,
      yStart: e.clientY,
      yDynamic: e.clientY,
    })
  }

  useEffect(() => {
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleDrag, handleMouseUp])

  return svg ? (
    <g
      onMouseDown={handleMouseDown}
      ref={ref => {
        parentRef.current = ref
      }}
    >
      {children}
      {positions && renderRect(positions)}
    </g>
  ) : (
    <div
      onMouseDown={handleMouseDown}
      ref={ref => {
        parentRef.current = ref
      }}
    >
      {positions && renderRect(positions)}
      {children}
    </div>
  )
}
