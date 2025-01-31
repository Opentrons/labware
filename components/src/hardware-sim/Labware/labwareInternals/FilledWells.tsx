import { memo } from 'react'
import map from 'lodash/map'
import { COLORS } from '../../../helix-design-system'
import { Well } from './Well'

import type { MemoExoticComponent, ReactNode } from 'react'
import type { CSSProperties } from 'styled-components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface FilledWellsProps {
  definition: LabwareDefinition2
  fillByWell: Record<string, CSSProperties['fill']>
  strokeColor?: string
}

function FilledWellsComponent(props: FilledWellsProps): JSX.Element {
  const { definition, fillByWell, strokeColor = COLORS.black90 } = props
  return (
    <>
      {map<Record<string, CSSProperties['fill']>, ReactNode>(
        fillByWell,
        (color: CSSProperties['fill'], wellName: string): JSX.Element => {
          return (
            <Well
              key={wellName}
              wellName={wellName}
              well={definition.wells[wellName]}
              fill={color}
              stroke={strokeColor}
              strokeWidth="0.6"
            />
          )
        }
      )}
    </>
  )
}

export const FilledWells: MemoExoticComponent<
  typeof FilledWellsComponent
> = memo(FilledWellsComponent)
