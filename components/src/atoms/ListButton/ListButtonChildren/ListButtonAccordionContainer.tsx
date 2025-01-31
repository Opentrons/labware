import { Flex } from '../../../primitives'
import { DIRECTION_COLUMN } from '../../../styles'

import type { ReactNode } from 'react'

interface ListButtonAccordionContainerProps {
  children: ReactNode
  id: string
}
/*
    To be used with ListButtonAccordion to stop propagation since multiple
    layers have a CTA
**/
export function ListButtonAccordionContainer(
  props: ListButtonAccordionContainerProps
): JSX.Element {
  const { id, children } = props

  return (
    <Flex key={id} flexDirection={DIRECTION_COLUMN} width="100%">
      {children}
    </Flex>
  )
}
