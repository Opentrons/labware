import { Link } from '@opentrons/components'
import type { ReactNode } from 'react'

interface KnowledgeLinkProps {
  children: ReactNode
}

export const DOC_URL =
  'https://insights.opentrons.com/hubfs/Protocol%20Designer%20Instruction%20Manual.pdf'

export function KnowledgeLink(props: KnowledgeLinkProps): JSX.Element {
  const { children } = props
  return (
    <Link external href={DOC_URL}>
      {children}
    </Link>
  )
}
