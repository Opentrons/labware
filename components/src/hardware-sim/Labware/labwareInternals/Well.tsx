import { memo } from 'react'
import { INTERACTIVE_WELL_DATA_ATTRIBUTE } from '@opentrons/shared-data'
import { COLORS } from '../../../helix-design-system'

import type { CSSProperties, MouseEvent, MemoExoticComponent } from 'react'
import type { LabwareWell } from '@opentrons/shared-data'
import type { WellMouseEvent } from './types'
import type { StyleProps } from '../../../primitives'
export interface WellProps extends StyleProps {
  /** Well Name (eg 'A1') */
  wellName: string
  /** well object from labware definition */
  well: LabwareWell
  stroke: CSSProperties['stroke']
  strokeWidth: CSSProperties['strokeWidth']
  fill: CSSProperties['fill']
  /** Optional callback, called with WellMouseEvent args onMouseOver */
  onMouseEnterWell?: (e: WellMouseEvent) => unknown
  onMouseLeaveWell?: (e: WellMouseEvent) => unknown
  /** Provides well data attribute */
  isInteractive?: boolean
}

export function WellComponent(props: WellProps): JSX.Element {
  const {
    well,
    wellName,
    stroke = COLORS.black90,
    strokeWidth = 1,
    fill,
    onMouseEnterWell,
    onMouseLeaveWell,
    isInteractive = onMouseEnterWell != null || onMouseLeaveWell != null,
  } = props
  const { x, y } = well

  const wellFill = fill ?? COLORS.white

  const pointerEvents: CSSProperties['pointerEvents'] = isInteractive
    ? 'auto'
    : 'none'
  const commonProps = {
    [INTERACTIVE_WELL_DATA_ATTRIBUTE]: isInteractive ? wellName : undefined,
    onMouseEnter:
      onMouseEnterWell != null
        ? (event: MouseEvent) => onMouseEnterWell({ wellName, event })
        : undefined,
    onMouseLeave:
      onMouseLeaveWell != null
        ? (event: MouseEvent) => onMouseLeaveWell({ wellName, event })
        : undefined,
    style: { pointerEvents, stroke, strokeWidth, fill: wellFill },
  }

  if (well.shape === 'circular') {
    const { diameter } = well
    const radius = diameter / 2
    return <circle {...commonProps} cx={x} cy={y} r={radius} />
  }

  const { xDimension, yDimension } = well
  return (
    <rect
      {...commonProps}
      x={x - xDimension / 2}
      y={y - yDimension / 2}
      width={xDimension}
      height={yDimension}
    />
  )
}

export const Well: MemoExoticComponent<typeof WellComponent> = memo(
  WellComponent
)
