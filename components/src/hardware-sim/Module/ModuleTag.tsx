import {
  RobotCoordsForeignDiv,
  C_MED_LIGHT_GRAY,
  SPACING_1,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
} from '../../'

import type { ReactNode } from 'react'

export interface ModuleTagProps {
  x: number
  y: number
  height: number
  width: number
  children: ReactNode
}

export const ModuleTag = (props: ModuleTagProps): JSX.Element => {
  const { x, y, height, width, children } = props

  return (
    <RobotCoordsForeignDiv
      x={x}
      y={y}
      height={height}
      width={width}
      innerDivProps={{
        display: 'flex',
        justifyContent: JUSTIFY_CENTER,
        alignItems: ALIGN_CENTER,
        backgroundColor: C_MED_LIGHT_GRAY,
        padding: SPACING_1,
      }}
    >
      {children}
    </RobotCoordsForeignDiv>
  )
}
