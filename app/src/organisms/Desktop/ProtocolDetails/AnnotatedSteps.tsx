import { useMemo, useState } from 'react'
import { css } from 'styled-components'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  OVERFLOW_AUTO,
  Icon,
  ALIGN_FLEX_START,
  CURSOR_POINTER,
} from '@opentrons/components'

import { CommandIcon, CommandText } from '/app/molecules/Command'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
  RunTimeCommand,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { GroupedCommands, LeafNode } from '/app/redux/protocol-storage'

interface AnnotatedStepsProps {
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
  groupedCommands: GroupedCommands | null
  currentCommandIndex?: number
}

export function AnnotatedSteps(props: AnnotatedStepsProps): JSX.Element {
  const { analysis, currentCommandIndex, groupedCommands } = props
  const HIDE_SCROLLBAR = css`
    ::-webkit-scrollbar {
      display: none;
    }
  `
  const isValidRobotSideAnalysis = analysis != null
  const allRunDefs = useMemo(
    () =>
      analysis != null
        ? getLabwareDefinitionsFromCommands(analysis.commands)
        : [],
    [isValidRobotSideAnalysis]
  )
  const annotations = analysis?.commandAnnotations ?? []

  //  NOTE: isHighlighted is meant to show when running on the protocol in the run log
  //  but isn't in use during protocol details. Therefore, this info is not in use and is
  //  merely a proof-of-concept for when we do add this to the run log.
  const groupedCommandsHighlightedInfo = groupedCommands?.map(node => {
    if ('annotationIndex' in node) {
      return {
        ...node,
        isHighlighted: node.subCommands.some(subNode => subNode.isHighlighted),
        subCommands: node.subCommands.map(subNode => ({
          ...subNode,
          isHighlighted:
            currentCommandIndex === analysis.commands.indexOf(subNode.command),
        })),
      }
    } else {
      return {
        ...node,
        isHighlighted:
          currentCommandIndex === analysis.commands.indexOf(node.command),
      }
    }
  })

  return (
    <Flex
      css={HIDE_SCROLLBAR}
      flexDirection={DIRECTION_COLUMN}
      maxHeight="82vh"
      flex="1 1 0"
      overflowY={OVERFLOW_AUTO}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        marginY={SPACING.spacing16}
        gridGap={SPACING.spacing4}
      >
        {groupedCommandsHighlightedInfo != null &&
        groupedCommandsHighlightedInfo.length > 0
          ? groupedCommandsHighlightedInfo.map((c, i) =>
              'annotationIndex' in c ? (
                <AnnotatedGroup
                  key={`group-${i}`}
                  stepNumber={(i + 1).toString()}
                  analysis={analysis}
                  annotationType={
                    annotations[c.annotationIndex]?.machineReadableName
                  }
                  isHighlighted={c.isHighlighted}
                  subCommands={c.subCommands}
                  allRunDefs={allRunDefs}
                />
              ) : (
                <IndividualCommand
                  key={c.command.id}
                  stepNumber={(i + 1).toString()}
                  command={c.command}
                  isHighlighted={c.isHighlighted}
                  analysis={analysis}
                  allRunDefs={allRunDefs}
                />
              )
            )
          : analysis.commands.map((c, i) => (
              <IndividualCommand
                key={i}
                stepNumber={(i + 1).toString()}
                command={c}
                isHighlighted={i === currentCommandIndex}
                analysis={analysis}
                allRunDefs={allRunDefs}
              />
            ))}
      </Flex>
    </Flex>
  )
}

interface AnnotatedGroupProps {
  annotationType: string
  subCommands: LeafNode[]
  analysis: ProtocolAnalysisOutput | CompletedProtocolAnalysis
  stepNumber: string
  isHighlighted: boolean
  allRunDefs: LabwareDefinition2[]
}
function AnnotatedGroup(props: AnnotatedGroupProps): JSX.Element {
  const {
    subCommands,
    annotationType,
    analysis,
    stepNumber,
    allRunDefs,
    isHighlighted,
  } = props
  const [isExpanded, setIsExpanded] = useState(false)
  const backgroundColor = isHighlighted ? COLORS.blue30 : COLORS.grey20
  return (
    <Flex
      onClick={() => {
        setIsExpanded(!isExpanded)
      }}
      cursor={CURSOR_POINTER}
    >
      {isExpanded ? (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Flex
            alignItems={ALIGN_CENTER}
            alignSelf={ALIGN_FLEX_START}
            gridGap={SPACING.spacing8}
          >
            <LegacyStyledText
              minWidth={SPACING.spacing16}
              fontSize={TYPOGRAPHY.fontSizeCaption}
            >
              {stepNumber}
            </LegacyStyledText>
            <Flex
              alignItems={ALIGN_CENTER}
              backgroundColor={backgroundColor}
              color={COLORS.black90}
              borderRadius={BORDERS.borderRadius4}
              padding={`${SPACING.spacing8} ${SPACING.spacing8} ${SPACING.spacing8} ${SPACING.spacing16}`}
            >
              <LegacyStyledText
                as="h3"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              >
                {annotationType}
              </LegacyStyledText>
              <Icon name="chevron-up" size="2rem" />
            </Flex>
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            paddingY={SPACING.spacing16}
            paddingX={SPACING.spacing32}
            gridGap={SPACING.spacing4}
          >
            {subCommands.map((c, i) => (
              <IndividualCommand
                key={c.command.id}
                command={c.command}
                analysis={analysis}
                isHighlighted={c.isHighlighted}
                stepNumber={`${stepNumber}.${(i + 1).toString()}`}
                allRunDefs={allRunDefs}
              />
            ))}
          </Flex>
        </Flex>
      ) : (
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          <LegacyStyledText as="label">{stepNumber}</LegacyStyledText>
          <Flex
            alignItems={ALIGN_CENTER}
            backgroundColor={backgroundColor}
            borderRadius={BORDERS.borderRadius4}
            padding={SPACING.spacing8}
          >
            <LegacyStyledText
              as="h3"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginLeft={SPACING.spacing8}
            >
              {annotationType}
            </LegacyStyledText>
            <Icon name="chevron-down" size="2rem" color={COLORS.black90} />
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

interface IndividualCommandProps {
  command: RunTimeCommand
  analysis: ProtocolAnalysisOutput | CompletedProtocolAnalysis
  stepNumber: string
  isHighlighted: boolean
  allRunDefs: LabwareDefinition2[]
}
function IndividualCommand({
  command,
  analysis,
  stepNumber,
  isHighlighted,
  allRunDefs,
}: IndividualCommandProps): JSX.Element {
  const backgroundColor = isHighlighted ? COLORS.blue30 : COLORS.grey20
  const iconColor = isHighlighted ? COLORS.blue60 : COLORS.grey50
  return (
    <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
      <LegacyStyledText
        minWidth={SPACING.spacing16}
        fontSize={TYPOGRAPHY.fontSizeCaption}
      >
        {stepNumber}
      </LegacyStyledText>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="100%"
        backgroundColor={backgroundColor}
        color={COLORS.black90}
        borderRadius={BORDERS.borderRadius4}
        padding={SPACING.spacing8}
        css={css`
          transition: background-color 500ms ease-out,
            border-color 500ms ease-out;
        `}
      >
        <Flex
          key={command.id}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing8}
        >
          <CommandIcon command={command} color={iconColor} />
          <CommandText
            command={command}
            robotType={analysis?.robotType ?? FLEX_ROBOT_TYPE}
            color={COLORS.black90}
            commandTextData={analysis}
            allRunDefs={allRunDefs}
          />
        </Flex>
      </Flex>
    </Flex>
  )
}
