import type { DeckDefinition } from '@opentrons/shared-data'
import parseHtml from 'html-react-parser'
import * as React from 'react'
import { stringify } from 'svgson'

export interface DeckFromDataProps {
  def: DeckDefinition
  layerBlocklist: string[]
}

export function DeckFromData(props: DeckFromDataProps): JSX.Element {
  const { def, layerBlocklist = [] } = props

  const layerGroupNodes = def.layers.filter(
    g => !layerBlocklist.includes(g.attributes?.id)
  )

  const groupNodeWrapper = {
    name: 'g',
    type: 'element',
    value: '',
    attributes: { id: 'deckLayers' },
    children: layerGroupNodes,
  }

  return (
    <g>
      {parseHtml(
        stringify(groupNodeWrapper, {
          selfClose: false,
        })
      )}
    </g>
  )
}
