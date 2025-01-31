import { pick } from 'lodash'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
  StyledText,
  RESPONSIVENESS,
} from '@opentrons/components'

import { useCommandTextString } from '/app/local-resources/commands'

import type { ComponentProps } from 'react'
import type {
  LabwareDefinition2,
  RobotType,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { StyleProps } from '@opentrons/components'
import type {
  GetTCRunExtendedProfileCommandTextResult,
  GetTCRunProfileCommandTextResult,
  CommandTextData,
} from '/app/local-resources/commands'

interface LegacySTProps {
  as?: ComponentProps<typeof LegacyStyledText>['as']
  modernStyledTextDefaults?: false
}

interface ModernSTProps {
  desktopStyle?: ComponentProps<typeof StyledText>['desktopStyle']
  oddStyle?: ComponentProps<typeof StyledText>['oddStyle']
  modernStyledTextDefaults: true
}

type STProps = LegacySTProps | ModernSTProps

interface BaseProps extends StyleProps {
  command: RunTimeCommand
  allRunDefs: LabwareDefinition2[]
  commandTextData: CommandTextData
  robotType: RobotType
  isOnDevice?: boolean
  propagateCenter?: boolean
  propagateTextLimit?: boolean
}
export function CommandText(props: BaseProps & STProps): JSX.Element | null {
  const commandText = useCommandTextString({
    ...props,
  })

  switch (commandText.kind) {
    case 'thermocycler/runProfile': {
      return (
        <ThermocyclerRunProfile
          {...props}
          commandText={commandText.commandText}
          stepTexts={commandText.stepTexts}
        />
      )
    }
    case 'thermocycler/runExtendedProfile': {
      return (
        <ThermocyclerRunExtendedProfile
          {...props}
          commandText={commandText.commandText}
          profileElementTexts={commandText.profileElementTexts}
        />
      )
    }
    default: {
      return (
        <CommandStyledText {...props}>
          {commandText.commandText}
        </CommandStyledText>
      )
    }
  }
}

const forwardSTProps = (props: STProps): STProps =>
  pick(props, ['as', 'oddStyle', 'desktopStyle', 'modernStyledTextDefaults'])

const isModernSTProps = (props: STProps): props is ModernSTProps =>
  props.hasOwnProperty('desktopStyle') ||
  props.hasOwnProperty('oddStyle') ||
  !!props.modernStyledTextDefaults

function CommandStyledText(
  props: STProps & {
    children: JSX.Element[] | JSX.Element | string
  } & StyleProps
): JSX.Element {
  if (isModernSTProps(props)) {
    return (
      <StyledText
        desktopStyle={props.desktopStyle ?? 'bodyDefaultRegular'}
        oddStyle={props.oddStyle ?? 'bodyTextRegular'}
        {...props}
      >
        {props.children}
      </StyledText>
    )
  } else {
    return (
      <LegacyStyledText as={props.as ?? 'p'} {...props}>
        {props.children}
      </LegacyStyledText>
    )
  }
}

const shouldPropagateCenter = (
  propagateCenter: boolean,
  isOnDevice?: boolean
): boolean => isOnDevice === true || propagateCenter
const shouldPropagateTextLimit = (
  propagateTextLimit: boolean,
  isOnDevice?: boolean
): boolean => isOnDevice === true || propagateTextLimit

type ThermocyclerRunProfileProps = BaseProps &
  STProps &
  Omit<GetTCRunProfileCommandTextResult, 'kind'>

function ThermocyclerRunProfile(
  props: ThermocyclerRunProfileProps
): JSX.Element {
  const {
    isOnDevice,
    propagateCenter = false,
    propagateTextLimit = false,
    commandText,
    stepTexts,
    ...styleProps
  } = props

  // TODO(sfoster): Command sometimes wraps this in a cascaded display: -webkit-box
  // to achieve multiline text clipping with an automatically inserted ellipsis, which works
  // everywhere except for here where it overrides this property in the flex since this is
  // the only place where CommandText uses a flex.
  // The right way to handle this is probably to take the css that's in Command and make it
  // live here instead, but that should be done in a followup since it would touch everything.
  // See also the margin-left on the <li>s, which is needed to prevent their bullets from
  // clipping if a container set overflow: hidden.
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      {...styleProps}
      alignItems={
        shouldPropagateCenter(propagateCenter, isOnDevice)
          ? ALIGN_CENTER
          : undefined
      }
      css={`
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          display: flex !important;
        } ;
      `}
    >
      <CommandStyledText
        {...forwardSTProps(props)}
        marginBottom={SPACING.spacing4}
        {...styleProps}
      >
        {commandText}
      </CommandStyledText>
      <CommandStyledText
        {...forwardSTProps(props)}
        marginLeft={SPACING.spacing16}
      >
        <ul>
          {shouldPropagateTextLimit(propagateTextLimit, isOnDevice) ? (
            <li css={LIST_STYLE}>{stepTexts[0]}</li>
          ) : (
            stepTexts.map((step: string, index: number) => (
              <li css={LIST_STYLE} key={index}>
                {' '}
                {step}
              </li>
            ))
          )}
        </ul>
      </CommandStyledText>
    </Flex>
  )
}

type ThermocyclerRunExtendedProfileProps = BaseProps &
  STProps &
  Omit<GetTCRunExtendedProfileCommandTextResult, 'kind'>

function ThermocyclerRunExtendedProfile(
  props: ThermocyclerRunExtendedProfileProps
): JSX.Element {
  const {
    isOnDevice,
    propagateCenter = false,
    propagateTextLimit = false,
    commandText,
    profileElementTexts,
    ...styleProps
  } = props

  // TODO(sfoster): Command sometimes wraps this in a cascaded display: -webkit-box
  // to achieve multiline text clipping with an automatically inserted ellipsis, which works
  // everywhere except for here where it overrides this property in the flex since this is
  // the only place where CommandText uses a flex.
  // The right way to handle this is probably to take the css that's in Command and make it
  // live here instead, but that should be done in a followup since it would touch everything.
  // See also the margin-left on the <li>s, which is needed to prevent their bullets from
  // clipping if a container set overflow: hidden.
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      {...styleProps}
      alignItems={
        shouldPropagateCenter(propagateCenter, isOnDevice)
          ? ALIGN_CENTER
          : undefined
      }
      css={`
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          display: flex !important;
        } ;
      `}
    >
      <CommandStyledText
        {...forwardSTProps(props)}
        marginBottom={SPACING.spacing4}
        {...styleProps}
      >
        {commandText}
      </CommandStyledText>
      <CommandStyledText
        {...forwardSTProps(props)}
        marginLeft={SPACING.spacing16}
      >
        <ul>
          {shouldPropagateTextLimit(propagateTextLimit, isOnDevice) ? (
            <li css={LIST_STYLE}>
              {profileElementTexts[0].kind === 'step'
                ? profileElementTexts[0].stepText
                : profileElementTexts[0].cycleText}
            </li>
          ) : (
            profileElementTexts.map((element, index: number) =>
              element.kind === 'step' ? (
                <li css={LIST_STYLE} key={`tc-outer-step-${index}`}>
                  {' '}
                  {element.stepText}
                </li>
              ) : (
                <li css={LIST_STYLE} key={`tc-outer-step-${index}`}>
                  {element.cycleText}
                  <ul>
                    {element.stepTexts.map(
                      ({ stepText }, stepIndex: number) => (
                        <li
                          css={LIST_STYLE}
                          key={`tc-inner-step-${index}.${stepIndex}`}
                        >
                          {' '}
                          {stepText}
                        </li>
                      )
                    )}
                  </ul>
                </li>
              )
            )
          )}
        </ul>
      </CommandStyledText>
    </Flex>
  )
}

const LIST_STYLE = css`
  margin-left: ${SPACING.spacing4};
`
