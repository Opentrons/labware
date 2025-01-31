import { useState } from 'react'
import {
  ALIGN_CENTER,
  Box,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  Link,
  TYPOGRAPHY,
} from '@opentrons/components'
import { Divider } from '/app/atoms/structure'

import type { ReactNode } from 'react'

interface ExpandingTitleProps {
  label: ReactNode
  diagram?: ReactNode
}

export function ExpandingTitle(props: ExpandingTitleProps): JSX.Element {
  const [diagramVisible, setDiagramVisible] = useState<boolean>(false)
  const toggleDiagramVisible = (): void => {
    setDiagramVisible(currentDiagramVisible => !currentDiagramVisible)
  }
  const { label, diagram } = props

  return (
    <>
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
      >
        <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {label}
        </LegacyStyledText>
        {diagram != null && (
          <Link role="button" onClick={toggleDiagramVisible}>
            <Icon
              name={diagramVisible ? 'chevron-up' : 'chevron-down'}
              size="1rem"
            />
          </Link>
        )}
      </Flex>
      {diagramVisible && (
        <Box data-testid="expanding_title_diagram">{diagram}</Box>
      )}
      <Divider />
    </>
  )
}
