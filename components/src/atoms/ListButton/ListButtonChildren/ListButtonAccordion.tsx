import { Flex } from '../../../primitives'
import { DIRECTION_COLUMN } from '../../../styles'
import { SPACING } from '../../../ui-style-constants'
import { StyledText } from '../../StyledText'

import type { ReactNode } from 'react'

interface ListButtonAccordionProps {
  children: ReactNode
  // determines if the accordion is expanded or not
  isExpanded?: boolean
  // is it nested into another accordion?
  isNested?: boolean
  // optional main headline for the top level accordion
  mainHeadline?: string
  headline?: string
}

/*
    To be used with ListButton, ListButtonAccordion and ListButtonRadioButton
    This is the accordion component to use both as just an accordion or nested accordion
**/
export function ListButtonAccordion(
  props: ListButtonAccordionProps
): JSX.Element {
  const {
    headline,
    children,
    mainHeadline,
    isExpanded = false,
    isNested = false,
  } = props

  return (
    <Flex flexDirection={DIRECTION_COLUMN} width="100%">
      {mainHeadline != null ? (
        <Flex
          marginBottom={
            isExpanded && headline != null ? SPACING.spacing40 : '0'
          }
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {mainHeadline}
          </StyledText>
        </Flex>
      ) : null}
      {isExpanded ? (
        <Flex
          marginTop={isNested ? SPACING.spacing4 : '0'}
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing4}
          marginLeft={isNested ? SPACING.spacing40 : '0'}
        >
          {headline != null ? (
            <Flex marginBottom={SPACING.spacing4}>
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {headline}
              </StyledText>
            </Flex>
          ) : null}
          <Flex flexDirection={DIRECTION_COLUMN}>{children}</Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}
