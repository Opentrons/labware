import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { TYPOGRAPHY, SPACING, BORDERS, COLORS } from '@opentrons/components'
import { createSnippet } from './createSnippet'
import type { LegacyLabwareOffsetCreateData } from '@opentrons/api-client'
import type {
  LoadedLabware,
  LoadedModule,
  RunTimeCommand,
} from '@opentrons/shared-data'

const JsonTextArea = styled.textarea`
  min-height: 28vh;
  width: 100%;
  background-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  margin: ${SPACING.spacing16} 0;
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  font-family: monospace;
  resize: none;
`
interface PythonLabwareOffsetSnippetProps {
  mode: 'jupyter' | 'cli'
  commands: RunTimeCommand[]
  labware: LoadedLabware[]
  modules: LoadedModule[]
  labwareOffsets: LegacyLabwareOffsetCreateData[] | null
}

export function PythonLabwareOffsetSnippet(
  props: PythonLabwareOffsetSnippetProps
): JSX.Element | null {
  const { commands, labware, modules, labwareOffsets, mode } = props
  const [snippet, setSnippet] = useState<string | null>(null)
  useEffect(() => {
    if (labware.length > 0 && labwareOffsets != null) {
      setSnippet(
        createSnippet(mode, commands, labware, modules, labwareOffsets)
      )
    }
  }, [mode, JSON.stringify(labwareOffsets)])

  return <JsonTextArea readOnly value={snippet ?? ''} spellCheck={false} />
}
