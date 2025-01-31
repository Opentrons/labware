import { memo } from 'react'
import map from 'lodash/map'
import { Well } from './Well'
import { COLORS } from '../../../helix-design-system'

import type { MemoExoticComponent, ReactNode } from 'react'
import type { CSSProperties } from 'styled-components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface StrokedWellProps {
  definition: LabwareDefinition2
  strokeByWell: Record<string, CSSProperties['stroke']>
}

export function StrokedWellsComponent(props: StrokedWellProps): JSX.Element {
  const { definition, strokeByWell } = props
  return (
    <>
      {map<Record<string, CSSProperties['stroke']>, ReactNode>(
        strokeByWell,
        (color: CSSProperties['stroke'], wellName: string): JSX.Element => {
          return (
            <Well
              key={wellName}
              wellName={wellName}
              well={definition.wells[wellName]}
              stroke={color}
              fill={COLORS.white}
              strokeWidth="0.6"
            />
          )
        }
      )}
    </>
  )
}

export const StrokedWells: MemoExoticComponent<
  typeof StrokedWellsComponent
> = memo(StrokedWellsComponent)
